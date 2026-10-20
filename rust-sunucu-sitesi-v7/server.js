'use strict';
// Rust sunucu sitesi: site + yönetim paneli + ödeme + veritabanı. Node 18+.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), dgram = require('dgram'), dns = require('dns').promises;
const openStore = require('./db'), pay = require('./pay'), rcon = require('./rcon');
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m && !m[1].startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2'); } } catch (_) {}
const PORT = +process.env.PORT || 3000, ROOT = __dirname;
const PUB = path.join(ROOT, 'public'), ADM = path.join(ROOT, 'admin'), DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
let store, auth;

/* ---------- yardımcılar ---------- */
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') });
const checkPw = (pw, a) => { const h = crypto.scryptSync(pw, a.salt, 64), b = Buffer.from(a.hash, 'hex'); return h.length === b.length && crypto.timingSafeEqual(h, b); };
class HttpError extends Error { constructor(msg, status = 400, extra = {}) { super(msg); this.status = status; this.extra = extra; } }
const safeEq = (a, b) => { a = Buffer.from(String(a ?? '')); b = Buffer.from(String(b ?? '')); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const ea = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(a => a[0]));
const clientIp = req => String((process.env.TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '').replace(/^::ffff:/, '');
const isHttps = req => !!req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
const baseUrl = req => (process.env.PUBLIC_URL || '').replace(/\/$/, '') || `${process.env.TRUST_PROXY && req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'] : isHttps(req) ? 'https' : 'http'}://${(process.env.TRUST_PROXY && req.headers['x-forwarded-host']) || req.headers.host}`;
const raw = (req, lim = 1e6) => new Promise((ok, no) => {
  let d = '', n = 0; req.on('data', c => { n += c.length; if (n > lim) { no(new Error('big')); req.destroy(); } else d += c; }); req.on('end', () => ok(d)); req.on('error', no);
});
const body = async (req, lim) => { const r = await raw(req, lim); return r ? JSON.parse(r) : {}; };
const hits = new Map();
const limited = (key, max, ms) => { const now = Date.now(), a = (hits.get(key) || []).filter(t => now - t < ms); a.push(now); hits.set(key, a); return a.length > max; };
setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some(t => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

const CSP = "default-src 'self'; img-src * data:; media-src * data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-src https://www.paytr.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://www.paytr.com";
function secHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.setHeader('Content-Security-Policy', CSP);
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

/* ---------- site verisi ---------- */
const defaults = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'default-site.json'), 'utf8'));
function migrate(site) {
  const fill = (t, s) => { for (const k of Object.keys(s)) { if (t[k] === undefined) t[k] = JSON.parse(JSON.stringify(s[k])); else if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') fill(t[k], s[k]); } };
  fill(site, defaults());
  const seen = new Set();
  site.vip.forEach(p => {
    if (!p.id || seen.has(p.id)) p.id = 'p' + crypto.randomBytes(4).toString('hex'); seen.add(p.id);
    if (typeof p.amount !== 'number' || isNaN(p.amount)) { const n = parseFloat(String(p.price || '').replace(/[^\d.,]/g, '').replace(',', '.')); p.amount = isNaN(n) ? 0 : n; }
  });
  return site;
}
let siteCache = null;
async function getSite() {
  if (siteCache && Date.now() - siteCache.ts < 5000) return JSON.parse(siteCache.v);
  let doc = await store.getDoc('site');
  if (!doc) { doc = defaults(); await store.setDoc('site', doc); }
  const before = JSON.stringify(doc); migrate(doc);
  if (JSON.stringify(doc) !== before) await store.setDoc('site', doc);
  siteCache = { ts: Date.now(), v: JSON.stringify(doc) }; return doc;
}
async function saveSite(d) {
  migrate(d); const cur = await store.getDoc('site'); d._rev = ((cur && cur._rev) || 0) + 1; d._savedAt = new Date().toISOString();
  await store.setDoc('site', d, true); siteCache = null; return d._rev;
}

/* ---------- gizli anahtarlar (ödeme) ---------- */
async function secrets() {
  const d = (await store.getDoc('secrets')) || {}, e = process.env, p = d.paytr || {}, s = d.stripe || {};
  return {
    paytr: { merchantId: e.PAYTR_MERCHANT_ID || p.merchantId || '', merchantKey: e.PAYTR_MERCHANT_KEY || p.merchantKey || '', merchantSalt: e.PAYTR_MERCHANT_SALT || p.merchantSalt || '', testMode: e.PAYTR_TEST_MODE !== undefined ? e.PAYTR_TEST_MODE === '1' : !!p.testMode },
    stripe: { secretKey: e.STRIPE_SECRET_KEY || s.secretKey || '', webhookSecret: e.STRIPE_WEBHOOK_SECRET || s.webhookSecret || '', currency: s.currency || 'try' },
    discord: { clientId: e.DISCORD_CLIENT_ID || (d.discord || {}).clientId || '', clientSecret: e.DISCORD_CLIENT_SECRET || (d.discord || {}).clientSecret || '',
      admins: [...String(e.DISCORD_ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean).map(id => ({ id, name: '(ortam değişkeni)', env: true })), ...((d.discord || {}).admins || [])] },
    webhooks: { orders: e.WEBHOOK_ORDERS || (d.webhooks || {}).orders || '', announce: e.WEBHOOK_ANNOUNCE || (d.webhooks || {}).announce || '' },
    rcon: { host: e.RCON_HOST || (d.rcon || {}).host || '', port: +(e.RCON_PORT || (d.rcon || {}).port) || 28016, password: e.RCON_PASSWORD || (d.rcon || {}).password || '', secure: !!(d.rcon || {}).secure }
  };
}
const hint = v => v ? { set: true, hint: '••••' + String(v).slice(-3) } : { set: false };
async function maskedSecrets() {
  const s = await secrets(), e = process.env;
  return { paytr: { merchantId: hint(s.paytr.merchantId), merchantKey: hint(s.paytr.merchantKey), merchantSalt: hint(s.paytr.merchantSalt), testMode: s.paytr.testMode, env: !!e.PAYTR_MERCHANT_ID },
    stripe: { secretKey: hint(s.stripe.secretKey), webhookSecret: hint(s.stripe.webhookSecret), currency: s.stripe.currency, env: !!e.STRIPE_SECRET_KEY },
    rcon: { host: s.rcon.host, port: s.rcon.port, secure: s.rcon.secure, password: hint(s.rcon.password), env: !!e.RCON_PASSWORD },
    discord: { clientId: s.discord.clientId, clientSecret: hint(s.discord.clientSecret), admins: s.discord.admins, configured: !!(s.discord.clientId && s.discord.clientSecret) },
    webhooks: { orders: hint(s.webhooks.orders), announce: hint(s.webhooks.announce) } };
}
const normHook = u => {
  const m = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/(\d+)\/([\w-]+)/i.exec(String(u || '').trim());
  if (m) return `https://discord.com/api/webhooks/${m[1]}/${m[2]}`;
  const lm = /^(http:\/\/127\.0\.0\.1:\d+\/api\/webhooks\/\d+\/[\w-]+)(?:\?[\w=&-]*)?$/.exec(String(u || '').trim());
  return process.env.ALLOW_LOCAL_WEBHOOKS === '1' && lm ? lm[1] : null;
};
const whOk = u => !!normHook(u);
async function saveSecrets(b) {
  const d = (await store.getDoc('secrets')) || {}; d.paytr ??= {}; d.stripe ??= {}; d.rcon ??= {}; d.discord ??= {}; d.webhooks ??= {};
  const put = (t, k, v) => { if (v === null) delete t[k]; else if (typeof v === 'string' && v.trim() && v.length < 300 && !/\s/.test(v.trim())) t[k] = v.trim(); };
  for (const k of ['merchantId', 'merchantKey', 'merchantSalt']) put(d.paytr, k, b.paytr?.[k]);
  if (typeof b.paytr?.testMode === 'boolean') d.paytr.testMode = b.paytr.testMode;
  for (const k of ['secretKey', 'webhookSecret']) put(d.stripe, k, b.stripe?.[k]);
  if (/^[a-zA-Z]{3}$/.test(b.stripe?.currency || '')) d.stripe.currency = b.stripe.currency.toLowerCase();
  if (typeof b.rcon?.host === 'string' && /^[\w.-]{0,253}$/.test(b.rcon.host.trim())) d.rcon.host = b.rcon.host.trim();
  if (+b.rcon?.port >= 1 && +b.rcon?.port <= 65535) d.rcon.port = Math.floor(+b.rcon.port);
  if (typeof b.rcon?.secure === 'boolean') d.rcon.secure = b.rcon.secure;
  put(d.rcon, 'password', b.rcon?.password);
  if (/^\d{5,30}$/.test(String(b.discord?.clientId || '').trim())) d.discord.clientId = String(b.discord.clientId).trim();
  put(d.discord, 'clientSecret', b.discord?.clientSecret);
  for (const k of ['orders', 'announce']) {
    const v = b.webhooks?.[k]; if (v === null) delete d.webhooks[k];
    else if (typeof v === 'string' && v.trim()) { const n = normHook(v); if (!n) throw new HttpError('Geçersiz Discord webhook adresi. Discord’da Webhook → “Webhook URL’sini kopyala” ile alınan, https://discord.com/api/webhooks/… ile başlayan adresin tamamını yapıştır.', 400, { field: 'webhooks.' + k }); d.webhooks[k] = n; }
  }
  await store.setDoc('secrets', d);
}
async function payMethods(site) {
  const s = await secrets(), pm = site.payments?.methods || {}, out = [];
  if (site.payments?.enabled === false) return out;
  if (pm.paytr?.enabled && s.paytr.merchantId && s.paytr.merchantKey && s.paytr.merchantSalt) out.push({ id: 'paytr', title: 'Kredi / Banka Kartı', sub: 'PayTR güvencesiyle' });
  if (pm.stripe?.enabled && s.stripe.secretKey && s.stripe.webhookSecret) out.push({ id: 'stripe', title: 'Kart (Stripe)', sub: 'Uluslararası kartlar' });
  if (pm.manual?.enabled && pm.manual.details) out.push({ id: 'manual', title: pm.manual.title || 'Havale / EFT / Papara', sub: 'Manuel onay' });
  return out;
}

/* ---------- canlı sunucu verisi (A2S / BattleMetrics / Discord) ---------- */
const liveCache = new Map(), lastGood = new Map(), dsc = new Map();
function parseInfo(b) {
  let o = 5; o++;
  const cs = () => { const e = b.indexOf(0, o); if (e < 0) throw new Error('Geçersiz yanıt'); const v = b.toString('utf8', o, e); o = e + 1; return v; };
  const name = cs(), map = cs(); cs(); cs(); o += 2;
  const players = b[o++], max = b[o++]; o += 5;
  let kw = '';
  try { cs(); if (o < b.length) { const edf = b[o++]; if (edf & 0x80) o += 2; if (edf & 0x10) o += 8; if (edf & 0x40) { o += 2; cs(); } if (edf & 0x20) kw = cs(); } } catch (_) {}
  const mp = /(?:^|,)mp(\d+)/.exec(kw), cp = /(?:^|,)cp(\d+)/.exec(kw), qp = /(?:^|,)qp(\d+)/.exec(kw);
  return { name, map, online: cp ? +cp[1] : players, max: mp ? +mp[1] : max, queue: qp ? +qp[1] : 0, status: 'online' };
}
function a2s(host, port, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket('udp4'); let done = false, t;
    const fin = (e, v) => { if (done) return; done = true; clearTimeout(t); try { sock.close(); } catch (_) {} e ? reject(e) : resolve(v); };
    t = setTimeout(() => fin(new Error('Sunucu yanıt vermedi. IP ve sorgu portunu (server.queryport) kontrol et; UDP portu güvenlik duvarında açık olmalı.')), timeout);
    const send = ch => { const q = Buffer.concat([Buffer.from([0xff, 0xff, 0xff, 0xff, 0x54]), Buffer.from('Source Engine Query\0', 'latin1')]); sock.send(ch ? Buffer.concat([q, ch]) : q, port, host, e => e && fin(e)); };
    sock.on('error', fin);
    sock.on('message', msg => { try { if (msg.length < 6 || msg.readInt32LE(0) !== -1) return; if (msg[4] === 0x41) return send(msg.subarray(5, 9)); if (msg[4] === 0x49) fin(null, parseInfo(msg)); } catch (e) { fin(e); } });
    send();
  });
}
function splitAddr(s) { const m = /^([\w.-]+)(?::(\d{1,5}))?$/.exec(String(s || '').trim()); return m ? { host: m[1], port: m[2] ? +m[2] : 28015 } : null; }
async function queryServer(s) {
  const a = splitAddr(s.ip); if (!a) throw new Error('Geçerli bir IP gir (ör. 1.2.3.4:28015)');
  const ports = +s.queryPort ? [+s.queryPort] : [...new Set([a.port, a.port + 1, a.port + 2])].filter(p => p <= 65535);
  if (!ports.every(p => p >= 1)) throw new Error('Sorgu portu geçersiz');
  try { return await Promise.any(ports.map(async p => ({ ...(await a2s(a.host, p)), port: p }))); } catch (e) { throw (e.errors && e.errors[0]) || e; }
}
async function bmQuery(s) {
  const id = String(s.battlemetricsId || '').trim(); if (!/^\d+$/.test(id)) throw new Error('BattleMetrics ID geçersiz');
  const a = (await (await fetch('https://api.battlemetrics.com/servers/' + id, { signal: AbortSignal.timeout(5000) })).json()).data.attributes;
  return { name: a.name, map: a.details?.map, online: a.players, max: a.maxPlayers, status: a.status };
}
const srcOf = s => s.liveSource || (s.battlemetricsId ? 'battlemetrics' : 'manual');
async function liveData(site, force) {
  const s = site.server || {}, src = srcOf(s);
  if (src !== 'query' && src !== 'battlemetrics') return { src: 'manual', data: null };
  const key = JSON.stringify([src, s.ip, s.queryPort, s.battlemetricsId]), c = liveCache.get(key);
  if (!force && c && Date.now() - c.ts < 30000) return c.v;
  let v;
  try { const data = src === 'query' ? await queryServer(s) : await bmQuery(s); lastGood.set(key, { ts: Date.now(), data }); v = { src, data }; }
  catch (e) { const g = lastGood.get(key); v = g && Date.now() - g.ts < 180000 ? { src, data: g.data, err: e.message } : { src, data: { status: 'offline', online: 0 }, err: e.message }; }
  liveCache.set(key, { ts: Date.now(), v }); return v;
}
async function discordStats(link) {
  const m = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([\w-]+)/i.exec(link || ''); if (!m) return null;
  const c = dsc.get(m[1]); if (c && Date.now() - c.ts < 300000) return c.v;
  let v = null;
  try { const j = await (await fetch('https://discord.com/api/v10/invites/' + m[1] + '?with_counts=true', { signal: AbortSignal.timeout(5000) })).json(); if (j.approximate_member_count) v = { members: j.approximate_member_count, online: j.approximate_presence_count || 0 }; } catch (_) {}
  dsc.set(m[1], { ts: Date.now(), v }); return v;
}

