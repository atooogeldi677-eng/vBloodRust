'use strict';
// Veri katmanı: DATABASE_URL varsa PostgreSQL, yoksa yerel dosya (data/store.json).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const clone = o => (o === undefined || o === null ? null : JSON.parse(JSON.stringify(o)));

class FileStore {
  constructor(dir) { this.dir = dir; this.file = path.join(dir, 'store.json'); this.kind = 'Dosya (data/store.json)'; this.sessions = new Map(); }
  async init() {
    fs.mkdirSync(this.dir, { recursive: true });
    this.d = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : { docs: {}, history: [], orders: [] };
    for (const [k, f] of [['site', 'site.json'], ['auth', 'auth.json']]) { // eski sürümden içe aktar
      const p = path.join(this.dir, f);
      if (!this.d.docs[k] && fs.existsSync(p)) this.d.docs[k] = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    this._save(); this.backupsDir = path.join(this.dir, 'backups'); this._backup(); setInterval(() => this._backup(), 6 * 3600e3).unref();
  }
  _backup() { // saatte en fazla 1 yedek, son 14 tanesi saklanır
    try {
      fs.mkdirSync(this.backupsDir, { recursive: true }); const list = fs.readdirSync(this.backupsDir).filter(f => f.startsWith('store-')).sort(), last = list[list.length - 1];
      if (last && Date.now() - fs.statSync(path.join(this.backupsDir, last)).mtimeMs < 3600e3) return;
      fs.copyFileSync(this.file, path.join(this.backupsDir, 'store-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json'));
      list.concat([]).slice(0, Math.max(0, list.length + 1 - 14)).forEach(f => fs.unlinkSync(path.join(this.backupsDir, f)));
    } catch (e) { console.error('Yedek alınamadı:', e.message); }
  }
  _save() { const t = this.file + '.tmp'; fs.writeFileSync(t, JSON.stringify(this.d)); fs.renameSync(t, this.file); }
  async getDoc(k) { return clone(this.d.docs[k]); }
  async setDoc(k, v, history) {
    if (history && this.d.docs[k]) {
      this.d.history.push({ id: String(Date.now()) + Math.floor(Math.random() * 1000), key: k, value: this.d.docs[k], created: new Date().toISOString() });
      const mine = this.d.history.filter(h => h.key === k); if (mine.length > 30) this.d.history = this.d.history.filter(h => h.key !== k || mine.slice(-30).includes(h));
    }
    this.d.docs[k] = clone(v); this._save();
  }
  async listHistory(k) { return this.d.history.filter(h => h.key === k).map(h => ({ id: h.id, created: h.created })).reverse(); }
  async getHistory(id) { return clone(this.d.history.find(h => h.id === id)?.value); }
  async createOrder(o) { this.d.orders.push(clone(o)); this._save(); }
  async getOrder(id) { return clone(this.d.orders.find(o => o.id === id)); }
  async updateOrder(id, patch) { const o = this.d.orders.find(x => x.id === id); if (!o) return null; Object.assign(o, patch, { updatedAt: new Date().toISOString() }); this._save(); return clone(o); }
  async listOrders({ status, limit = 500 } = {}) { return clone(this.d.orders.filter(o => !status || o.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)) || []; }
  async createSession(sid, exp) { this.sessions.set(sha(sid), exp); }
  async getSession(sid) { const e = this.sessions.get(sha(sid)); return e && e > Date.now() ? e : null; }
  async delSession(sid) { this.sessions.delete(sha(sid)); }
  async clearSessions(keep) { const k = keep && sha(keep); for (const id of this.sessions.keys()) if (id !== k) this.sessions.delete(id); }
}

class PgStore {
  constructor(url) {
    let Pool; try { ({ Pool } = require('pg')); } catch (_) { throw new Error('DATABASE_URL verilmiş ama "pg" paketi kurulu değil. Önce şunu çalıştır: npm install'); }
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    this.pool = new Pool({ connectionString: url, ssl: process.env.PGSSL === 'disable' || local ? false : { rejectUnauthorized: false }, max: 5 });
    this.kind = 'PostgreSQL';
  }
  q(t, p) { return this.pool.query(t, p); }
  async init() {
    await this.q('create table if not exists docs (key text primary key, value jsonb not null, updated_at timestamptz not null default now())');
    await this.q('create table if not exists doc_history (id bigserial primary key, key text not null, value jsonb not null, created_at timestamptz not null default now())');
    await this.q(`create table if not exists orders (
      id text primary key, status text not null, product_id text, product_name text, amount numeric(12,2) not null, currency text,
      steam_id text, email text, method text, provider_ref text, ip text, data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now())`);
    await this.q('create index if not exists orders_created_idx on orders (created_at desc)');
    await this.q('create table if not exists sessions (id text primary key, expires_at timestamptz not null)');
  }
  async getDoc(k) { const r = await this.q('select value from docs where key = $1', [k]); return r.rows[0] ? r.rows[0].value : null; }
  async setDoc(k, v, history) {
    if (history) {
      await this.q('insert into doc_history (key, value) select key, value from docs where key = $1', [k]);
      await this.q('delete from doc_history where key = $1 and id not in (select id from doc_history where key = $1 order by id desc limit 30)', [k]);
    }
    await this.q('insert into docs (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()', [k, JSON.stringify(v)]);
  }
  async listHistory(k) { const r = await this.q('select id, created_at from doc_history where key = $1 order by id desc', [k]); return r.rows.map(x => ({ id: String(x.id), created: new Date(x.created_at).toISOString() })); }
  async getHistory(id) { const r = await this.q('select value from doc_history where id = $1', [id]); return r.rows[0] ? r.rows[0].value : null; }
  _row(r) {
    const d = r.data || {};
    return { id: r.id, status: r.status, productId: r.product_id, productName: r.product_name, amount: Number(r.amount), currency: r.currency, steamId: r.steam_id, email: r.email, method: r.method,
      providerRef: r.provider_ref, ip: r.ip, createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(), token: d.token, phone: d.phone, paidAt: d.paidAt, deliveredAt: d.deliveredAt, note: d.note };
  }
  async createOrder(o) {
    await this.q('insert into orders (id, status, product_id, product_name, amount, currency, steam_id, email, method, provider_ref, ip, data, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)',
      [o.id, o.status, o.productId, o.productName, o.amount, o.currency, o.steamId, o.email, o.method, o.providerRef || null, o.ip, JSON.stringify({ token: o.token, phone: o.phone }), o.createdAt]);
  }
  async getOrder(id) { const r = await this.q('select * from orders where id = $1', [id]); return r.rows[0] ? this._row(r.rows[0]) : null; }
  async updateOrder(id, patch) {
    const o = await this.getOrder(id); if (!o) return null; Object.assign(o, patch);
    await this.q('update orders set status = $2, provider_ref = $3, data = $4::jsonb, updated_at = now() where id = $1',
      [id, o.status, o.providerRef || null, JSON.stringify({ token: o.token, phone: o.phone, paidAt: o.paidAt, deliveredAt: o.deliveredAt, note: o.note })]);
    return this.getOrder(id);
  }
  async listOrders({ status, limit = 500 } = {}) {
    const r = status ? await this.q('select * from orders where status = $1 order by created_at desc limit $2', [status, limit]) : await this.q('select * from orders order by created_at desc limit $1', [limit]);
    return r.rows.map(x => this._row(x));
  }
  async createSession(sid, exp) { await this.q('insert into sessions (id, expires_at) values ($1, to_timestamp($2 / 1000.0))', [sha(sid), exp]); await this.q('delete from sessions where expires_at < now()'); }
  async getSession(sid) { const r = await this.q('select (extract(epoch from expires_at) * 1000)::bigint as e from sessions where id = $1 and expires_at > now()', [sha(sid)]); return r.rows[0] ? Number(r.rows[0].e) : null; }
  async delSession(sid) { await this.q('delete from sessions where id = $1', [sha(sid)]); }
  async clearSessions(keep) { await this.q('delete from sessions where id <> $1', [keep ? sha(keep) : '']); }
}

module.exports = async function openStore(dataDir) {
  const url = process.env.DATABASE_URL;
  const s = url ? new PgStore(url) : new FileStore(dataDir);
  await s.init(); return s;
};
