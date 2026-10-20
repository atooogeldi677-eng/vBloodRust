'use strict';
// Ödeme sağlayıcıları: PayTR (iFrame API), Stripe (Checkout) ve manuel (havale/EFT/Papara).
const crypto = require('crypto');
const form = o => new URLSearchParams(o).toString();
const safeEq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };

async function paytrLink(c, order, ip, baseUrl) {
  const basket = Buffer.from(JSON.stringify([[order.productName, order.amount.toFixed(2), 1]])).toString('base64');
  const pay = String(Math.round(order.amount * 100)), test = c.testMode ? '1' : '0', nin = '0', maxi = '0', cur = 'TL';
  const hashStr = c.merchantId + ip + order.id + order.email + pay + basket + nin + maxi + cur + test;
  const token = crypto.createHmac('sha256', c.merchantKey).update(hashStr + c.merchantSalt).digest('base64');
  const ret = `${baseUrl}/?o=${order.id}&t=${order.token}`;
  const r = await fetch('https://www.paytr.com/odeme/api/get-token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000),
    body: form({ merchant_id: c.merchantId, user_ip: ip, merchant_oid: order.id, email: order.email, payment_amount: pay, paytr_token: token, user_basket: basket,
      debug_on: test, no_installment: nin, max_installment: maxi, user_name: 'Steam ' + order.steamId, user_address: 'Dijital urun', user_phone: order.phone || '05000000000',
      merchant_ok_url: ret + '&odeme=basarili', merchant_fail_url: ret + '&odeme=basarisiz', timeout_limit: '30', currency: cur, test_mode: test, lang: 'tr' })
  });
  const j = await r.json();
  if (j.status !== 'success') throw new Error('PayTR: ' + (j.reason || 'token alınamadı'));
  return { url: 'https://www.paytr.com/odeme/guvenli/' + j.token, ref: j.token };
}
function paytrVerify(c, f) {
  if (!c.merchantKey || !f.hash) return false;
  const h = crypto.createHmac('sha256', c.merchantKey).update(f.merchant_oid + c.merchantSalt + f.status + f.total_amount).digest('base64');
  return safeEq(h, f.hash);
}

async function stripeLink(c, order, baseUrl) {
  const p = new URLSearchParams();
  p.set('mode', 'payment'); p.set('client_reference_id', order.id); p.set('customer_email', order.email); p.set('metadata[order_id]', order.id);
  p.set('success_url', `${baseUrl}/?o=${order.id}&t=${order.token}&odeme=basarili`); p.set('cancel_url', `${baseUrl}/?o=${order.id}&t=${order.token}&odeme=basarisiz`);
  p.set('line_items[0][quantity]', '1'); p.set('line_items[0][price_data][currency]', String(c.currency || 'try').toLowerCase());
  p.set('line_items[0][price_data][unit_amount]', String(Math.round(order.amount * 100))); p.set('line_items[0][price_data][product_data][name]', order.productName);
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + c.secretKey, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p, signal: AbortSignal.timeout(15000) });
  const j = await r.json();
  if (!r.ok) throw new Error('Stripe: ' + (j.error?.message || r.status));
  return { url: j.url, ref: j.id };
}
function stripeVerify(c, raw, header) {
  if (!c.webhookSecret || !header) return false;
  const parts = Object.fromEntries(String(header).split(',').map(x => x.split('=')).filter(x => x.length === 2));
  const t = +parts.t; if (!t || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const exp = crypto.createHmac('sha256', c.webhookSecret).update(t + '.' + raw).digest('hex');
  return String(header).split(',').some(x => x.startsWith('v1=') && safeEq(x.slice(3), exp));
}
module.exports = { paytrLink, paytrVerify, stripeLink, stripeVerify };