/* ---------- statik dosyalar ve ana sayfa ---------- */
async function indexHtml() {
  const site = await getSite(), title = `${site.brand || ''} ${site.heroSubtitle || ''}`.trim(), desc = site.tagline || '';
  let meta = `<meta name="description" content="${ea(desc)}"><meta property="og:type" content="website"><meta property="og:title" content="${ea(title)}"><meta property="og:description" content="${ea(desc)}">`;
  if (/^#[0-9a-f]{6}$/i.test(site.accent || '')) meta += `<meta name="theme-color" content="${site.accent}">`;
  if (/^(https?:\/\/|\/|assets\/)/i.test(site.logoUrl || '')) meta += `<link rel="icon" href="${ea(site.logoUrl)}">`;
  return fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace(/<title>[\s\S]*?<\/title>/, `<title>${ea(title)}</title>`).replace('<!--META-->', meta);
}
const NOCACHE = new Set(['.html', '.js', '.css', '.json']);
function serve(req, res, base, rel) {
  const file = path.join(base, rel);
  if (!file.startsWith(base + path.sep)) { res.writeHead(403); return res.end('403'); }
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('404'); }
    const ext = path.extname(file).toLowerCase(), etag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
    const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes', ETag: etag, 'Last-Modified': st.mtime.toUTCString(), 'Cache-Control': NOCACHE.has(ext) ? 'no-cache' : 'public, max-age=3600' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      const s = m[1] ? +m[1] : st.size - +m[2]; let en = m[1] && m[2] ? +m[2] : st.size - 1; en = Math.min(en, st.size - 1);
      if (s < 0 || s > en) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end(); }
      res.writeHead(206, { ...h, 'Content-Range': `bytes ${s}-${en}/${st.size}`, 'Content-Length': en - s + 1 }); return fs.createReadStream(file, { start: s, end: en }).pipe(res);
    }
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': h['Cache-Control'] }); return res.end(); }
    res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(file).pipe(res);
  });
}

