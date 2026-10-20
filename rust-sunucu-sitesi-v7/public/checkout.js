(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n, C) => (C.payments?.symbol || "₺") + Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const ICON = { paytr: "💳", stripe: "🌐", manual: "🏦" };
  let back, body, poll, state = {};

  async function api(p, data) {
    const r = await fetch(p, { method: data ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" }, body: data ? JSON.stringify(data) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Bir hata oluştu"); return j;
  }
  function mount() {
    if (back) return;
    back = document.createElement("div"); back.className = "co-back"; back.hidden = true;
    back.innerHTML = '<div class="co-win" role="dialog" aria-modal="true"><button class="co-x" type="button" aria-label="Kapat">✕</button><div class="co-body"></div></div>';
    document.body.appendChild(back); body = back.querySelector(".co-body");
    back.addEventListener("error", e => { if (e.target.tagName === "IMG" && e.target.closest(".kit-img")) e.target.replaceWith(document.createTextNode("📦")); }, true);
    back.addEventListener("click", e => { if (e.target === back || e.target.closest(".co-x") || e.target.closest("[data-co-close]")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !back.hidden) close(); });
  }
  function show(html) { body.innerHTML = html; body.classList.remove("co-in"); void body.offsetWidth; body.classList.add("co-in"); }
  function open_() { mount(); back.querySelector(".co-win").classList.remove("wide"); back.hidden = false; void back.offsetWidth; back.classList.add("open"); document.body.style.overflow = "hidden"; }
  function close() { clearInterval(poll); if (!back) return; back.classList.remove("open"); document.body.style.overflow = ""; setTimeout(() => back.hidden = true, 300); }

  function form(prod, C) {
    open_();
    const ms = C.payMethods || []; state.method = ms[0]?.id;
    show(`<div class="co-prod">${prod.image ? `<img src="${esc(prod.image)}" alt="">` : '<div class="co-ph">🛒</div>'}<div><b>${esc(prod.name)}</b><span>${money(prod.amount, C)} ${esc(prod.period || "")}</span></div></div>
      <label>Steam ID (SteamID64)<input id="coSteam" inputmode="numeric" maxlength="17" placeholder="76561198…" autocomplete="off"><small>17 haneli ID. <a href="https://steamid.io" target="_blank" rel="noopener">steamid.io</a> adresinden profil linkinle öğrenebilirsin.</small></label>
      <label>E-posta<input id="coMail" type="email" placeholder="ornek@mail.com" autocomplete="email"><small>Sipariş bilgisi için kullanılır.</small></label>
      <div class="co-lbl">Ödeme yöntemi</div>
      <div class="co-methods">${ms.map((m, i) => `<button type="button" class="co-m${i ? "" : " on"}" data-m="${m.id}"><i>${ICON[m.id] || "💰"}</i><b>${esc(m.title)}</b><small>${esc(m.sub || "")}</small></button>`).join("")}</div>
      <button class="btn lg co-go" type="button">Ödemeye Geç · ${money(prod.amount, C)}</button><div class="co-err" id="coErr"></div>`);
    body.querySelectorAll(".co-m").forEach(b => b.onclick = () => { body.querySelectorAll(".co-m").forEach(x => x.classList.remove("on")); b.classList.add("on"); state.method = b.dataset.m; });
    body.querySelector(".co-go").onclick = async e => {
      const btn = e.currentTarget, err = body.querySelector("#coErr"); err.textContent = ""; btn.classList.add("busy"); btn.disabled = true;
      try {
        const r = await api("/api/checkout", { productId: prod.id, steamId: body.querySelector("#coSteam").value.trim(), email: body.querySelector("#coMail").value.trim(), method: state.method });
        state.order = r; next(r, prod, C);
      } catch (ex) { err.textContent = ex.message; err.classList.remove("shake"); void err.offsetWidth; err.classList.add("shake"); btn.classList.remove("busy"); btn.disabled = false; }
    };
  }
  function next(r, prod, C) {
    const a = r.action;
    if (a.type === "redirect") { show('<div class="co-wait"><div class="co-spin"></div><b>Ödeme sayfasına yönlendiriliyorsun…</b></div>'); location.href = a.url; return; }
    if (a.type === "iframe") show(`<div class="co-note">Güvenli ödeme sayfası (PayTR). Ödeme sonrası bu pencere otomatik güncellenir.</div><iframe class="co-frame" src="${esc(a.url)}" allow="payment"></iframe>`);
    else show(`<div class="co-ok-ic">🏦</div><h3>${esc(a.title || "Havale / EFT")}</h3><p class="co-note">Aşağıdaki bilgilere <b>${money(prod.amount, C)}</b> gönder ve açıklamaya sipariş kodunu yaz.</p>
      <div class="co-code"><span>Sipariş kodu</span><b id="coCode">${esc(a.code)}</b><button type="button" data-copy="coCode">Kopyala</button></div>
      <pre class="co-pre">${esc(a.details)}</pre>${a.note ? `<p class="co-note">${esc(a.note)}</p>` : ""}
      <div class="co-wait"><div class="co-spin"></div><span>Ödemen onaylanınca bu pencere kendiliğinden güncellenir. Kapatabilirsin; kodunu sakla.</span></div>`);
    body.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => { try { navigator.clipboard.writeText(body.querySelector("#" + b.dataset.copy).textContent); b.textContent = "Kopyalandı ✓"; } catch (_) {} });
    watch(r.orderId, r.token);
  }
  function watch(id, t, hint) {
    clearInterval(poll); let n = 0;
    const tick = async () => {
      try {
        const o = await api(`/api/order?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`); n++;
        if (o.status === "paid" || o.status === "delivered") { clearInterval(poll); success(o, id); }
        else if (o.status === "failed" || o.status === "cancelled") { clearInterval(poll); failed(o); }
        else if (hint === "basarisiz" && n > 2) { clearInterval(poll); failed(o, "Ödeme tamamlanmadı."); }
      } catch (_) {}
    };
    tick(); poll = setInterval(tick, 4000);
  }
  function success(o, id) {
    open_();
    show(`<div class="co-done"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg><h3>Ödeme alındı!</h3><p>${esc(o.productName)} kısa süre içinde SteamID’ne tanımlanacak.</p><div class="co-code"><span>Sipariş kodu</span><b>${esc(id)}</b></div><button class="btn lg" data-co-close type="button">Tamam</button>
      ${Array.from({ length: 18 }, (_, i) => `<i class="cf" style="--x:${(i * 37) % 100}%;--d:${(i % 6) * 0.12}s;--c:${["#e5533a", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899"][i % 5]}"></i>`).join("")}</div>`);
  }
  function failed(o, msg) {
    open_(); show(`<div class="co-done bad"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M17 17l18 18M35 17L17 35"/></svg><h3>Ödeme tamamlanamadı</h3><p>${esc(msg || "Ödeme başarısız oldu veya iptal edildi.")} Tekrar deneyebilirsin.</p><button class="btn lg" data-co-close type="button">Kapat</button></div>`);
  }
  const rl = s => /^https:\/\//i.test(s || "") ? s : "";
  function kit(k) {
    open_();
    show(`<div class="kit-head"><div class="kit-ic big">${esc(k.icon || "🎁")}</div><div><h3>${esc(k.name)}</h3><p class="co-note" style="margin:0">${esc(k.description || "")}</p></div></div>
      <div class="kit-grid">${(k.items || []).map((it, i) => { const img = rl(it.image) || (/^[\w.]+$/.test(it.shortname || "") ? `https://rustlabs.com/img/items180/${it.shortname}.png` : ""); return `<div class="kit-item" style="--i:${i}"><div class="kit-img">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : "📦"}<em>×${esc(it.amount)}</em></div><span>${esc(it.name)}</span></div>`; }).join("") || '<p class="co-note">Bu kitin içeriği henüz eklenmedi.</p>'}</div>
      ${k.cooldown ? `<div class="co-code"><span>Bekleme süresi</span><b style="font-size:15px">⏱ ${esc(k.cooldown)}</b></div>` : ""}<button class="btn lg" data-co-close type="button">Kapat</button>`);
    back.querySelector(".co-win").classList.add("wide");
  }
  window.Checkout = {
    kit,
    open(prod, C) { form(prod, C); },
    status(id, t, hint) { open_(); show('<div class="co-wait big"><div class="co-spin"></div><b>Ödemen doğrulanıyor…</b></div>'); watch(id, t, hint); }
  };
})();
