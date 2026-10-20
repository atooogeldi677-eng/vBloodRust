'use strict';
// Uçtan uca duman testi: sunucuyu geçici veriyle başlatır; giriş, sipariş, ödeme onayı,
// RCON ile otomatik teslimat ve duyuruyu sahte bir WebRCON sunucusuyla dener.
const { spawn } = require('child_process'), http = require('http'), crypto = require('crypto'), os = require('os'), fs = require('fs'), path = require('path');
const PORT = 3900 + Math.floor(Math.random() * 90), RPORT = PORT + 100, DPORT = PORT + 300, HPORT = PORT + 400, APORT = PORT + 500, BASE = `http://127.0.0.1:${PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-')), got = [], hooks = [];
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

// --- sahte WebRCON sunucusu ---
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const fake = http.createServer();
fake.on('upgrade', (req, sock) => {
  if (req.url !== '/rconsifre') { sock.end('HTTP/1.1 401 Unauthorized\r\n\r\n'); return; }
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64') + '\r\n\r\n');
  let b = Buffer.alloc(0);
  sock.on('data', d => { b = Buffer.concat([b, d]); while (b.length >= 2) { let len = b[1] & 127, o = 2; if (len === 126) { len = b.readUInt16BE(2); o = 4; } if (b.length < o + 4 + len) return; const m = b.subarray(o, o + 4), p = Buffer.from(b.subarray(o + 4, o + 4 + len)); for (let i = 0; i < p.length; i++) p[i] ^= m[i % 4]; b = b.subarray(o + 4 + len); if (!p.length) continue; const j = JSON.parse(p.toString()); got.push(j.Message); const out = Buffer.from(JSON.stringify({ Identifier: j.Identifier, Message: 'ok', Type: 'Generic' })); sock.write(Buffer.concat([Buffer.from([0x81, out.length]), out])); } });
});


// --- sahte Discord API (OAuth) ve webhook alıcısı ---
const discordUsers = { tok111: { id: '111', username: 'tester' }, tok222: { id: '222', username: 'baskasi' } }; let nextTok = 'tok111';
const dapi = http.createServer((req, res) => {
  if (req.url === '/api/oauth2/token') { req.resume(); req.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ access_token: nextTok })); }); return; }
  if (req.url === '/api/users/@me') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(discordUsers[(req.headers.authorization || '').slice(7)] || {})); }
  res.writeHead(404); res.end();
});
const hook = http.createServer((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { hooks.push(JSON.parse(b).embeds[0]); } catch (_) {} res.writeHead(204); res.end(); }); });
const cstr = s => Buffer.concat([Buffer.from(s, 'utf8'), Buffer.from([0])]);
const udp = require('dgram').createSocket('udp4');
udp.on('message', (m, r) => {
  if (m.length <= 25) { const b = Buffer.alloc(9); b.writeInt32LE(-1, 0); b[4] = 0x41; b.writeInt32LE(1234, 5); return udp.send(b, r.port, r.address); }
  udp.send(Buffer.concat([Buffer.from([0xff, 0xff, 0xff, 0xff, 0x49, 17]), cstr('Gercek Rust Sunucusu'), cstr('Procedural Map'), cstr('rust'), cstr('Rust'), Buffer.from([0, 0, 137, 255, 0, 0x64, 0x6c, 1, 0]), cstr('2500'), Buffer.from([0x20]), cstr('mp300,cp137,qp4,v2500')]), r.port, r.address);
});

let cookie = '';
async function call(p, data, method) {
  const r = await fetch(BASE + p, { method: method || (data ? 'POST' : 'GET'), headers: { 'X-Requested-With': 'fetch', 'Content-Type': 'application/json', cookie }, body: data ? JSON.stringify(data) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (_) { j = t; } return { s: r.status, j };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(r => fake.listen(RPORT, '127.0.0.1', r)); await new Promise(r => dapi.listen(DPORT, '127.0.0.1', r)); await new Promise(r => hook.listen(HPORT, '127.0.0.1', r)); await new Promise(r => udp.bind(APORT + 1, '127.0.0.1', r));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT, DATA_DIR: tmp, ADMIN_PASSWORD: 'ci-test-pass-1', ADMIN_USER: 'admin', DATABASE_URL: '', DISCORD_API_BASE: `http://127.0.0.1:${DPORT}`, ALLOW_LOCAL_WEBHOOKS: '1' }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/healthz')).ok) break; } catch (_) {} await sleep(150); }
    console.log('Genel');
    ok((await call('/healthz')).j.ok === true, 'healthz');
    const site = (await call('/api/site')).j; ok(site.vip.length > 0 && site.kits.length > 0, 'site verisi: ürünler ve kitler var');
    ok((await call('/api/admin/data')).s === 401, 'yetkisiz yönetici erişimi reddedildi');
    ok((await call('/api/login', { user: 'admin', password: 'yanlis' })).s === 401, 'yanlış şifre reddedildi');
    ok((await call('/api/login', { user: 'admin', password: 'ci-test-pass-1' })).s === 200, 'sabit şifre (ADMIN_PASSWORD) ile giriş');
    console.log('Ödeme + RCON teslimat');
    const d = (await call('/api/admin/data')).j; d.payments.methods.manual = { enabled: true, title: 'Havale', details: 'IBAN TEST', note: '' }; d.vip[0].rcon = 'oxide.usergroup add {steamid} vip';
    ok((await call('/api/admin/data', d, 'PUT')).s === 200, 'ayarlar kaydedildi');
    ok((await call('/api/admin/secrets', { rcon: { host: '127.0.0.1', port: RPORT, password: 'rconsifre' } }, 'PUT')).s === 200, 'RCON ayarı kaydedildi');
    ok((await call('/api/checkout', { productId: d.vip[0].id, steamId: '123', email: 'a@b.co', method: 'manual' })).s === 400, 'geçersiz SteamID reddedildi');
    const o = (await call('/api/checkout', { productId: d.vip[0].id, steamId: '76561198012345678', email: 'oyuncu@test.com', method: 'manual' })).j; ok(o.orderId && o.action.type === 'manual', 'sipariş oluşturuldu');
    ok((await call(`/api/order?id=${o.orderId}&t=${o.token}`)).j.status === 'pending', 'sipariş bekliyor');
    const r = (await call('/api/admin/order', { id: o.orderId, status: 'paid' })).j;
    ok(r.status === 'delivered' && r.delivery.ok, 'ödendi onayı -> RCON ile otomatik teslim edildi');
    ok(got.includes('oxide.usergroup add 76561198012345678 vip'), 'sunucuya doğru komut gitti: ' + got[0]);
    console.log('Duyuru');
    const a = (await call('/api/admin/announce', { text: 'Test duyurusu', seconds: 10, game: true, site: true, mode: 'ui' })).j; ok(a.ok && a.game.ok, 'duyuru oyuna gönderildi');
    ok(got.includes('siteannounce "Test duyurusu" 10'), 'sunucu komutu: siteannounce "Test duyurusu" 10');
    ok((await call('/api/announcement')).j?.text === 'Test duyurusu', 'duyuru sitede aktif');
    ok((await call('/api/admin/announcements')).j.length === 1, 'duyuru geçmişe kaydedildi');
    console.log('Gerçek sunucu bağlantısı (otomatik port bulma)');
    const tst = (await call('/api/admin/server-test', { server: { ip: `127.0.0.1:${APORT}`, liveSource: 'query' } })).j;
    ok(tst.ok && tst.data.port === APORT + 1, `oyun portu ${APORT}, sorgu portu otomatik bulundu: ${tst.data && tst.data.port}`);
    ok(tst.data.name === 'Gercek Rust Sunucusu' && tst.data.online === 137 && tst.data.max === 300 && tst.data.queue === 4, 'oyuncu 137/300, sırada 4, sunucu adı okundu');
    const d2 = (await call('/api/admin/data')).j; d2.server.ip = `127.0.0.1:${APORT}`; d2.server.liveSource = 'query'; d2.server.queryPort = ''; await call('/api/admin/data', d2, 'PUT');
    const live = (await call('/api/site')).j.server; ok(live.online === 137 && live.max === 300 && live.queue === 4 && live.status === 'online', 'site canlı veriyi gösteriyor: ' + live.online + '/' + live.max);
    ok((await call('/api/admin/server-test', { server: { ip: `127.0.0.1:${APORT + 50}`, liveSource: 'query' } })).j.ok === false, 'kapalı sunucu hata veriyor');
    console.log('Discord webhook');
    const bw = await call('/api/admin/secrets', { webhooks: { orders: 'https://example.com/hook' } }, 'PUT');
    ok(bw.s === 400 && bw.j.field === 'webhooks.orders' && /webhook/i.test(bw.j.error), 'geçersiz webhook: 500 değil 400 + hangi alan olduğu söyleniyor');
    ok((await call('/api/admin/data')).s === 200, 'hatalı webhook sonrası site ayarları hâlâ kaydedilebilir');
    ok((await call('/api/admin/secrets', { webhooks: { orders: `http://127.0.0.1:${HPORT}/api/webhooks/123/abc?wait=true ` } }, 'PUT')).s === 200, 'sonunda ?wait=true / boşluk olan adres düzeltilip kabul edildi');
    const vh = await call('/api/admin/secrets', { webhooks: { announce: 'https://discord.com/api/v10/webhooks/123456789/AbC_dEf-123?wait=true' } }, 'PUT');
    ok(vh.s === 200 && vh.j.webhooks.announce.set, 'sürümlü Discord adresi (/api/v10/webhooks/…) kabul edildi');
    ok((await call('/api/admin/secrets', { webhooks: { orders: `http://127.0.0.1:${HPORT}/api/webhooks/123/abc`, announce: `http://127.0.0.1:${HPORT}/api/webhooks/123/abc` } }, 'PUT')).s === 200, 'webhook adresleri kaydedildi');
    ok((await call('/api/admin/webhook-test', { which: 'orders' })).j.ok, 'test bildirimi Discord’a gitti');
    const o2 = (await call('/api/checkout', { productId: d.vip[0].id, steamId: '76561198099999999', email: 'w@test.com', method: 'manual' })).j; await call('/api/admin/order', { id: o2.orderId, status: 'paid' }); await sleep(500);
    const titles = hooks.map(h => h.title).join(' | ');
    ok(/Yeni sipariş/.test(titles) && /Ödeme alındı/.test(titles) && /Sunucuya teslim/.test(titles), 'sipariş / ödeme / teslim bildirimleri geldi');
    ok(!JSON.stringify(hooks).includes('w@test.com'), 'e-posta Discord’a gönderilmedi');
    await call('/api/admin/announce', { text: 'Webhook duyuru', seconds: 5, game: false, site: true }); await sleep(300);
    ok(hooks.some(h => h.title.includes('Duyuru') && h.description === 'Webhook duyuru'), 'duyuru Discord kanalına yansıdı');
    console.log('Discord ile giriş (OAuth)');
    ok((await call('/api/auth/info')).j.discord === false, 'ayar yokken Discord girişi kapalı');
    ok((await call('/api/admin/secrets', { discord: { clientId: '123456789012345678', clientSecret: 'gizlisecret' } }, 'PUT')).s === 200, 'Discord uygulama bilgileri kaydedildi');
    ok((await call('/api/auth/info')).j.discord === true, 'Discord girişi açıldı');
    const raw = async (u, ck) => { const r = await fetch(BASE + u, { redirect: 'manual', headers: { cookie: ck || '' } }); return { s: r.status, loc: r.headers.get('location') || '', ck: (r.headers.get('set-cookie') || '').split(',').map(x => x.split(';')[0].trim()).filter(Boolean) }; };
    const flow = async (tok, start) => { nextTok = tok; const s1 = start || await raw('/api/auth/discord/start'); const url = new URL(s1.loc || s1.url), st = url.searchParams.get('state'), dn = (s1.ck.find(c => c.startsWith('dn=')) || ''); const cb = await raw('/api/auth/discord/callback?code=kod&state=' + encodeURIComponent(st), dn); return { s1, url, cb }; };
    let f = await flow('tok111');
    ok(f.s1.s === 302 && f.url.pathname === '/oauth2/authorize' && f.url.searchParams.get('client_id') === '123456789012345678' && f.url.searchParams.get('prompt') === 'consent' && f.url.searchParams.get('redirect_uri').endsWith('/api/auth/discord/callback'), 'Discord’a doğru yetkilendirme adresiyle yönlendirdi');
    ok(f.cb.loc.includes('discord=denied') && !f.cb.ck.some(c => c.startsWith('sid=')), 'bağlı olmayan Discord hesabı girişe alınmadı');
    const adminCookie = cookie;
    const lr = await fetch(BASE + '/api/admin/discord-link', { method: 'POST', headers: { 'X-Requested-With': 'fetch', 'Content-Type': 'application/json', cookie: adminCookie }, body: '{}' });
    const lj = await lr.json(); ok(lr.status === 200 && lj.url, 'hesap bağlama adresi üretildi');
    nextTok = 'tok111'; const lkRes = await raw('/api/auth/discord/callback?code=kod&state=' + encodeURIComponent(new URL(lj.url).searchParams.get('state')), (lr.headers.get('set-cookie') || '').split(';')[0]);
    ok(lkRes.loc.includes('discord=linked'), 'Discord hesabı yönetici olarak bağlandı');
    ok((await call('/api/admin/secrets')).j.discord.admins.some(a => a.id === '111'), 'bağlı hesap listede (kimlik 111)');
    f = await flow('tok222'); ok(f.cb.loc.includes('discord=denied'), 'başka Discord hesabı hâlâ reddediliyor');
    f = await flow('tok111'); const sid = f.cb.ck.find(c => c.startsWith('sid='));
    ok(f.cb.loc.includes('discord=ok') && sid, 'bağlı Discord hesabı ile giriş yapıldı (oturum açıldı)');
    ok((await fetch(BASE + '/api/admin/me', { headers: { cookie: sid } })).status === 200, 'Discord oturumuyla yönetim API’si açıldı');
    const bad = await raw('/api/auth/discord/callback?code=x&state=sahte', 'dn=abc'); ok(bad.loc.includes('discord=error'), 'sahte state reddedildi');
    const s3 = await raw('/api/auth/discord/start'); const st3 = new URL(s3.loc).searchParams.get('state'); const nock = await raw('/api/auth/discord/callback?code=x&state=' + encodeURIComponent(st3), ''); ok(nock.loc.includes('discord=error'), 'çerezsiz (CSRF) geri dönüş reddedildi');
    console.log('Kalıcılık, çakışma koruması ve yayın');
    const x = (await call('/api/admin/data')).j; x.news = [{ id: 'n1', title: 'Wipe duyurusu', date: '2026-10-19', text: 'Yeni wipe geldi' }]; x.server.nextWipe = '2030-01-01T20:00:00.000Z';
    const pr = (await call('/api/admin/data', x, 'PUT')); ok(pr.s === 200 && pr.j.rev > (x._rev || 0), 'kayıt numarası arttı: #' + pr.j.rev);
    ok((await call('/api/admin/data', x, 'PUT')).s === 409, 'eski pencere (eski kayıt no) yeni kaydı EZEMEDİ (409)');
    ok((await call('/api/admin/data?force=1', x, 'PUT')).s === 200, 'bilinçli “zorla kaydet” çalışıyor');
    const pub = (await call('/api/site')).j; ok(pub.news.length === 1 && pub.news[0].title === 'Wipe duyurusu' && pub.server.nextWipe === '2030-01-01T20:00:00.000Z', 'haber ve sonraki wipe tarihi sitede kayıtlı');
    await call('/api/stats'); await sleep(600); const sta = (await call('/api/stats')).j; ok(sta.points.length >= 1 && sta.peak === 137, 'oyuncu geçmişi kaydediliyor (zirve ' + sta.peak + ')');
    const cs = await fetch(BASE + '/style.css'); const et = cs.headers.get('etag'); ok(et && cs.headers.get('cache-control') === 'no-cache', 'CSS/JS: ETag + no-cache (eski dosya takılı kalmaz)');
    ok((await fetch(BASE + '/style.css', { headers: { 'If-None-Match': et } })).status === 304, 'değişmeyen dosya 304 ile hızlı sunuluyor');
    ok((await (await fetch(BASE + '/robots.txt')).text()).includes('Sitemap: http://127.0.0.1'), 'robots.txt domaine göre üretiliyor');
    ok((await (await fetch(BASE + '/sitemap.xml')).text()).includes('<urlset'), 'sitemap.xml var');
    const sys = (await call('/api/admin/system')).j; ok(Array.isArray(sys.checks) && sys.checks.length >= 6 && sys.checks.every(c => typeof c.ok === 'boolean'), 'yayın hazırlık kontrolü ' + sys.checks.length + ' madde: ' + sys.checks.filter(c => !c.ok).length + ' uyarı (yerelde beklenen)');
    ok(sys.backups >= 1, 'otomatik yedek alındı (data/backups)');
    console.log('Şifre / hesap');
    ok((await call('/api/admin/password', { current: 'yanlis', next: 'yenisifre123' })).s === 403, 'mevcut şifre yanlışken değişmedi');
    ok((await call('/api/admin/password', { current: 'ci-test-pass-1', next: 'kisa' })).s === 400, 'kısa şifre reddedildi');
    ok((await call('/api/admin/password', { current: 'ci-test-pass-1', next: 'yenisifre123', user: 'yonetici' })).s === 200, 'şifre ve kullanıcı adı panelden değiştirildi');
    cookie = ''; ok((await call('/api/login', { user: 'admin', password: 'ci-test-pass-1' })).s === 401, 'eski şifre/kullanıcı artık geçersiz');
    ok((await call('/api/login', { user: 'yonetici', password: 'yenisifre123' })).s === 200, 'yeni şifre ile giriş');
    console.log('Güvenlik');
    ok(!JSON.stringify((await call('/api/site')).j).includes('rconsifre'), 'RCON şifresi herkese açık veride yok');
    ok(!JSON.stringify((await call('/api/site')).j).includes('gizlisecret') && !JSON.stringify((await call('/api/site')).j).includes('/api/webhooks/'), 'Discord secret ve webhook adresi herkese açık veride yok');
    ok(!JSON.stringify((await call('/api/admin/secrets')).j).includes('gizlisecret'), 'gizli bilgiler panele de açık gönderilmiyor (maskeli)');
  } catch (e) { console.log('  ✗ BEKLENMEYEN HATA', e); fails++; }
  srv.kill(); fake.close(); dapi.close(); hook.close(); udp.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fails ? `\n${fails} test BAŞARISIZ` : '\nTüm testler geçti'); process.exit(fails ? 1 : 0);
})();