/* ---------- oturum ---------- */
const sessions = { fails: new Map() };
async function startSession(req, res) {
  const sid = crypto.randomBytes(32).toString('hex'); await store.createSession(sid, Date.now() + 12 * 3600e3);
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${isHttps(req) ? '; Secure' : ''}`); return sid;
}
async function ensureAuth() {
  const e = process.env, fp = e.ADMIN_PASSWORD ? crypto.createHash('sha256').update((e.ADMIN_USER || 'admin') + '|' + e.ADMIN_PASSWORD).digest('hex') : null;
  auth = await store.getDoc('auth');
  // .env şifresi değiştirilirse (parmak izi farklıysa) yeniden uygulanır; panelden değiştirilen şifre kalıcıdır.
  if (fp && (!auth || auth.envFp !== fp)) { auth = { user: e.ADMIN_USER || 'admin', ...hashPw(e.ADMIN_PASSWORD), envFp: fp }; await store.setDoc('auth', auth); return; }
  if (!auth) {
    const user = e.ADMIN_USER || 'admin', pw = crypto.randomBytes(9).toString('base64url');
    auth = { user, ...hashPw(pw) }; await store.setDoc('auth', auth);
    console.log('\n=== İLK KURULUM ===\nYönetici kullanıcı: ' + user + '\nŞifre: ' + pw + '\nSabit şifre için .env dosyasına ADMIN_PASSWORD yaz (veya panelden değiştir).\n===================\n');
  }
}
const appSecret = async () => { let d = await store.getDoc('appsecret'); if (!d) { d = { key: crypto.randomBytes(32).toString('hex') }; await store.setDoc('appsecret', d); } return d.key; };
const sign = (key, o) => { const p = Buffer.from(JSON.stringify(o)).toString('base64url'); return p + '.' + crypto.createHmac('sha256', key).update(p).digest('base64url'); };
const unsign = (key, t) => { const [p, g] = String(t || '').split('.'); if (!p || !g || !safeEq(g, crypto.createHmac('sha256', key).update(p).digest('base64url'))) return null; try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp > Date.now() ? o : null; } catch (_) { return null; } };


/* ---------- Discord webhook bildirimleri ---------- */
async function sendHook(url, embed, name) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: String(name || 'Site').slice(0, 80), embeds: [embed] }), signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error('Discord yanıtı: ' + r.status);
}
const HOOK = { orderNew: ['orders', '🛒 Yeni sipariş', 0xfbbf24], orderPaid: ['orders', '💰 Ödeme alındı', 0x22c55e], delivered: ['orders', '📦 Sunucuya teslim edildi', 0x60a5fa], deliverFailed: ['orders', '⚠️ Teslimat başarısız', 0xef4444], announce: ['announce', '📢 Duyuru', 0xe5533a] };
async function notify(kind, o = {}, extra = '') {
  try {
    const site = await getSite(), s = await secrets(), t = HOOK[kind]; if (!t || (site.notify || {})[kind] === false) return;
    const url = s.webhooks[t[0]]; if (!url || !whOk(url)) return;
    const embed = { title: t[1], color: t[2], timestamp: new Date().toISOString() };
    if (kind === 'announce') embed.description = o.text; else {
      embed.fields = [{ name: 'Sipariş', value: String(o.id || '-'), inline: true }, { name: 'Ürün', value: String(o.productName || '-'), inline: true }, { name: 'Tutar', value: `${o.amount} ${o.currency || ''}`, inline: true }, { name: 'Yöntem', value: String(o.method || '-'), inline: true }, { name: 'Steam', value: `[${o.steamId}](https://steamcommunity.com/profiles/${o.steamId})`, inline: true }];
      if (extra) embed.description = String(extra).slice(0, 300);
    }
    await sendHook(url, embed, site.brand);
  } catch (e) { console.error('Webhook gönderilemedi:', e.message); }
}

