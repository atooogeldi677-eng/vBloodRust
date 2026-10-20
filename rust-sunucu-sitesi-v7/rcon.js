'use strict';
// Rust WebRCON istemcisi (bağımlılıksız). ws://HOST:PORT/ŞİFRE
const net = require('net'), tls = require('tls'), crypto = require('crypto');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function frame(text) {
  const p = Buffer.from(text, 'utf8'), mask = crypto.randomBytes(4);
  const h = p.length < 126 ? Buffer.from([0x81, 0x80 | p.length]) : p.length < 65536 ? Buffer.from([0x81, 0x80 | 126, p.length >> 8, p.length & 255]) : null;
  if (!h) throw new Error('Mesaj çok uzun');
  const m = Buffer.alloc(p.length); for (let i = 0; i < p.length; i++) m[i] = p[i] ^ mask[i % 4];
  return Buffer.concat([h, mask, m]);
}
function open(cfg, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const host = String(cfg.host || '').trim(), port = +cfg.port || 28016;
    if (!/^[\w.-]+$/.test(host)) return reject(new Error('RCON adresi geçersiz'));
    const sock = (cfg.secure ? tls : net).connect({ host, port, servername: host });
    const key = crypto.randomBytes(16).toString('base64'), waiters = new Map();
    let buf = Buffer.alloc(0), upgraded = false, closed = false, frag = '';
    const timer = setTimeout(() => { reject(new Error('RCON bağlantısı zaman aşımına uğradı. IP, RCON portu ve güvenlik duvarını kontrol et.')); sock.destroy(); }, timeout);
    const ws = {
      send(cmd, ms = 5000) {
        return new Promise((ok, no) => {
          if (closed) return no(new Error('RCON bağlantısı kapandı (şifre yanlış olabilir)'));
          const id = 1000 + Math.floor(Math.random() * 1e6), t = setTimeout(() => { waiters.delete(id); ok('(yanıt gelmedi, komut gönderildi)'); }, ms);
          waiters.set(id, { ok, t });
          sock.write(frame(JSON.stringify({ Identifier: id, Message: cmd, Name: 'WebRcon' })));
        });
      },
      close() { try { sock.write(Buffer.from([0x88, 0x80, 0, 0, 0, 0])); } catch (_) {} sock.destroy(); }
    };
    const onText = t => { try { const j = JSON.parse(t), w = waiters.get(j.Identifier); if (w) { clearTimeout(w.t); waiters.delete(j.Identifier); w.ok(String(j.Message ?? '')); } } catch (_) {} };
    const parse = () => {
      for (;;) {
        if (buf.length < 2) return;
        const fin = !!(buf[0] & 0x80), op = buf[0] & 15; let len = buf[1] & 127, o = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); o = 4; } else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); o = 10; }
        if (buf.length < o + len) return;
        const payload = buf.subarray(o, o + len); buf = buf.subarray(o + len);
        if (op === 1 || op === 0) { frag += payload.toString('utf8'); if (fin) { onText(frag); frag = ''; } }
        else if (op === 9) sock.write(Buffer.concat([Buffer.from([0x8a, 0x80]), crypto.randomBytes(4)]));
        else if (op === 8) sock.destroy();
      }
    };
    sock.on(cfg.secure ? 'secureConnect' : 'connect', () => sock.write(`GET /${encodeURIComponent(cfg.password || '')} HTTP/1.1\r\nHost: ${host}:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`));
    sock.on('data', d => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) {
        const i = buf.indexOf('\r\n\r\n'); if (i < 0) return;
        const head = buf.subarray(0, i).toString(), acc = /sec-websocket-accept:\s*(\S+)/i.exec(head);
        if (!/^HTTP\/1\.1 101/.test(head) || !acc || acc[1] !== crypto.createHash('sha1').update(key + GUID).digest('base64')) { clearTimeout(timer); sock.destroy(); return reject(new Error('RCON el sıkışması başarısız (şifre veya port yanlış olabilir)')); }
        upgraded = true; buf = buf.subarray(i + 4); clearTimeout(timer); resolve(ws);
      }
      parse();
    });
    sock.on('error', e => { clearTimeout(timer); closed = true; reject(new Error('RCON bağlanamadı: ' + e.message)); });
    sock.on('close', () => { closed = true; for (const [, w] of waiters) { clearTimeout(w.t); w.ok('(bağlantı kapandı)'); } waiters.clear(); });
  });
}
async function run(cfg, cmds, o = {}) {
  const ws = await open(cfg, o.timeout || 5000), out = [];
  try { for (const c of cmds) out.push(await ws.send(c, o.cmdTimeout || 4000)); } finally { ws.close(); }
  return out;
}
module.exports = { run, open };