/* ---------- RCON, otomatik teslimat, duyuru ---------- */
async function rconRun(site, cmds) {
  const s = await secrets(), a = splitAddr(site.server?.ip), cfg = { host: s.rcon.host || a?.host, port: s.rcon.port, password: s.rcon.password, secure: s.rcon.secure };
  if (!cfg.host || !cfg.password) throw new Error('RCON ayarlı değil (Sunucu sekmesi → RCON bağlantısı).');
  return rcon.run(cfg, cmds);
}
const cleanCmd = s => String(s ?? '').replace(/["\\\r\n]/g, ' ').trim().slice(0, 80);
async function deliver(orderId) {
  const o = await store.getOrder(orderId); if (!o || o.status !== 'paid') return { ok: false, error: 'Sipariş "ödendi" durumunda değil' };
  const site = await getSite(), prod = site.vip.find(v => v.id === o.productId);
  const lines = String(prod?.rcon || '').split('\n').map(x => x.trim()).filter(Boolean);
  if (!lines.length) return { ok: false, skipped: true, error: 'Bu ürüne RCON komutu tanımlanmamış (Ürünler sekmesi).' };
  const cmds = lines.map(l => l.split('{steamid}').join(o.steamId).split('{orderid}').join(o.id).split('{product}').join(cleanCmd(o.productName)));
  try { const out = await rconRun(site, cmds); await store.updateOrder(o.id, { status: 'delivered', deliveredAt: new Date().toISOString(), note: 'RCON ile otomatik teslim edildi' }); notify('delivered', o); return { ok: true, out }; }
  catch (e) { await store.updateOrder(o.id, { note: 'Otomatik teslim başarısız: ' + e.message }); notify('deliverFailed', o, e.message); return { ok: false, error: e.message }; }
}
const autoDeliver = id => deliver(id).catch(e => console.error('Teslimat hatası:', e.message));
let announceNow = null;
const cleanMsg = s => String(s ?? '').replace(/[\u0000-\u001f"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);


/* ---------- Discord ile giriş / hesap bağlama (OAuth2) ---------- */
const DAPI = () => (process.env.DISCORD_API_BASE || 'https://discord.com').replace(/\/$/, '');
async function discordUrl(req, res, mode) {
  const s = await secrets(), nonce = crypto.randomBytes(12).toString('hex'), state = sign(await appSecret(), { m: mode, n: nonce, exp: Date.now() + 600e3 });
  res.setHeader('Set-Cookie', `dn=${nonce}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${isHttps(req) ? '; Secure' : ''}`);
  return `${DAPI()}/oauth2/authorize?` + new URLSearchParams({ client_id: s.discord.clientId, redirect_uri: baseUrl(req) + '/api/auth/discord/callback', response_type: 'code', scope: 'identify', state, prompt: 'consent' });
}
async function discordCallback(req, res) {
  const back = q => { res.writeHead(302, { Location: '/?discord=' + q + '#yonetim' }); res.end(); };
  const u = new URL(req.url, 'http://x'), code = u.searchParams.get('code'), st = unsign(await appSecret(), u.searchParams.get('state'));
  if (!st || !code || !safeEq(cookies(req).dn || '', st.n)) return back('error');
  const s = await secrets();
  try {
    const tj = await (await fetch(DAPI() + '/api/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ client_id: s.discord.clientId, client_secret: s.discord.clientSecret, grant_type: 'authorization_code', code, redirect_uri: baseUrl(req) + '/api/auth/discord/callback' }) })).json();
    if (!tj.access_token) return back('error');
    const me = await (await fetch(DAPI() + '/api/users/@me', { headers: { Authorization: 'Bearer ' + tj.access_token }, signal: AbortSignal.timeout(8000) })).json();
    if (!me.id) return back('error');
    const name = me.global_name || me.username || me.id;
    if (st.m === 'link') {
      const d = (await store.getDoc('secrets')) || {}; d.discord ??= {}; d.discord.admins ??= [];
      if (!d.discord.admins.some(a => a.id === me.id)) d.discord.admins.push({ id: me.id, name }); await store.setDoc('secrets', d); return back('linked');
    }
    if (s.discord.admins.some(a => a.id === me.id)) { await startSession(req, res); return back('ok'); }
    return back('denied');
  } catch (e) { console.error('Discord girişi hatası:', e.message); return back('error'); }
}


/* ---------- oyuncu sayısı geçmişi ---------- */
let statsDoc = null;
async function sampleStats() {
  try {
    const site = await getSite(); if (!site.server?.ip && srcOf(site.server || {}) !== 'battlemetrics') return;
    const L = await liveData(site); if (!L.data) return;
    statsDoc ??= (await store.getDoc('stats')) || { points: [] };
    const t = Date.now(), last = statsDoc.points[statsDoc.points.length - 1]; if (last && t - last.t < 240e3) return;
    const off = L.data.status === 'offline';
    statsDoc.points.push({ t, o: off ? 0 : L.data.online || 0, m: L.data.max || site.server.max || 0, s: off ? 0 : 1 });
    statsDoc.points = statsDoc.points.filter(p => t - p.t < 48 * 3600e3).slice(-600); await store.setDoc('stats', statsDoc);
  } catch (e) { console.error('İstatistik kaydı:', e.message); }
}
async function statsOut() {
  statsDoc ??= (await store.getDoc('stats')) || { points: [] }; const since = Date.now() - 24 * 3600e3, pts = statsDoc.points.filter(p => p.t >= since);
  const on = pts.filter(p => p.s); return { points: pts.map(p => [p.t, p.o]), peak: on.length ? Math.max(...on.map(p => p.o)) : 0, avg: on.length ? Math.round(on.reduce((a, p) => a + p.o, 0) / on.length) : 0 };
}

/* ---------- sipariş istatistikleri ---------- */
function orderStats(orders) {
  const paid = orders.filter(o => o.status === 'paid' || o.status === 'delivered'), day = d => new Date(d).toISOString().slice(0, 10);
  const byDay = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); byDay.push({ d, sum: paid.filter(o => day(o.paidAt || o.createdAt) === d).reduce((a, o) => a + o.amount, 0) }); }
  return { revenue: paid.reduce((a, o) => a + o.amount, 0), paidCount: paid.length, pending: orders.filter(o => o.status === 'pending').length, toDeliver: orders.filter(o => o.status === 'paid').length, total: orders.length, byDay };
}

/* ---------- API ---------- */
async function api(req, res, p) {
  const m = req.method, now = () => new Date().toISOString();
  if (p === '/api/site' && m === 'GET') {
    res.setHeader('Cache-Control', 'no-store'); const site = await getSite(), L = await liveData(site);
    if (L.data) { const d = L.data; site.server = { ...site.server, online: d.online, status: d.status, queue: d.queue || 0, map: d.map || '', ...(d.max ? { max: d.max } : {}) }; }
    if (site.showDiscordStats !== false) { const d = await discordStats(site.discord); if (d) site.discordStats = d; }
    site.payMethods = await payMethods(site); site.payments = { symbol: site.payments?.symbol || '₺', currency: site.payments?.currency || 'TRY' };
    return json(res, 200, site);
  }
  if (p === '/api/stats' && m === 'GET') { res.setHeader('Cache-Control', 'no-store'); sampleStats(); return json(res, 200, await statsOut()); }
  if (p === '/api/auth/info' && m === 'GET') { const s = await secrets(); return json(res, 200, { discord: !!(s.discord.clientId && s.discord.clientSecret) }); }
  if (p === '/api/auth/discord/start' && m === 'GET') {
    const s = await secrets(); if (!s.discord.clientId || !s.discord.clientSecret) { res.writeHead(302, { Location: '/?discord=notconfigured' }); return res.end(); }
    res.writeHead(302, { Location: await discordUrl(req, res, 'login') }); return res.end();
  }
  if (p === '/api/auth/discord/callback' && m === 'GET') return discordCallback(req, res);
  if (p === '/api/announcement' && m === 'GET') {
    res.setHeader('Cache-Control', 'no-store'); const a = announceNow;
    return json(res, 200, a && a.until > Date.now() ? { id: a.id, text: a.text, seconds: a.seconds, left: Math.ceil((a.until - Date.now()) / 1000) } : null);
  }
  if (p === '/api/order' && m === 'GET') {
    const u = new URL(req.url, 'http://x'), o = await store.getOrder(u.searchParams.get('id') || '');
    if (!o || !safeEq(o.token, u.searchParams.get('t'))) return json(res, 404, { error: 'Sipariş bulunamadı' });
    return json(res, 200, { status: o.status, productName: o.productName, amount: o.amount, currency: o.currency, method: o.method });
  }
  /* ödeme sağlayıcı bildirimleri (imza ile doğrulanır) */
  if (p === '/api/pay/paytr' && m === 'POST') {
    const f = Object.fromEntries(new URLSearchParams(await raw(req, 1e5))), s = await secrets();
    if (!pay.paytrVerify(s.paytr, f)) { res.writeHead(400); return res.end('bad hash'); }
    const o = await store.getOrder(f.merchant_oid);
    if (o && o.status === 'pending') { await store.updateOrder(o.id, f.status === 'success' ? { status: 'paid', paidAt: now() } : { status: 'failed', note: f.failed_reason_msg || 'Ödeme başarısız' }); if (f.status === 'success') { notify('orderPaid', o); autoDeliver(o.id); } }
    res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('OK');
  }
  if (p === '/api/pay/stripe' && m === 'POST') {
    const rb = await raw(req, 1e6), s = await secrets();
    if (!pay.stripeVerify(s.stripe, rb, req.headers['stripe-signature'])) { res.writeHead(400); return res.end('bad signature'); }
    const ev = JSON.parse(rb), ses = ev.data?.object || {}, o = await store.getOrder(ses.metadata?.order_id || ses.client_reference_id || '');
    if (o && o.status === 'pending') {
      if ((ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') && ses.payment_status === 'paid') {
        if (ses.amount_total === Math.round(o.amount * 100)) { await store.updateOrder(o.id, { status: 'paid', paidAt: now() }); notify('orderPaid', o); autoDeliver(o.id); }
        else await store.updateOrder(o.id, { note: 'DİKKAT: Stripe ödemesi alındı ama tutar uyuşmuyor (' + ses.amount_total + '). Elle kontrol et.' });
      } else if (ev.type === 'checkout.session.expired' || ev.type === 'checkout.session.async_payment_failed') await store.updateOrder(o.id, { status: 'failed', note: 'Ödeme tamamlanmadı' });
    }
    return json(res, 200, { received: true });
  }
  if (m !== 'GET' && req.headers['x-requested-with'] !== 'fetch') return json(res, 403, { error: 'Geçersiz istek' });

  if (p === '/api/checkout' && m === 'POST') {
    const ip = clientIp(req); if (limited('co:' + ip, 8, 600e3)) return json(res, 429, { error: 'Çok fazla deneme. Biraz sonra tekrar dene.' });
    const b = await body(req), site = await getSite(), prod = site.vip.find(v => v.id === b.productId);
    if (!prod || !(prod.amount > 0)) return json(res, 400, { error: 'Ürün bulunamadı' });
    const steamId = String(b.steamId || '').trim(), email = String(b.email || '').trim().toLowerCase(), method = String(b.method || '');
    if (!/^7656119\d{10}$/.test(steamId)) return json(res, 400, { error: 'Geçerli bir SteamID64 gir (17 haneli, 7656119 ile başlar).' });
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) return json(res, 400, { error: 'Geçerli bir e-posta gir.' });
    const methods = await payMethods(site); if (!methods.find(x => x.id === method)) return json(res, 400, { error: 'Bu ödeme yöntemi şu an kullanılamıyor.' });
    const order = { id: 'RS' + crypto.randomBytes(5).toString('hex').toUpperCase(), token: crypto.randomBytes(16).toString('hex'), status: 'pending', productId: prod.id, productName: prod.name, amount: Math.round(prod.amount * 100) / 100,
      currency: site.payments?.currency || 'TRY', steamId, email, phone: String(b.phone || '').replace(/[^\d+]/g, '').slice(0, 20), method, ip, createdAt: now() };
    await store.createOrder(order); notify('orderNew', order);
    try {
      const s = await secrets(), base = baseUrl(req); let action;
      if (method === 'paytr') { const r = await pay.paytrLink(s.paytr, order, ip, base); action = { type: 'iframe', url: r.url }; await store.updateOrder(order.id, { providerRef: r.ref }); }
      else if (method === 'stripe') { const r = await pay.stripeLink({ ...s.stripe, currency: site.payments?.currency || s.stripe.currency }, order, base); action = { type: 'redirect', url: r.url }; await store.updateOrder(order.id, { providerRef: r.ref }); }
      else { const mm = site.payments.methods.manual; action = { type: 'manual', title: mm.title, details: mm.details, note: mm.note, code: order.id }; }
      return json(res, 200, { orderId: order.id, token: order.token, action });
    } catch (e) { console.error('Ödeme başlatılamadı:', e.message); await store.updateOrder(order.id, { status: 'failed', note: e.message }); return json(res, 502, { error: 'Ödeme başlatılamadı. Lütfen başka bir yöntem dene veya yöneticiye haber ver.' }); }
  }

  if (p === '/api/login' && m === 'POST') {
    const ip = clientIp(req), f = sessions.fails.get(ip) || { n: 0, until: 0 };
    if (f.until > Date.now()) return json(res, 429, { error: 'Çok fazla deneme. 5 dakika sonra tekrar dene.' });
    const b = await body(req);
    if (safeEq(b.user, auth.user) && checkPw(String(b.password || ''), auth)) { sessions.fails.delete(ip); await startSession(req, res); return json(res, 200, { ok: true }); }
    if (++f.n >= 5) { f.until = Date.now() + 300e3; f.n = 0; } sessions.fails.set(ip, f);
    await new Promise(r => setTimeout(r, 700)); return json(res, 401, { error: 'Kullanıcı adı veya şifre hatalı' });
  }
  const sid = cookies(req).sid;
  if (!sid || !(await store.getSession(sid))) return json(res, 401, { error: 'Giriş gerekli' });

  if (p === '/api/logout' && m === 'POST') { await store.delSession(sid); res.setHeader('Set-Cookie', 'sid=; Max-Age=0; Path=/'); return json(res, 200, { ok: true }); }
  if (p === '/api/admin/me' && m === 'GET') return json(res, 200, { user: auth.user });
  if (p === '/api/admin/data' && m === 'GET') return json(res, 200, await getSite());
  if (p === '/api/admin/data' && m === 'PUT') {
    const d = await body(req), force = new URL(req.url, 'http://x').searchParams.get('force') === '1';
    if (!d || typeof d !== 'object' || !d.server || !Array.isArray(d.vip) || !Array.isArray(d.rules) || !Array.isArray(d.faq)) return json(res, 400, { error: 'Veri biçimi geçersiz' });
    const cur = await store.getDoc('site');
    if (!force && cur && cur._rev && d._rev !== cur._rev) return json(res, 409, { error: 'Bu ayarlar başka bir pencerede/cihazda daha yeni kaydedilmiş.', rev: cur._rev });
    const rev = await saveSite(d); return json(res, 200, { ok: true, vip: d.vip.map(v => v.id), rev });
  }
  if (p === '/api/admin/history' && m === 'GET') return json(res, 200, await store.listHistory('site'));
  if (p === '/api/admin/restore' && m === 'POST') {
    const b = await body(req), v = await store.getHistory(String(b.id || '')); if (!v) return json(res, 404, { error: 'Yedek bulunamadı' });
    await saveSite(v); return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/secrets' && m === 'GET') return json(res, 200, await maskedSecrets());
  if (p === '/api/admin/secrets' && m === 'PUT') { await saveSecrets(await body(req)); return json(res, 200, await maskedSecrets()); }
  if (p === '/api/admin/orders' && m === 'GET') { const o = await store.listOrders({ limit: 1000 }); return json(res, 200, { orders: o.slice(0, 300), stats: orderStats(o) }); }
  if (p === '/api/admin/order' && m === 'POST') {
    const b = await body(req), o = await store.getOrder(String(b.id || '')); if (!o) return json(res, 404, { error: 'Sipariş bulunamadı' });
    const st = String(b.status || ''); if (!['pending', 'paid', 'delivered', 'cancelled', 'failed'].includes(st)) return json(res, 400, { error: 'Geçersiz durum' });
    const patch = { status: st }; if (st === 'paid' && !o.paidAt) patch.paidAt = now(); if (st === 'delivered') { patch.deliveredAt = now(); if (!o.paidAt) patch.paidAt = now(); }
    const upd = await store.updateOrder(o.id, patch);
    if (st === 'paid' && o.status !== 'paid') { notify('orderPaid', o); const r = await deliver(o.id); return json(res, 200, { ...(await store.getOrder(o.id)), delivery: r }); }
    return json(res, 200, upd);
  }
  if (p === '/api/admin/order-deliver' && m === 'POST') {
    const b = await body(req), r = await deliver(String(b.id || '')); return json(res, 200, { ...r, order: await store.getOrder(String(b.id || '')) });
  }
  if (p === '/api/admin/rcon-test' && m === 'POST') {
    try {
      const out = (await rconRun(await getSite(), ['serverinfo']))[0]; let info = null; try { info = JSON.parse(out); } catch (_) {}
      return json(res, 200, { ok: true, info: info ? { name: info.Hostname, players: info.Players, max: info.MaxPlayers, queue: info.Queued, map: info.Map } : null, raw: String(out).slice(0, 300) });
    } catch (e) { return json(res, 200, { ok: false, error: e.message }); }
  }
  if (p === '/api/admin/announce' && m === 'POST') {
    const b = await body(req), text = cleanMsg(b.text); if (!text) return json(res, 400, { error: 'Duyuru metni boş olamaz' });
    const secs = Math.min(60, Math.max(3, Math.round(+b.seconds || 10))), mode = b.mode === 'chat' ? 'chat' : 'ui', wantGame = b.game !== false, wantSite = b.site !== false;
    if (limited('an:' + sid, 30, 60e3)) return json(res, 429, { error: 'Çok hızlı duyuru gönderiyorsun.' });
    const rec = { id: 'A' + Date.now().toString(36), text, seconds: secs, at: now(), mode, site: wantSite, game: { skipped: true } };
    if (wantSite) announceNow = { id: rec.id, text, seconds: secs, until: Date.now() + secs * 1000 };
    if (wantGame) { try { await rconRun(await getSite(), [mode === 'chat' ? 'say ' + text : `siteannounce "${text}" ${secs}`]); rec.game = { ok: true }; } catch (e) { rec.game = { ok: false, error: e.message }; } }
    notify('announce', rec);
    const doc = (await store.getDoc('announcements')) || { list: [] }; doc.list = [rec, ...(doc.list || [])].slice(0, 100); await store.setDoc('announcements', doc);
    return json(res, 200, { ok: true, id: rec.id, game: rec.game, site: wantSite });
  }
  if (p === '/api/admin/announcements' && m === 'GET') return json(res, 200, ((await store.getDoc('announcements')) || { list: [] }).list || []);
  if (p === '/api/admin/system' && m === 'GET') {
    const e = process.env, s = await secrets();
    const eph = !process.env.DATABASE_URL && !!(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME || process.env.VERCEL || process.env.DYNO || process.env.K_SERVICE);
    const base = baseUrl(req), host = (() => { try { return new URL(base).hostname; } catch (_) { return ''; } })();
    let nb = 0; try { nb = store.backupsDir ? fs.readdirSync(store.backupsDir).length : 0; } catch (_) {}
    const checks = [
      { ok: base.startsWith('https://'), t: 'Site HTTPS ile açılıyor', fix: 'Domain + HTTPS gerekir (Caddy veya Render otomatik verir). PUBLIC_URL https:// ile başlamalı.' },
      { ok: !!host && !/^(localhost|127\.|192\.168\.|10\.)/.test(host), t: 'Gerçek bir domain üzerinden açılıyor', fix: 'Domainini hostinge bağla (Domain & Yayın sekmesi).' },
      { ok: !!process.env.PUBLIC_URL, t: 'PUBLIC_URL ayarlı (ödeme dönüş adresleri için)', fix: '.env / ortam değişkenine PUBLIC_URL=https://siteadin.com yaz.' },
      { ok: !(req.headers['x-forwarded-for'] && !process.env.TRUST_PROXY), t: 'TRUST_PROXY doğru (ziyaretçi/ödeme IP’si)', fix: 'Proxy arkasındaysan TRUST_PROXY=1 ayarla (PayTR gerçek IP ister).' },
      { ok: store.kind === 'PostgreSQL' || !eph, t: 'Veriler kalıcı depoda', fix: 'DATABASE_URL (PostgreSQL) ver veya kalıcı disk bağla; yoksa yeniden başlatmada ayarlar silinir.' },
      { ok: store.kind === 'PostgreSQL' || nb > 0, t: 'Otomatik yedekler alınıyor', fix: 'Dosya modunda data/backups klasörü otomatik oluşur.' }
    ];
    return json(res, 200, { checks, backups: nb, db: store.kind, dataPath: store.file ? path.resolve(store.file) : null, ephemeral: eph, discord: !!(s.discord.clientId && s.discord.clientSecret), hooks: !!(s.webhooks.orders || s.webhooks.announce), node: process.version, uptime: Math.round(process.uptime()), origin: baseUrl(req), env: { DATABASE_URL: !!e.DATABASE_URL, PUBLIC_URL: !!e.PUBLIC_URL, TRUST_PROXY: !!e.TRUST_PROXY, ADMIN_PASSWORD: !!e.ADMIN_PASSWORD }, fixedPassword: false, rcon: !!(s.rcon.password && (s.rcon.host || (await getSite()).server?.ip)), paytr: !!(s.paytr.merchantId && s.paytr.merchantKey && s.paytr.merchantSalt), stripe: !!(s.stripe.secretKey && s.stripe.webhookSecret) });
  }
  if (p === '/api/admin/live' && m === 'GET') { const site = await getSite(), L = await liveData(site, true); return json(res, 200, { src: L.src, data: L.data, err: L.err || null, discord: await discordStats(site.discord) }); }
  if (p === '/api/admin/server-test' && m === 'POST') {
    const s = (await body(req)).server || {};
    try { return json(res, 200, { ok: true, data: srcOf(s) === 'battlemetrics' ? await bmQuery(s) : await queryServer(s) }); } catch (e) { return json(res, 200, { ok: false, error: e.message }); }
  }
  if (p === '/api/admin/discord-test' && m === 'POST') {
    const b = await body(req); dsc.clear(); const d = await discordStats(b.link);
    return json(res, 200, d ? { ok: true, data: d } : { ok: false, error: 'Davet linki okunamadı. discord.gg/xxxx biçiminde, süresiz bir davet linki gir.' });
  }
  if (p === '/api/admin/password' && m === 'POST') {
    const b = await body(req);
    if (!checkPw(String(b.current || ''), auth)) return json(res, 403, { error: 'Mevcut şifre yanlış' });
    const nu = String(b.user || auth.user).trim(), np = String(b.next || '');
    if (!/^[\w.-]{3,32}$/.test(nu)) return json(res, 400, { error: 'Kullanıcı adı 3-32 karakter olmalı (harf, rakam, . _ -)' });
    if (np && np.length < 8) return json(res, 400, { error: 'Yeni şifre en az 8 karakter olmalı' });
    if (!np && nu === auth.user) return json(res, 400, { error: 'Değiştirilecek bir şey yok' });
    auth = { ...auth, user: nu, ...(np ? hashPw(np) : {}) }; await store.setDoc('auth', auth); await store.clearSessions(null); await startSession(req, res); return json(res, 200, { ok: true, user: nu });
  }
  if (p === '/api/admin/discord-link' && m === 'POST') {
    const s = await secrets(); if (!s.discord.clientId || !s.discord.clientSecret) return json(res, 400, { error: 'Önce Discord uygulama bilgilerini kaydet.' });
    const r = await discordUrl(req, res, 'link'); return json(res, 200, { url: r });
  }
  if (p === '/api/admin/discord-unlink' && m === 'POST') {
    const b = await body(req), d = (await store.getDoc('secrets')) || {}; d.discord ??= {}; d.discord.admins = (d.discord.admins || []).filter(a => a.id !== String(b.id)); await store.setDoc('secrets', d); return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/webhook-test' && m === 'POST') {
    const b = await body(req), s = await secrets(), url = s.webhooks[b.which === 'announce' ? 'announce' : 'orders'];
    if (!url) return json(res, 200, { ok: false, error: 'Webhook adresi kayıtlı değil. Önce kaydet.' });
    try { await sendHook(url, { title: '🔔 Test bildirimi', description: 'Webhook bağlantısı çalışıyor ✓', color: 0x60a5fa, timestamp: new Date().toISOString() }, (await getSite()).brand); return json(res, 200, { ok: true }); } catch (e) { return json(res, 200, { ok: false, error: e.message }); }
  }
  if (p === '/api/admin/dns-check' && m === 'POST') {
    const b = await body(req), d = String(b.domain || '').trim().toLowerCase();
    if (!/^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/.test(d)) return json(res, 400, { error: 'Geçerli bir domain gir (ör. site.com)' });
    let ips = []; try { ips = await dns.resolve4(d); } catch (_) {}
    return json(res, 200, { ips, match: !!b.ip && ips.includes(String(b.ip).trim()) });
  }
  return json(res, 404, { error: 'Bulunamadı' });
}

const server = http.createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    secHeaders(req, res);
    if (p === '/healthz') return json(res, 200, { ok: true });
    if (p === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(`User-agent: *\nDisallow: /api/\nDisallow: /_panel/\nSitemap: ${baseUrl(req)}/sitemap.xml\n`); }
    if (p === '/sitemap.xml') { const st = await getSite(); res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' }); return res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${ea(baseUrl(req))}/</loc><lastmod>${(st._savedAt || new Date().toISOString()).slice(0, 10)}</lastmod></url></urlset>`); }
    if (p.startsWith('/api/')) return await api(req, res, p);
    if (p === '/admin' || p === '/admin/') { res.writeHead(302, { Location: '/#yonetim' }); return res.end(); }
    if (p.startsWith('/_panel/')) { res.setHeader('Cache-Control', 'no-store'); return serve(req, res, ADM, p.slice(7)); }
    if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); return res.end(await indexHtml()); }
    serve(req, res, PUB, p);
  } catch (e) {
    if (e instanceof HttpError) { if (!res.headersSent) json(res, e.status, { error: e.message, ...e.extra }); else res.end(); return; }
    console.error(e); if (!res.headersSent) json(res, 500, { error: 'Sunucu hatası' }); else res.end();
  }
});
process.on('unhandledRejection', e => console.error('unhandledRejection', e));

(async () => {
  store = await openStore(DATA); await ensureAuth(); await getSite();
  setInterval(sampleStats, 300e3).unref(); setTimeout(sampleStats, 8000).unref();
  server.listen(PORT, '0.0.0.0', () => console.log(`Sunucu çalışıyor (port ${PORT}). Veritabanı: ${store.kind}.` + (process.env.PUBLIC_URL ? `\nSite: ${process.env.PUBLIC_URL}` : '\nPUBLIC_URL ayarlanmamış: .env / ortam değişkenine PUBLIC_URL=https://siteadin.com ekle.') + '\nPanel: sitenin üstündeki "Yönetim" butonu.'));
})().catch(e => { console.error('Başlatılamadı:', e.message); process.exit(1); });
