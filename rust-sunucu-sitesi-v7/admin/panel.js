(() => {
  if (window.Panel) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  async function api(p, method = "GET", body) {
    const r = await fetch(p, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "Hata"); e.status = r.status; e.field = j.field; throw e; }
    return j;
  }
  const IC = {
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 1.5-3.3 2 2 0 0 1 1.5-3.2H17a5 5 0 0 0 5-5C22 6 17.5 2 12 2z"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 11.5a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.5L21 7H6"/>',
    gift: '<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M19 12v9H5v-9"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    server: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M18.5 8.5a5 5 0 0 1 0 7"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    news: '<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M19 9h2v9a2 2 0 0 1-2 2M8 8h7M8 12h7M8 16h4"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 18.5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    collapse: '<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7.5L12 12.5l8.7-5M12 22V12.5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
  };
  const ic = (n, s) => `<svg viewBox="0 0 24 24"${s ? ` style="width:${s}px;height:${s}px"` : ""}>${IC[n] || ""}</svg>`;
  const SK = n => Array.from({ length: n }, () => '<div class="x-skel"></div>').join("");
  let D, tab = "ozet", dirty = false, changed = false, me = "", root, lg, tt, pv, added = null, timer, previewOn = false, prevReady = false;
  let forceSave = false, rev = 0;
  let auto = localStorage.getItem('x_auto') !== '0', saveT, saving = false, lastSave = null;
  let ORD = null, SEC = null, SYS = null, LIVE = null, HIST = null, ANH = null, secDraft = {}, secDirty = false, ordFilter = "open", ordQ = "";
  let ANN = { text: "", seconds: 10, game: true, site: true, mode: "ui" };
  const money = n => (D?.payments?.symbol || "₺") + Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const toast = (t, bad) => { tt.innerHTML = `<i>${ic(bad ? "alert" : "check", 18)}</i><span>${esc(t)}</span>`; tt.className = "show" + (bad ? " bad" : ""); clearTimeout(toast.t); toast.t = setTimeout(() => tt.className = "", 2600); };
  const ST = { pending: "Bekliyor", paid: "Ödendi", delivered: "Teslim edildi", cancelled: "İptal", failed: "Başarısız" }, MT = { paytr: "PayTR Kart", stripe: "Stripe", manual: "Havale/Papara" };
  const GROUPS = [
    ["Genel", [["ozet", "Özet", "home"], ["genel", "Site Kimliği", "tag"], ["gorunum", "Görünüm", "palette"]]],
    ["Satış", [["siparis", "Siparişler", "receipt"], ["urunler", "Ürünler", "cart"], ["kitler", "Kitler", "gift"], ["odeme", "Ödeme", "card"]]],
    ["Sunucu", [["sunucu", "Sunucu & RCON", "server"], ["duyuru", "Duyuru", "megaphone"], ["bildirim", "Bildirimler", "bell"]]],
    ["İçerik", [["haberler", "Haberler", "news"], ["icerik", "Kurallar & SSS", "book"], ["baglanti", "Bağlantılar", "link"]]],
    ["Sistem", [["sistem", "Domain & Yayın", "globe"], ["yedek", "Yedekler", "archive"], ["guvenlik", "Güvenlik", "shield"]]]
  ];
  const TABS = GROUPS.flatMap(g => g[1].map(t => [t[0], t[1], t[2], g[0]]));
  const uid = () => Math.random().toString(36).slice(2, 8);
  const NEW = {
    vip: () => ({ id: "p" + uid(), name: "Yeni Ürün", amount: 0, period: "/ wipe", image: "", url: "", hot: false, kitId: "", rcon: "", features: [] }),
    kits: () => ({ id: "k" + uid(), name: "Yeni Kit", icon: "🎁", cooldown: "", description: "", items: [] }),
    news: () => ({ id: "n" + uid(), title: "Yeni haber", date: new Date().toISOString().slice(0, 10), text: "" }), rules: () => ({ icon: "📌", title: "Yeni Kural", text: "" }), faq: () => ({ q: "Yeni soru", a: "" }), socials: () => ({ platform: "auto", name: "", url: "https://" })
  };
  const get = p => p.split(".").reduce((o, k) => o?.[k], D);
  const set = (p, v) => { const k = p.split("."), l = k.pop(); k.reduce((o, x) => o[x] ??= {}, D)[l] = v; };
  const stat = () => { const e = $("#xstat"); if (!e) return; e.className = "x-status" + (saving ? " s" : dirty || secDirty ? " d" : lastSave ? " ok" : ""); e.textContent = saving ? "Kaydediliyor…" : dirty || secDirty ? (auto ? "● Kaydedilecek…" : "● Kaydedilmedi") : lastSave ? "✓ Kaydedildi" + (rev ? " #" + rev : "") + " " + lastSave.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : ""; };
  const mark = () => { applyAccent(); dirty = true; $("#xsave").classList.add("x-dirty"); stat(); if (auto) { clearTimeout(saveT); saveT = setTimeout(() => save(true), 1200); } preview(); };
  const markSec = () => { secDirty = true; $("#xsave").classList.add("x-dirty"); stat(); };
  const preview = () => { clearTimeout(pv); pv = setTimeout(() => { const f = $("#xprev"); if (previewOn && prevReady && f?.contentWindow) f.contentWindow.postMessage({ type: "render", site: D }, location.origin); }, 150); };
  function countUp(el, to) { if (!el) return; const s = performance.now(); const f = t => { const k = Math.min(1, (t - s) / 800); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }

  /* ---------- tema, vurgu rengi, onay penceresi, komut paleti ---------- */
  let theme = localStorage.getItem("x_theme") || "dark", collapsed = localStorage.getItem("x_side") === "1", confirmCancel = null, palSel = 0, palItems = [];
  function applyAccent() {
    if (!root) return; const light = theme === "light", mono = D && D.themeStyle === "mono";
    const c = mono ? (light ? "#111827" : "#e5e7eb") : (D && /^#[0-9a-f]{6}$/i.test(D.accent || "") ? D.accent : "#e5533a");
    [root, lg, tt].forEach(e => { if (!e) return; e.style.setProperty("--a", c); e.style.setProperty("--oa", mono && !light ? "#0f172a" : "#fff"); });
  }
  function applyTheme() {
    [root, lg, tt].forEach(e => { if (e) e.dataset.xt = theme; });
    const b = root && root.querySelector && root.querySelector('[data-act="theme"]'); if (b) b.innerHTML = ic(theme === "dark" ? "sun" : "moon");
    applyAccent();
  }
  const setUser = () => { $("#xuser").textContent = me; $("#xav").textContent = (String(me)[0] || "A").toUpperCase(); };
  function ask(text, o = {}) {
    return new Promise(res => {
      const el = $("#xconf");
      const done = v => { confirmCancel = null; el.classList.remove("open"); setTimeout(() => { el.hidden = true; el.innerHTML = ""; }, 200); el.onclick = null; res(v); };
      confirmCancel = () => done(false);
      el.innerHTML = `<div class="x-mbox"><h3>${esc(o.title || "Emin misin?")}</h3><p>${esc(text).replace(/\n/g, "<br>")}</p><div class="x-mact"><button class="x-btn x-ghost" data-r="0">${esc(o.cancel || "Vazgeç")}</button><button class="x-btn${o.danger ? " x-danger" : ""}" data-r="1">${esc(o.ok || "Tamam")}</button></div></div>`;
      el.hidden = false; void el.offsetWidth; el.classList.add("open");
      el.onclick = e => { const b = e.target.closest("[data-r]"); if (b && b.dataset.r !== undefined) done(b.dataset.r === "1"); else if (e.target === el) done(false); };
    });
  }
  const PAL_KW = { ozet: "özet dashboard genel bakış gelir oyuncu", genel: "logo ad site adı başlık açıklama", gorunum: "renk tema siyah beyaz video koyu açık", siparis: "sipariş teslim ödeme csv", urunler: "ürün vip fiyat rcon teslimat mağaza", kitler: "kit eşya shortname", odeme: "ödeme paytr stripe havale papara iban", sunucu: "sunucu ip port rcon oyuncu slot wipe bağlan", duyuru: "duyuru mesaj yayın", bildirim: "webhook discord bildirim", haberler: "haber blog", icerik: "kural sss soru", baglanti: "discord sosyal youtube instagram tiktok link", sistem: "domain dns https hosting yayın", yedek: "yedek geri yükle", guvenlik: "şifre sifre kullanıcı discord giriş güvenlik" };
  const PAL_ACT = [["save", "Kaydet", "save", "kaydet ctrl s"], ["prevtoggle", "Canlı önizlemeyi aç / kapat", "eye", "önizleme"], ["theme", "Açık / koyu temayı değiştir", "moon", "tema"], ["collapse", "Kenar çubuğunu daralt / genişlet", "collapse", "menü"], ["logout", "Çıkış yap", "logout", "çıkış"]];
  function palList(q) {
    q = q.trim().toLowerCase();
    const all = [...TABS.map(t => ({ tab: t[0], label: t[1], group: t[3], icon: t[2], kw: PAL_KW[t[0]] || "" })), ...PAL_ACT.map(a => ({ act: a[0], label: a[1], group: "İşlem", icon: a[2], kw: a[3] }))];
    return q ? all.filter(i => (i.label + " " + i.group + " " + i.kw).toLowerCase().includes(q)) : all;
  }
  function palRender() {
    palItems = palList($("#xpi").value || ""); palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    $("#xplist").innerHTML = palItems.length ? palItems.map((it, i) => `<button class="x-pi${i === palSel ? " sel" : ""}" data-pi="${i}"><span class="x-ti">${ic(it.icon)}</span><span>${esc(it.label)}</span><small>${esc(it.group)}</small></button>`).join("") : '<div class="x-pe">Sonuç bulunamadı</div>';
    const s = root.querySelector && root.querySelector(".x-pi.sel"); if (s && s.scrollIntoView) s.scrollIntoView({ block: "nearest" });
  }
  function palOpen() { const el = $("#xpal"); el.hidden = false; $("#xpi").value = ""; palSel = 0; palRender(); void el.offsetWidth; el.classList.add("open"); $("#xpi").focus(); }
  function palClose() { const el = $("#xpal"); el.classList.remove("open"); setTimeout(() => { el.hidden = true; }, 200); }
  function palRun(i) { const it = palItems[i]; if (!it) return; palClose(); if (it.tab) { tab = it.tab; render(); loadTabData(); } else onClick({ target: { closest: () => ({ dataset: { act: it.act } }) } }); }

  function F(label, p, o = {}) {
    const v = get(p), t = o.t || "text", hint = o.hint ? `<small>${o.hint}</small>` : "";
    if (t === "bool") return `<label class="x-sw2"><input type="checkbox" data-p="${p}" data-t="bool" ${v ? "checked" : ""}><i></i><span>${label}</span></label>`;
    if (t === "lines") return `<label>${label}<textarea rows="${o.rows || 5}" data-p="${p}" data-t="lines">${esc((v || []).join("\n"))}</textarea>${hint}</label>`;
    if (t === "area") return `<label>${label}<textarea rows="${o.rows || 3}" data-p="${p}">${esc(v)}</textarea>${hint}</label>`;
    if (t === "sel") return `<label>${label}<select data-p="${p}">${o.opts.map(x => `<option value="${esc(x[0])}" ${String(v ?? "") === String(x[0]) ? "selected" : ""}>${esc(x[1])}</option>`).join("")}</select>${hint}</label>`;
    if (t === "dt") { const d = v ? new Date(v) : null, loc = d && !isNaN(d) ? new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : ""; return `<label>${label}<input type="datetime-local" data-p="${p}" data-t="dt" value="${loc}">${hint}</label>`; }
    const type = t === "num" ? "number" : t === "color" ? "color" : t === "date" ? "date" : "text";
    return `<label>${label}<input type="${type}" data-p="${p}" data-t="${t}" value="${esc(v)}" placeholder="${esc(o.ph || "")}">${o.img ? `<img class="x-prev" src="${esc(v)}" alt="">` : ""}${hint}</label>`;
  }
  // gizli bilgi alanları (ödeme/RCON): taslağa yazılır, Kaydet'te gönderilir
  function S(label, path, o = {}) {
    const [g, k] = path.split("."), cur = SEC?.[g]?.[k], draft = secDraft[g]?.[k];
    if (o.t === "bool") { const v = draft ?? cur ?? false; return `<label class="x-sw2"><input type="checkbox" data-sb="${path}" ${v ? "checked" : ""}><i></i><span>${label}</span></label>`; }
    if (o.plain) return `<label>${label}<input data-s="${path}" value="${esc(draft ?? cur ?? "")}" placeholder="${esc(o.ph || "")}">${o.hint ? `<small>${o.hint}</small>` : ""}</label>`;
    const set_ = cur?.set; const ph = draft ? "Yeni değer yazıldı (Kaydet’e bas)" : set_ ? `${cur.hint} · kayıtlı (değiştirmek için yaz)` : "Girilmedi";
    return `<label>${label}<input type="password" data-s="${path}" autocomplete="new-password" placeholder="${esc(ph)}">${o.hint ? `<small>${o.hint}</small>` : ""}</label>`;
  }
  const SEG = (label, p, opts) => `<div class="x-seg"><span>${label}</span><div>${opts.map(o => `<button class="${(get(p) ?? opts[0][0]) === o[0] ? "on" : ""}" data-act="seg:${p}:${o[0]}">${o[1]}</button>`).join("")}</div></div>`;
  const item = (arr, i, title, inner) => {
    const n = added && added[0] === arr && added[1] === i;
    return `<div class="x-item${n ? " x-new" : ""}"><div class="x-ih"><b>${esc(title)}</b><span><button data-act="up:${arr}:${i}">↑</button><button data-act="dn:${arr}:${i}">↓</button><button class="del" data-act="del:${arr}:${i}">Sil</button></span></div>${inner}</div>`;
  };
  const G = (...a) => `<div class="x-g">${a.join("")}</div>`;
  const chip = (ok, a, b) => `<span class="x-chip ${ok ? "ok" : "no"}">${ok ? a : b}</span>`;
  const when = d => d ? new Date(d).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "";

  /* ---------- görünümler ---------- */
  const VIEWS = {
    ozet: () => `<div class="x-hero"><div><div class="x-hello">Merhaba, ${esc(me)} 👋</div><div class="x-sub">${new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</div></div>
      <div class="x-live"><div class="x-dot" id="xdot"></div><div><div class="x-cap">Şu an çevrimiçi</div><div class="x-big" id="xbig">–</div><div class="x-cap" id="xsrc">Veri alınıyor…</div></div></div></div>
      <div id="xwarn"></div><div class="x-kpis" id="xdash">${[0, 1, 2, 3].map(() => '<div class="x-kpi"><div class="x-skel" style="margin:0;flex:1;height:44px"></div></div>').join("")}</div>
      <div class="x-cols"><div class="x-card"><h3>Oyuncu sayısı</h3><div class="x-hint">Son 24 saat</div><div id="xpl">${SK(2)}</div></div>
      <div class="x-card"><h3>Gelir</h3><div class="x-hint">Son 7 gün</div><div class="x-chart" id="xchart"></div></div></div>
      <div class="x-cols"><div class="x-card"><div class="x-ih"><h3>Kurulum</h3><span class="x-pill" id="xring"></span></div><div id="xcheck">${SK(4)}</div></div>
      <div class="x-card"><div class="x-ih"><h3>Son siparişler</h3><button class="x-btn x-ghost x-sm" data-act="tab:siparis">Tümü →</button></div><div id="xrecent">${SK(3)}</div></div></div>`,
    siparis: () => `<div class="x-tool"><input id="xq" placeholder="Ara: kod, SteamID, e-posta, ürün…" value="${esc(ordQ)}"><button class="x-btn x-ghost" data-act="ordload">↻ Yenile</button><button class="x-btn x-ghost" data-act="csv">⬇ CSV</button></div>
      <div class="x-seg"><div>${[["open", "Açık"], ["pending", "Bekleyen"], ["paid", "Ödendi"], ["delivered", "Teslim"], ["all", "Hepsi"]].map(o => `<button class="${ordFilter === o[0] ? "on" : ""}" data-act="of:${o[0]}">${o[1]}</button>`).join("")}</div></div>
      <div id="xorders">${ordersHtml()}</div>`,
    urunler: () => `<div class="x-ih"><p class="x-hint" style="margin:0">Mağazadaki ürünler. Ödeme alınınca RCON komutları sunucuda otomatik çalışır.</p><button class="x-btn" data-act="add:vip">+ Ürün</button></div>
      ${D.vip.map((v, i) => item("vip", i, v.name || "Ürün", `${G(F("Ürün adı", `vip.${i}.name`), F("Fiyat (" + (D.payments?.symbol || "₺") + ")", `vip.${i}.amount`, { t: "num" }), F("Süre", `vip.${i}.period`))}
        ${F("Ürün görseli / logosu (URL)", `vip.${i}.image`, { img: 1, ph: "https://.../urun.png" })}
        ${G(F("Bağlı kit (içeriği sitede görünür)", `vip.${i}.kitId`, { t: "sel", opts: [["", "— Yok —"], ...D.kits.map(k => [k.id, k.name])] }), F("Harici satın alma linki", `vip.${i}.url`, { ph: "https://… (ödeme sistemi kapalıyken)" }))}
        ${F("Özellikler", `vip.${i}.features`, { t: "lines", hint: "Her satıra bir özellik." })}
        ${F("Teslimat komutları (RCON)", `vip.${i}.rcon`, { t: "area", rows: 4, hint: "Ödeme sonrası sunucuda çalışır, her satır bir komut. <code>{steamid}</code> oyuncunun SteamID’si. Örn: <code>oxide.usergroup add {steamid} vip</code>" })}
        ${F("“En popüler” olarak vurgula", `vip.${i}.hot`, { t: "bool" })}<div class="x-note">Ürün kodu: <code>${esc(v.id)}</code></div>`)).join("") || '<div class="x-card">Henüz ürün yok. Mağaza bölümü sitede gizlenir.</div>'}`,
    kitler: () => `<div class="x-ih"><p class="x-hint" style="margin:0">Sitede kitlere tıklayınca içindeki eşyalar görünür. İkonlar rustlabs.com’dan <b>shortname</b> ile otomatik gelir (örn. <code>rifle.ak</code>).</p><button class="x-btn" data-act="add:kits">+ Kit</button></div>
      ${D.kits.map((k, i) => item("kits", i, (k.icon || "") + " " + k.name, `${G(F("İkon (emoji)", `kits.${i}.icon`), F("Kit adı", `kits.${i}.name`), F("Bekleme süresi", `kits.${i}.cooldown`, { ph: "24 saatte 1 kez" }))}${F("Açıklama", `kits.${i}.description`, { t: "area", rows: 2 })}
        <div class="x-cap" style="margin:4px 0 8px"><b>Eşyalar</b> (ad · adet · shortname · isteğe bağlı görsel URL — görsel yoksa shortname’den otomatik gelir)</div>
        ${(k.items || []).map((it, j) => `<div class="x-row">${F("Ad", `kits.${i}.items.${j}.name`)}${F("Adet", `kits.${i}.items.${j}.amount`, { t: "num" })}${F("Shortname", `kits.${i}.items.${j}.shortname`, { ph: "rifle.ak" })}${F("Görsel URL (ops.)", `kits.${i}.items.${j}.image`, { ph: "https://…" })}<button class="x-btn x-ghost x-sm" data-act="deli:${i}:${j}">✕</button></div>`).join("")}
        <button class="x-btn x-ghost x-sm" data-act="addi:${i}">+ Eşya ekle</button>`)).join("") || '<div class="x-card">Henüz kit yok. Kitler bölümü sitede gizlenir.</div>'}`,
    odeme: () => {
      const pm = D.payments.methods, s = SEC;
      const origin = location.origin, ready = { paytr: s?.paytr.merchantId.set && s.paytr.merchantKey.set && s.paytr.merchantSalt.set, stripe: s?.stripe.secretKey.set && s.stripe.webhookSecret.set };
      const url = (u, id) => `<div class="x-url"><code id="${id}">${origin}${u}</code><button class="x-btn x-ghost x-sm" data-act="copy:${id}">Kopyala</button></div>`;
      return `<div class="x-card"><div class="x-ih"><h3>Ödeme Sistemi</h3>${chip(D.payments.enabled !== false && (ready.paytr && pm.paytr.enabled || ready.stripe && pm.stripe.enabled || pm.manual.enabled && pm.manual.details), "Satışa açık", "Kapalı")}</div>
        ${F("Ödeme almayı etkinleştir", "payments.enabled", { t: "bool" })}${G(F("Para birimi kodu", "payments.currency", { ph: "TRY" }), F("Simge", "payments.symbol", { ph: "₺" }))}
        <div class="x-note">Müşteri Steam ID + e-posta girer, yöntemini seçer. Tutar her zaman sunucuda ürün fiyatından hesaplanır.</div></div>
      <div class="x-card"><div class="x-ih"><h3>💳 PayTR (Türkiye kartları)</h3>${chip(ready.paytr, "Hazır", "Bilgi eksik")}</div>${F("PayTR’yi aç", "payments.methods.paytr.enabled", { t: "bool" })}
        ${G(S("Mağaza No (merchant_id)", "paytr.merchantId"), S("Mağaza Parolası (merchant_key)", "paytr.merchantKey"), S("Mağaza Gizli Anahtarı (merchant_salt)", "paytr.merchantSalt"))}${S("Test modu", "paytr.testMode", { t: "bool" })}
        <div class="x-note">PayTR panelinde <b>Bildirim URL</b> olarak şunu gir:</div>${url("/api/pay/paytr", "xu1")}${s?.paytr.env ? '<div class="x-note">Anahtarlar ortam değişkeninden geliyor.</div>' : ""}</div>
      <div class="x-card"><div class="x-ih"><h3>🌐 Stripe</h3>${chip(ready.stripe, "Hazır", "Bilgi eksik")}</div>${F("Stripe’ı aç", "payments.methods.stripe.enabled", { t: "bool" })}
        ${G(S("Gizli anahtar (sk_…)", "stripe.secretKey"), S("Webhook sırrı (whsec_…)", "stripe.webhookSecret"))}
        <div class="x-note">Stripe → Webhooks’a şu adresi ekle, olay: <code>checkout.session.completed</code></div>${url("/api/pay/stripe", "xu2")}<div class="x-note">Stripe’ın ülkende ve TRY ile çalıştığından emin ol.</div></div>
      <div class="x-card"><div class="x-ih"><h3>🏦 Havale / EFT / Papara</h3>${chip(pm.manual.enabled && pm.manual.details, "Hazır", "Bilgi eksik")}</div>${F("Manuel ödemeyi aç", "payments.methods.manual.enabled", { t: "bool" })}
        ${F("Başlık", "payments.methods.manual.title")}${F("Ödeme bilgileri (IBAN, ad, Papara no)", "payments.methods.manual.details", { t: "area", rows: 4 })}${F("Not", "payments.methods.manual.note")}
        <div class="x-note">Sipariş kodu ile ödeme yapılır; sen “Siparişler” sekmesinden onaylarsın.</div></div>`;
    },
    duyuru: () => `<div class="x-card"><h3>📢 Duyuru Gönder</h3><p class="x-hint">Oyundaki oyunculara ve/veya sitedeki ziyaretçilere anında duyuru gider. Süre dolunca kendiliğinden kalkar.</p>
      <label>Mesaj<textarea id="xat" rows="3" maxlength="180" placeholder="Örn: Sunucu 5 dakika içinde yeniden başlayacak!">${esc(ANN.text)}</textarea><small><span id="xcnt">${ANN.text.length}</span>/180</small></label>
      <div class="x-chips">${["Sunucu 5 dakika içinde yeniden başlayacak!", "Wipe başladı, iyi oyunlar!", "Yeni etkinlik için Discord’a gel!", "Bakım nedeniyle kısa süre kesinti olabilir."].map(t => `<button data-act="tpl:${esc(t)}">${esc(t)}</button>`).join("")}</div>
      ${G(`<label>Kalma süresi (sn)<input id="xas" type="number" min="3" max="60" value="${ANN.seconds}"></label>`, `<div>${F("Oyun içine gönder", "__g", { t: "bool" }).replace('data-p="__g" data-t="bool" ', 'data-an="game" ' + (ANN.game ? "checked" : ""))}${F("Sitede göster", "__s", { t: "bool" }).replace('data-p="__s" data-t="bool" ', 'data-an="site" ' + (ANN.site ? "checked" : ""))}</div>`)}
      <div class="x-seg"><span>Oyun içi gösterim</span><div><button class="${ANN.mode === "ui" ? "on" : ""}" data-act="anmode:ui">✨ Kayan ekran (eklenti)</button><button class="${ANN.mode === "chat" ? "on" : ""}" data-act="anmode:chat">💬 Sohbet mesajı</button></div></div>
      <div class="x-note">“Kayan ekran” için sunucuya <code>rust-plugin/SiteAnnounce.cs</code> dosyasını <code>oxide/plugins</code> klasörüne koy. Eklenti yoksa “Sohbet mesajı”nı seç. Her ikisi için Sunucu sekmesinde RCON ayarlı olmalı.</div>
      <button class="x-btn x-send" data-act="announce" id="xsend">📢 Duyuruyu Gönder</button><div class="x-res" id="xanres"></div></div>
      <div class="x-card"><div class="x-ih"><h3>Gönderilenler</h3><button class="x-btn x-ghost x-sm" data-act="anload">↻</button></div><div id="xanh">${SK(3)}</div></div>`,
    sunucu: () => {
      const S_ = D.server, src = S_.liveSource || "manual", gport = +((String(S_.ip).split(":")[1]) || 28015);
      return `<div class="x-card"><div class="x-ih"><h3>🔗 Sunucu Bağlantısı</h3>${chip(!!S_.ip && src !== "manual" && LIVE?.data && LIVE.data.status !== "offline", "Bağlı ✓", S_.ip ? "Bağlı değil / test et" : "Sunucu eklenmedi")}</div>
      <p class="x-hint">Sunucunun <b>IP:port</b> adresini yaz ve <b>Bağlan</b>’a bas. Site oyuncu sayısını ve durumu doğrudan oyun sunucusundan alır (Steam sorgusu); sorgu portunu otomatik bulur, sunucu adını ve slotu doldurur.</p>
      ${F("Sunucu IP:port", "server.ip", { ph: "1.2.3.4:28015", hint: "Oyuncuların bağlandığı adres. Oyun portu genelde 28015." })}
      <button class="x-btn" data-act="srvconnect">🔌 Bağlan ve Test Et</button><div class="x-res" id="xsrv"></div><div id="xlivebox"></div></div>
      <div class="x-card"><h3>Sunucu Bilgisi</h3>
      ${G(F("Sunucu adı", "server.name"), F("Bölge", "server.region"), F("Wipe zamanı (yazı)", "server.wipe", { ph: "Her Perşembe 20:00" }), F("Grup limiti", "server.group"))}
      ${F("Sonraki wipe tarihi (geri sayım)", "server.nextWipe", { t: "dt", hint: "Seçersen sitede animasyonlu geri sayım çıkar. Boşsa gizlenir." })}
      ${F("Açıklama", "server.description", { t: "area" })}${F("Özellikler", "server.features", { t: "lines", hint: "Her satıra bir özellik." })}</div>
      <div class="x-card"><h3>Gelişmiş Bağlantı</h3>
      ${SEG("Veri kaynağı", "server.liveSource", [["query", "📡 Sunucu sorgusu"], ["battlemetrics", "BattleMetrics"], ["manual", "✍️ Elle"]])}
      ${src === "query" ? F("Sorgu portu", "server.queryPort", { ph: "boş = otomatik (" + gport + ", " + (gport + 1) + ", " + (gport + 2) + ")", hint: "Boş bırakırsan otomatik bulunur. UDP olarak açık olmalı." }) : ""}
      ${src === "battlemetrics" ? F("BattleMetrics sunucu ID’si", "server.battlemetricsId", { ph: "12345678", hint: "battlemetrics.com/servers/rust/<b>12345678</b> adresindeki sayı." }) : ""}
      ${src === "manual" ? `<div class="x-note" style="margin-bottom:10px">Elle girilen değerler sitede olduğu gibi görünür.</div>${G(F("Çevrimiçi oyuncu", "server.online", { t: "num" }), F("Toplam slot", "server.max", { t: "num" }))}` : ""}</div>
      <div class="x-card"><div class="x-ih"><h3>🔌 RCON Bağlantısı</h3>${chip(SEC?.rcon.password.set, "Ayarlı", "Eksik")}</div><p class="x-hint">Duyuru ve otomatik ürün teslimi için. Sunucuda <code>+rcon.web 1 +rcon.port 28016 +rcon.password ŞİFRE</code> açık olmalı; RCON portu bu sitenin çalıştığı yerden erişilebilir olmalı.</p>
      ${G(S("RCON adresi", "rcon.host", { plain: true, ph: "boşsa sunucu IP’si" }), S("RCON portu", "rcon.port", { plain: true, ph: "28016" }))}${S("RCON şifresi", "rcon.password")}${S("TLS (wss) kullan", "rcon.secure", { t: "bool" })}
      <button class="x-btn" data-act="rcontest">⚡ RCON’u Test Et</button><div class="x-res" id="xrcon"></div></div>
      <div class="x-card"><h3>“Bağlan” Butonu</h3>
      ${F("Buton yazısı", "server.connectLabel", { ph: "Şimdi Bağlan" })}
      ${F("Özel bağlantı (isteğe bağlı)", "server.connectUrl", { ph: "steam://connect/1.2.3.4:28015", hint: "Boşsa IP’den otomatik <code>steam://connect/…</code> oluşturulur." })}</div>`;
    },
    bildirim: () => `<div class="x-card"><h3>🔔 Discord Webhook Bildirimleri</h3><p class="x-hint">Discord’da kanal ayarları → Entegrasyonlar → Webhooklar → Yeni Webhook → “Webhook URL’sini kopyala”. Adres kasada saklanır, geri gösterilmez.</p>
      ${S("Sipariş kanalı webhook adresi", "webhooks.orders", { hint: "Yeni sipariş, ödeme alındı, teslim edildi bildirimleri buraya düşer." })}<div class="x-tool"><button class="x-btn x-ghost x-sm" data-act="whtest:orders">⚡ Test gönder</button><button class="x-btn x-ghost x-sm" data-act="whclear:orders">Temizle</button><span class="x-res" id="xwh_orders" style="margin:0"></span></div>
      ${S("Duyuru kanalı webhook adresi", "webhooks.announce", { hint: "Panelden gönderdiğin duyurular buraya da yansır." })}<div class="x-tool"><button class="x-btn x-ghost x-sm" data-act="whtest:announce">⚡ Test gönder</button><button class="x-btn x-ghost x-sm" data-act="whclear:announce">Temizle</button><span class="x-res" id="xwh_announce" style="margin:0"></span></div></div>
      <div class="x-card"><h3>Hangi olaylar bildirilsin?</h3>${F("🛒 Yeni sipariş", "notify.orderNew", { t: "bool" })}${F("💰 Ödeme alındı", "notify.orderPaid", { t: "bool" })}${F("📦 Sunucuya teslim edildi", "notify.delivered", { t: "bool" })}${F("⚠️ Teslimat başarısız", "notify.deliverFailed", { t: "bool" })}${F("📢 Duyuru gönderildi", "notify.announce", { t: "bool" })}
      <div class="x-note">E-posta adresi gibi kişisel bilgiler Discord’a gönderilmez; yalnızca sipariş kodu, ürün, tutar ve Steam ID.</div></div>`,
    genel: () => `<div class="x-card"><h3>Site Kimliği</h3><p class="x-hint">Adı, logoyu ve genel metinleri buradan değiştir.</p>
      ${G(F("Site adı", "brand"), F("Alt başlık", "heroSubtitle"))}
      ${F("Logo URL’si", "logoUrl", { img: 1, ph: "https://.../logo.png", hint: "Boşsa varsayılan simge görünür." })}
      ${F("Ana ekran açıklaması", "tagline", { t: "area" })}${F("Alt bilgi notu", "footerNote")}</div>`,
    baglanti: () => `<div class="x-card"><h3>Discord</h3><p class="x-hint">Menüdeki ve alttaki “Discord’a Katıl” butonları bu linki kullanır.</p>
      ${F("Discord davet linki", "discord", { ph: "https://discord.gg/xxxxxxx" })}${F("Üye sayısını sitede göster", "showDiscordStats", { t: "bool" })}
      <button class="x-btn x-ghost" data-act="dsctest">Linki Test Et</button><div class="x-res" id="xdsc"></div></div>
      <div class="x-card"><h3>Mağaza</h3>${F("Ödeme sistemi kapalıyken kullanılacak link", "storeLink", { ph: "https://..." })}</div>
      <div class="x-ih"><div><h3>Sosyal Medya</h3><p class="x-hint" style="margin:0">Sitenin altında simge olarak görünür. Platformu otomatik tanır (YouTube, Instagram, TikTok, X, Twitch, Kick, Steam, Facebook, Telegram, WhatsApp, GitHub, Reddit, Spotify…).</p></div><button class="x-btn" data-act="add:socials">+ Ekle</button></div>
      ${D.socials.map((s, i) => item("socials", i, s.name || window.ICONS[window.iconFor(s)].label, `<div style="display:flex;gap:10px;align-items:flex-end"><span class="x-ico" style="margin-bottom:12px">${window.iconSvg(window.iconFor(s))}</span><div style="flex:1">${G(F("Platform", `socials.${i}.platform`, { t: "sel", opts: [["auto", "Otomatik tanı"], ...Object.entries(window.ICONS).map(([k, v]) => [k, v.label])] }), F("Görünen ad (isteğe bağlı)", `socials.${i}.name`))}</div></div>${F("Bağlantı (URL)", `socials.${i}.url`, { ph: "https://..." })}`)).join("") || '<div class="x-card x-hint">Henüz yok. Eklediğin hesaplar sitenin altında görünür.</div>'}`,
    haberler: () => `<div class="x-ih"><p class="x-hint" style="margin:0">Sitede “Haberler” bölümünde görünür (en yeni üstte). Hiç haber yoksa bölüm gizlenir.</p><button class="x-btn" data-act="add:news">+ Haber</button></div>
      ${D.news.map((n, i) => item("news", i, n.title || "Haber", `${G(F("Başlık", `news.${i}.title`), F("Tarih", `news.${i}.date`, { t: "date" }))}${F("Metin", `news.${i}.text`, { t: "area", rows: 4 })}`)).join("") || '<div class="x-card x-hint">Henüz haber yok.</div>'}`,
    icerik: () => `<div class="x-ih"><h3>Kurallar</h3><button class="x-btn" data-act="add:rules">+ Kural</button></div>
      ${D.rules.map((r, i) => item("rules", i, r.title, `${G(F("İkon (emoji)", `rules.${i}.icon`), F("Başlık", `rules.${i}.title`))}${F("Metin", `rules.${i}.text`, { t: "area" })}`)).join("")}
      <div class="x-ih" style="margin-top:22px"><h3>Sık Sorulan Sorular</h3><button class="x-btn" data-act="add:faq">+ Soru</button></div>
      ${D.faq.map((f, i) => item("faq", i, f.q, `${F("Soru", `faq.${i}.q`)}${F("Cevap", `faq.${i}.a`, { t: "area" })}`)).join("")}`,
    gorunum: () => `<div class="x-card"><h3>Tema</h3>
      ${SEG("Stil", "themeStyle", [["color", "🎨 Renkli"], ["mono", "⬛ Siyah-Beyaz"]])}${SEG("Mod", "themeMode", [["auto", "🖥️ Otomatik"], ["light", "☀️ Açık"], ["dark", "🌙 Koyu"]])}</div>
      ${D.themeStyle === "mono" ? '<div class="x-card x-hint">Siyah-beyaz modda renk seçimi kapalıdır; video ve görseller de siyah-beyaz görünür.</div>' : `<div class="x-card"><h3>Vurgu Rengi</h3><div class="x-sws">${["#e5533a", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map(c => `<button style="background:${c}" data-act="color:${c}"></button>`).join("")}</div>${F("Özel renk", "accent", { t: "color" })}</div>`}
      <div class="x-card"><h3>Ana Ekran Videosu</h3><p class="x-hint">Yerel dosya (assets/hero.mp4) veya doğrudan .mp4 URL’si.</p>${F("Video URL’si", "videoUrl", { ph: "assets/hero.mp4" })}${F("Önizleme görseli URL’si", "posterUrl", { img: 1, ph: "assets/poster.jpg" })}</div>`,
    sistem: () => `<div class="x-card"><h3>Sistem Durumu</h3><div id="xsys">${SK(3)}</div></div>
      <div class="x-card"><h3>Domain</h3><div class="x-g">${F("Domain", "domain.name", { ph: "siteadi.com" })}${F("Sunucu IP adresi", "domain.serverIp", { ph: "1.2.3.4" })}</div>
      <button class="x-btn" data-act="dns">DNS’i Kontrol Et</button><div class="x-res" id="xdns"></div><div id="xdom"></div></div>
      <div class="x-card"><h3>GitHub’dan yayına alma</h3><ol><li>Kodu GitHub’a yükle (<code>.env</code> ve <code>data/</code> yüklenmez).</li><li>Render / Railway gibi bir yerde <b>New → Web Service</b> seç, repoyu bağla (Render için <code>render.yaml</code> hazır).</li><li>Aynı yerde bir <b>PostgreSQL</b> aç, <code>DATABASE_URL</code> otomatik bağlanır.</li><li>Ortam değişkenleri: <code>ADMIN_PASSWORD</code> (sabit şifre), <code>PUBLIC_URL</code> (https://siteadin.com), <code>TRUST_PROXY=1</code>.</li><li>Platformun <b>Custom Domain</b> bölümünden domainini ekle, DNS kaydını yukarıdaki araçla kontrol et.</li></ol>
      <div class="x-note">GitHub Pages yalnızca statik siteleri çalıştırır; bu site Node.js ve veritabanı gerektirdiği için orada çalışmaz.</div></div>`,
    yedek: () => `<div class="x-card"><h3>Site Ayarı Yedekleri</h3><p class="x-hint">Her kayıtta önceki hali saklanır (son 30). Geri yüklemek mevcut ayarların yerine geçer.</p><div id="xhist">${SK(3)}</div></div>`,
    guvenlik: () => {
      const dc = SEC?.discord, origin = location.origin, linked = dc?.admins || [];
      return `<div class="x-card"><h3>Hesap</h3><p class="x-hint">Kullanıcı adını ve şifreni buradan değiştirebilirsin. Değişiklik kalıcıdır; <code>.env</code> dosyasındaki şifreyi değiştirirsen o yeniden geçerli olur.</p>
      ${G(`<label>Kullanıcı adı<input id="xpu" value="${esc(me)}" autocomplete="username"></label>`, '<label>Mevcut şifre (zorunlu)<input id="xpw0" type="password" autocomplete="current-password"></label>')}
      ${G('<label>Yeni şifre (en az 8, boşsa değişmez)<input id="xpw1" type="password" autocomplete="new-password"></label>', '<label>Yeni şifre tekrar<input id="xpw2" type="password" autocomplete="new-password"></label>')}
      <button class="x-btn" data-act="pw">Kaydet</button></div>
      <div class="x-card"><div class="x-ih"><h3>🎮 Discord ile Giriş</h3>${chip(dc?.configured && linked.length, "Aktif", dc?.configured ? "Hesap bağlanmadı" : "Kurulmadı")}</div>
      <p class="x-hint">Giriş penceresinde “Discord ile giriş” butonu çıkar; Discord’a yönlendirir, hesabın bağlıysa yönetim paneli açılır.</p>
      <ol class="x-hint"><li><a href="https://discord.com/developers/applications" target="_blank" rel="noopener" style="color:var(--a2)">Discord Developer Portal</a> → New Application → OAuth2.</li><li><b>Redirects</b> bölümüne şu adresi ekle:</li></ol>
      <div class="x-url"><code id="xrd">${esc(origin)}/api/auth/discord/callback</code><button class="x-btn x-ghost x-sm" data-act="copy:xrd">Kopyala</button></div>
      <ol class="x-hint" start="3"><li>Client ID ve Client Secret’ı aşağıya yaz, kaydet.</li><li><b>“Discord hesabımı bağla”</b>ya bas; Discord hesabını yetkilendirmeni ister, sonra o hesap yönetici olur.</li></ol>
      ${G(S("Uygulama (Client) ID", "discord.clientId", { plain: true, ph: "123456789012345678" }), S("Client Secret", "discord.clientSecret"))}
      <button class="x-btn" data-act="dlink">🔗 Discord hesabımı bağla</button>
      <h4>Bağlı yönetici hesapları</h4>${linked.map(a => `<div class="x-hist"><span>🎮 <b>${esc(a.name)}</b><br><small>${esc(a.id)}</small></span>${a.env ? "<small>ortam değişkeni</small>" : `<button class="x-btn x-ghost x-sm" data-act="dunlink:${esc(a.id)}">Kaldır</button>`}</div>`).join("") || '<div class="x-note">Henüz bağlı hesap yok.</div>'}</div>
      <div class="x-card"><h3>Oturum</h3><p class="x-hint">Oturum 12 saat sonra kapanır. 5 hatalı girişte 5 dakika kilitlenir.</p><button class="x-btn x-ghost" data-act="logout">Çıkış Yap</button></div>`;
    }
  };

  /* ---------- siparişler ---------- */
  function ordersHtml() {
    if (!ORD) return SK(4);
    const q = ordQ.toLowerCase(), list = ORD.orders.filter(o => (ordFilter === "all" || (ordFilter === "open" ? ["pending", "paid"].includes(o.status) : o.status === ordFilter)) && (!q || [o.id, o.steamId, o.email, o.productName].join(" ").toLowerCase().includes(q)));
    if (!list.length) return '<div class="x-card x-hint">Bu filtrede sipariş yok.</div>';
    return list.map(o => `<div class="x-ord s-${o.status}"><div class="x-ord-h"><b>${esc(o.id)}</b><span class="x-pill ${o.status}">${ST[o.status] || o.status}</span><small>${when(o.createdAt)}</small></div>
      <div class="x-ord-b"><div><b>${esc(o.productName)}</b> · ${money(o.amount)} · ${MT[o.method] || o.method}</div><div>Steam: <code>${esc(o.steamId)}</code> <button class="x-btn x-ghost x-sm" data-act="cp:${esc(o.steamId)}">kopyala</button></div><div>${esc(o.email)}</div>${o.note ? `<div class="${/başarısız|DİKKAT/i.test(o.note) ? "bad" : "ok"}">${esc(o.note)}</div>` : ""}</div>
      <div class="x-ord-a">${o.status === "pending" ? `<button class="x-btn x-sm" data-act="ord:${o.id}:paid">✓ Ödendi say</button><button class="x-btn x-ghost x-sm" data-act="ord:${o.id}:cancelled">İptal</button>` : ""}
      ${o.status === "paid" ? `<button class="x-btn x-sm" data-act="deliver:${o.id}">🚀 Sunucuya teslim et</button><button class="x-btn x-ghost x-sm" data-act="ord:${o.id}:delivered">Elle teslim edildi</button><button class="x-btn x-ghost x-sm" data-act="ord:${o.id}:cancelled">İptal</button>` : ""}
      ${o.status === "failed" || o.status === "cancelled" ? `<button class="x-btn x-ghost x-sm" data-act="ord:${o.id}:pending">Bekleyene al</button>` : ""}</div></div>`).join("");
  }
  async function loadOrders() {
    try {
      ORD = await api("/api/admin/orders"); const n = ORD.stats.pending + ORD.stats.toDeliver; const b = $("#xbadge"); if (b) { b.textContent = n; b.hidden = !n; }
      if (tab === "siparis" && $("#xorders")) $("#xorders").innerHTML = ordersHtml(); if (tab === "ozet") fillDash();
    } catch (_) {}
  }
  function fillDash() {
    if (!$("#xdash") || !ORD) return; const s = ORD.stats, mx = Math.max(1, ...s.byDay.map(b => b.sum));
    $("#xdash").innerHTML = [["wallet", money(s.revenue), "Toplam gelir", ""], ["check", s.paidCount, "Ödenen sipariş", "ok"], ["box", s.toDeliver, "Teslim bekleyen", s.toDeliver ? "warn" : "info"], ["clock", s.pending, "Ödeme bekleyen", s.pending ? "warn" : "info"]].map(x => `<div class="x-kpi"><div class="x-kic ${x[3]}">${ic(x[0])}</div><div><b>${x[1]}</b><small>${x[2]}</small></div></div>`).join("");
    $("#xchart").innerHTML = s.byDay.map(b => `<div class="x-bar"><em>${b.sum ? money(b.sum) : ""}</em><i data-h="${Math.round(b.sum / mx * 100)}"></i><small>${b.d.slice(5)}</small></div>`).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll("#xchart .x-bar i").forEach(i => i.style.height = i.dataset.h + "%")));
    $("#xrecent").innerHTML = ORD.orders.slice(0, 5).map(o => `<div class="x-hist"><span><b>${esc(o.productName)}</b> · ${money(o.amount)}<br><small>${esc(o.steamId)} · ${when(o.createdAt)}</small></span><span class="x-pill ${o.status}">${ST[o.status]}</span></div>`).join("") || "Henüz sipariş yok.";
  }
  function fillCheck() {
    const el = $("#xcheck"); if (!el || !SEC) return; const pm = D.payments.methods;
    const payOk = D.payments.enabled !== false && ((pm.paytr.enabled && SEC.paytr.merchantId.set && SEC.paytr.merchantKey.set && SEC.paytr.merchantSalt.set) || (pm.stripe.enabled && SEC.stripe.secretKey.set && SEC.stripe.webhookSecret.set) || (pm.manual.enabled && pm.manual.details));
    const live = !!D.server.ip && LIVE?.data && LIVE.data.status !== "offline" && LIVE.src !== "manual";
    const items = [[live, "Sunucu bağlı (canlı oyuncu sayısı)", "sunucu"], [SEC.rcon.password.set, "RCON (duyuru + otomatik teslimat)", "sunucu"], [payOk, "Ödeme yöntemi açık", "odeme"], [SEC.webhooks.orders.set, "Discord webhook bildirimi", "bildirim"], [SEC.discord.configured && SEC.discord.admins.length > 0, "Discord ile giriş", "guvenlik"], [!!D.logoUrl, "Logo eklendi", "genel"], [!!D.discord && D.discord !== "#", "Discord linki", "baglanti"]];
    const done = items.filter(i => i[0]).length, pct = Math.round(done / items.length * 100);
    $("#xring").textContent = done + "/" + items.length;
    el.innerHTML = `<div class="x-meter"><i data-w="${pct}"></i></div>` + items.map(i => `<div class="x-hist"><span>${i[0] ? "✅" : "⬜"} ${i[1]}</span>${i[0] ? "" : `<button class="x-btn x-ghost x-sm" data-act="tab:${i[2]}">Ayarla →</button>`}</div>`).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => { const m = $("#xcheck .x-meter i"); if (m) m.style.width = m.dataset.w + "%"; }));
    const w = $("#xwarn"); if (w) w.innerHTML = SYS?.ephemeral ? '<div class="x-info bad">⚠ <b>Ayarların kaybolabilir:</b> Bu platformda dosya diski geçicidir ve veritabanı bağlı değil. Yeniden başlatınca yaptığın değişiklikler silinir. Bir PostgreSQL oluşturup <code>DATABASE_URL</code> ver.</div>' : "";
  }
  async function loadPlayers() {
    try {
      const d = await api("/api/stats"), el = $("#xpl"); if (!el) return; const pts = d.points || [];
      if (pts.length < 2) { el.textContent = "Veri toplanıyor… sunucu bağlıyken 5 dakikada bir ölçülür."; return; }
      const mx = Math.max(1, ...pts.map(x => x[1])), W = 600, H = 120, t0 = pts[0][0], t1 = pts[pts.length - 1][0];
      const line = pts.map((x, i) => (i ? "L" : "M") + (6 + (x[0] - t0) / Math.max(1, t1 - t0) * (W - 12)).toFixed(1) + " " + (H - 8 - x[1] / mx * (H - 24)).toFixed(1)).join(" ");
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:130px;color:var(--a2)"><path d="${line} L${W - 6} ${H - 8} L6 ${H - 8}Z" fill="currentColor" opacity=".18"/><path d="${line}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg><div class="x-note">Zirve <b>${d.peak}</b> · Ortalama <b>${d.avg}</b> oyuncu</div>`;
    } catch (_) {}
  }
  async function loadLive() {
    try {
      LIVE = await api("/api/admin/live"); if (tab !== "ozet" || !$("#xbig")) return;
      const d = LIVE.data, off = !d || d.status === "offline";
      $("#xdot").classList.toggle("off", !!d && off);
      countUp($("#xbig"), d ? d.online || 0 : D.server.online || 0);
      fillCheck();
      $("#xsrc").textContent = LIVE.src === "manual" ? "Kaynak: elle girilen değer" : off ? "Sunucuya ulaşılamıyor" + (LIVE.err ? " — " + LIVE.err : "") : "Canlı: " + (LIVE.src === "query" ? "sunucu sorgusu" : "BattleMetrics") + (d.name ? " · " + d.name : "");
    } catch (_) {}
  }
  async function loadTabData() {
    if (tab === "ozet") { loadLive(); loadOrders(); loadPlayers(); if (!SYS) { try { SYS = await api("/api/admin/system"); fillCheck(); } catch (_) {} } }
    else if (tab === "siparis") loadOrders();
    else if (["odeme", "sunucu", "bildirim", "guvenlik"].includes(tab)) { try { SEC = await api("/api/admin/secrets"); if (!secDirty && !dirty) render(true, true); if (tab === "sunucu") loadSrvLive(); } catch (_) {} }
    else if (tab === "duyuru") loadAnn();
    else if (tab === "yedek") loadHist();
    else if (tab === "sistem") loadSys();
    else if (tab === "guvenlik" && !SYS) { try { SYS = await api("/api/admin/system"); render(true, true); } catch (_) {} }
  }
  async function loadSrvLive() {
    try {
      LIVE = await api("/api/admin/live"); const el = $("#xlivebox"); if (!el) return; const d = LIVE.data;
      el.innerHTML = LIVE.src === "manual" ? "" : d && d.status !== "offline" ? `<div class="x-stats" style="margin:14px 0 0"><div class="x-st"><b>${esc(d.online)}</b><small>Çevrimiçi</small></div><div class="x-st"><b>${esc(d.max || "—")}</b><small>Slot</small></div><div class="x-st"><b>${esc(d.queue || 0)}</b><small>Sırada</small></div><div class="x-st"><b style="font-size:15px">${esc(d.map || "—")}</b><small>Harita</small></div></div>` : D.server.ip ? `<div class="x-note bad" style="margin-top:12px">Şu an sunucuya ulaşılamıyor${LIVE.err ? ": " + esc(LIVE.err) : ""}</div>` : "";
    } catch (_) {}
  }
  async function loadAnn() { try { ANH = await api("/api/admin/announcements"); const el = $("#xanh"); if (el) el.innerHTML = ANH.slice(0, 15).map(a => `<div class="x-hist"><span>${esc(a.text)}<br><small>${when(a.at)} · ${a.seconds} sn · ${a.mode === "chat" ? "sohbet" : "kayan ekran"} · oyun: ${a.game?.ok ? "✓" : a.game?.skipped ? "–" : "✗ " + esc(a.game?.error || "")} · site: ${a.site ? "✓" : "–"}</small></span><button class="x-btn x-ghost x-sm" data-act="resend:${esc(a.id)}">Tekrar gönder</button></div>`).join("") || "Henüz duyuru gönderilmedi."; } catch (_) {} }
  async function loadHist() { try { HIST = await api("/api/admin/history"); const el = $("#xhist"); if (el) el.innerHTML = HIST.map(h => `<div class="x-hist"><span>${when(h.created)}</span><button class="x-btn x-ghost x-sm" data-act="restore:${h.id}">Geri yükle</button></div>`).join("") || "Henüz yedek yok. İlk kayıttan sonra burada görünür."; } catch (_) {} }
  async function loadSys() {
    try {
      SYS = await api("/api/admin/system"); const el = $("#xsys"); if (!el) return; const e = SYS.env;
      const ck = (SYS.checks || []).map(c => `<div class="x-hist"><span>${c.ok ? "✅" : "⚠️"} <b>${esc(c.t)}</b>${c.ok ? "" : `<br><small>${esc(c.fix)}</small>`}</span></div>`).join("");
      el.innerHTML = `<h4 style="margin:0 0 6px">Yayın hazırlığı</h4>${ck}<h4>Ayrıntılar</h4><table><tr><td>Veritabanı</td><td>${chip(SYS.db === "PostgreSQL", "PostgreSQL ✓", "Dosya (yerel)")} ${SYS.db !== "PostgreSQL" ? '<small class="x-note">Gerçek yayında <code>DATABASE_URL</code> ver.</small>' : ""}</td></tr>
      <tr><td>Otomatik yedek</td><td>${SYS.backups ? SYS.backups + " dosya (data/backups)" : SYS.db === "PostgreSQL" ? "Veritabanı yedeğini sağlayıcından al" : "—"}</td></tr><tr><td>Veri konumu</td><td>${SYS.dataPath ? `<code>${esc(SYS.dataPath)}</code>` : "PostgreSQL"} ${SYS.ephemeral ? chip(false, "", "⚠ geçici disk") : ""}</td></tr><tr><td>Discord girişi / Webhook</td><td>${chip(SYS.discord, "Discord ✓", "Discord –")} ${chip(SYS.hooks, "Webhook ✓", "Webhook –")}</td></tr><tr><td>PUBLIC_URL</td><td>${chip(e.PUBLIC_URL, "Ayarlı", "Yok")}</td></tr><tr><td>TRUST_PROXY</td><td>${chip(e.TRUST_PROXY, "Ayarlı", "Yok")}</td></tr>
      <tr><td>RCON</td><td>${chip(SYS.rcon, "Ayarlı", "Yok")}</td></tr><tr><td>PayTR / Stripe</td><td>${chip(SYS.paytr, "PayTR ✓", "PayTR –")} ${chip(SYS.stripe, "Stripe ✓", "Stripe –")}</td></tr>
      <tr><td>Node / çalışma süresi</td><td>${esc(SYS.node)} · ${Math.round(SYS.uptime / 60)} dk</td></tr><tr><td>Bu adres</td><td><code>${esc(SYS.origin)}</code></td></tr></table>`;
    } catch (_) {}
  }
  function domOut() {
    const el = $("#xdom"); if (!el) return;
    const d = D.domain || {}, n = d.name || "siteadi.com", ip = d.serverIp || "SUNUCU_IP";
    el.innerHTML = `<h4>DNS kayıtları</h4><p class="x-hint">Domain sağlayıcının DNS panelinde (VPS kullanıyorsan):</p><table><tr><th>Tür</th><th>Ad</th><th>Değer</th></tr><tr><td>A</td><td>@</td><td>${esc(ip)}</td></tr><tr><td>A</td><td>www</td><td>${esc(ip)}</td></tr></table>
    <p class="x-hint">Render/Railway gibi yerlerde platformun verdiği CNAME/A kaydını kullan. VPS için Caddyfile:</p><pre id="xcf">${esc(`${n}, www.${n} {\n  reverse_proxy 127.0.0.1:3000\n}`)}</pre><button class="x-btn x-ghost" data-act="copy:xcf">Kopyala</button>`;
  }
  function render(keep, soft) {
    const sc = $("#xview").scrollTop;
    $("#xtabs").innerHTML = GROUPS.map(g => `<div class="x-ng">${g[0]}</div>` + g[1].map(t => `<button class="x-tab${t[0] === tab ? " on" : ""}" data-act="tab:${t[0]}" title="${t[1]}"><span class="x-ti">${ic(t[2])}</span><span class="x-tl">${t[1]}</span>${t[0] === "siparis" ? '<b class="x-badge" id="xbadge" hidden></b>' : ""}</button>`).join("")).join("");
    const cur = TABS.find(t => t[0] === tab); $("#xtitle").textContent = cur[1]; $("#xgroup").textContent = cur[3];
    const act = document.activeElement; const keepFocus = soft && act && act.dataset && (act.dataset.p || act.dataset.s) ? (act.dataset.p || act.dataset.s) : null;
    $("#xview").innerHTML = VIEWS[tab](); added = null; $("#xview").scrollTop = keep ? sc : 0;
    if (ORD) { const n = ORD.stats.pending + ORD.stats.toDeliver, b = $("#xbadge"); if (b) { b.textContent = n; b.hidden = !n; } }
    if (tab === "domain" || tab === "sistem") domOut(); if (tab === "ozet" && ORD) { fillDash(); if (LIVE) loadLive(); }
    if (tab === "ozet" && SEC) fillCheck(); if (tab === "sunucu" && LIVE) loadSrvLive();
    if (tab === "yedek" && HIST) loadHist(); if (tab === "duyuru" && ANH) loadAnn(); if (tab === "sistem" && SYS) loadSys();
    if (keepFocus) { const el = $(`[data-p="${keepFocus}"],[data-s="${keepFocus}"]`); if (el) el.focus(); }
  }

  /* ---------- kurulum ---------- */
  function mount() {
    root = document.createElement("div"); root.id = "pnl"; root.hidden = true;
    root.innerHTML = `<div class="x-back" data-act="close"></div><div class="x-win" role="dialog" aria-modal="true">
      <aside class="x-side"><div class="x-brand"><div class="x-logo">${ic("sliders")}</div><div class="x-bt"><b>Yönetim</b><small>Rust sunucu paneli</small></div></div>
        <button class="x-search" data-act="pal">${ic("search", 16)}<span>Ara…</span><kbd>Ctrl K</kbd></button><nav id="xtabs"></nav>
        <div class="x-userbar"><div class="x-av" id="xav">A</div><div class="x-un"><b id="xuser"></b><small>Yönetici</small></div><div class="x-uacts"><button data-act="theme" title="Tema">${ic("sun")}</button><button data-act="collapse" title="Menüyü daralt">${ic("collapse")}</button><button data-act="logout" title="Çıkış">${ic("logout")}</button></div></div></aside>
      <section class="x-main"><header class="x-top"><div class="x-ttl"><small id="xgroup"></small><h2 id="xtitle"></h2></div>
        <div class="x-acts"><span class="x-status" id="xstat"></span><label class="x-sw2 x-autosw" title="Değişiklikleri kendiliğinden kaydet"><input type="checkbox" id="xauto"><i></i><span>Otomatik</span></label>
        <button class="x-btn x-ghost x-ic" id="xprevbtn" data-act="prevtoggle" title="Canlı önizleme">${ic("eye")}<span>Önizleme</span></button>
        <button class="x-btn x-ic" id="xsave" data-act="save">${ic("save")}<span>Kaydet</span></button><button class="x-btn x-ghost x-ic" data-act="close" title="Kapat (Esc)">${ic("x")}</button></div></header>
      <div class="x-body"><div id="xview"></div><div class="x-prevwrap" id="xprevwrap" hidden><iframe id="xprev" title="Site önizleme"></iframe><small>Canlı önizleme (mobil görünüm)</small></div></div></section>
      <div class="x-pal" id="xpal" hidden><div class="x-pbox"><div class="x-psearch">${ic("search", 18)}<input id="xpi" placeholder="Sayfa veya ayar ara… (ödeme, kit, şifre, webhook)" autocomplete="off"><kbd>Esc</kbd></div><div class="x-plist" id="xplist"></div></div></div>
      <div class="x-conf" id="xconf" hidden></div></div>`;
    lg = document.createElement("div"); lg.id = "plogin"; lg.hidden = true;
    lg.innerHTML = `<form id="xlf"><div class="x-llogo">${ic("lock")}</div><h2>Yönetici Girişi</h2><p>Devam etmek için giriş yap</p><input name="user" placeholder="Kullanıcı adı" autocomplete="username" required><input name="password" type="password" placeholder="Şifre" autocomplete="current-password" required><button class="x-btn" type="submit">Giriş Yap</button><a class="x-btn x-dsc" id="xdl" href="/api/auth/discord/start" hidden>Discord ile giriş yap</a><button class="x-btn x-ghost" type="button" data-act="lclose">Vazgeç</button><div class="x-err" id="xerr"></div></form>`;
    tt = document.createElement("div"); tt.id = "xtoast"; document.body.append(root, lg, tt); applyTheme();

    lg.addEventListener("click", e => { if (e.target === lg || e.target.closest('[data-act="lclose"]')) hideLogin(); });
    $("#xlf").addEventListener("submit", async e => {
      e.preventDefault(); $("#xerr").textContent = "";
      try { await api("/api/login", "POST", { user: e.target.user.value, password: e.target.password.value }); e.target.password.value = ""; open(); }
      catch (er) { $("#xerr").textContent = er.message; e.target.classList.remove("shake"); void e.target.offsetWidth; e.target.classList.add("shake"); }
    });
    root.addEventListener("input", e => {
      const t = e.target;
      if (t.id === "xpi") { palSel = 0; palRender(); return; }
      if (t.id === "xq") { ordQ = t.value; $("#xorders").innerHTML = ordersHtml(); return; }
      if (t.id === "xat") { ANN.text = t.value; $("#xcnt").textContent = t.value.length; return; }
      if (t.id === "xas") { ANN.seconds = Math.min(60, Math.max(3, +t.value || 10)); return; }
      if (t.dataset?.an) { ANN[t.dataset.an] = t.checked; return; }
      if (t.id === "xauto") { auto = t.checked; localStorage.setItem("x_auto", auto ? "1" : "0"); if (auto && (dirty || secDirty)) save(true); stat(); return; }
      if (t.dataset?.s) { const [g, k] = t.dataset.s.split("."); if (t.value === "") { if (secDraft[g]) delete secDraft[g][k]; } else (secDraft[g] ??= {})[k] = t.value; markSec(); return; }
      if (t.dataset?.sb) { const [g, k] = t.dataset.sb.split("."); (secDraft[g] ??= {})[k] = t.checked; markSec(); return; }
      const p = t.dataset?.p; if (!p) return;
      let v = t.value; const ty = t.dataset.t;
      if (ty === "bool") v = t.checked; else if (ty === "num") v = +v; else if (ty === "dt") v = t.value ? new Date(t.value).toISOString() : ""; else if (ty === "lines") v = v.split("\n").map(x => x.trim()).filter(Boolean);
      set(p, v); mark();
      const pi = t.closest("label")?.querySelector(".x-prev"); if (pi) pi.src = v;
      if (p.startsWith("socials.")) { const i = +p.split(".")[1], ico = t.closest(".x-item")?.querySelector(".x-ico"); if (ico) ico.innerHTML = window.iconSvg(window.iconFor(D.socials[i])); }
      if (p === "domain.name" || p === "domain.serverIp") domOut();
      if (p.startsWith("payments.")) { clearTimeout(render.t); render.t = setTimeout(() => render(true, true), 300); }
    });
    root.addEventListener("load", e => { if (e.target.classList?.contains("x-prev")) e.target.style.visibility = "visible"; }, true);
    root.addEventListener("error", e => { if (e.target.classList?.contains("x-prev")) e.target.style.visibility = "hidden"; }, true);
    $("#xprev").addEventListener("load", () => { prevReady = true; preview(); });
    root.addEventListener("click", onClick);
    root.addEventListener("change", e => { const t = e.target; if ((t.dataset?.s || t.dataset?.sb) && auto && secDirty) save(true); });
    document.addEventListener("keydown", e => {
      if (!root || root.hidden) { if (e.key === "Escape" && lg && !lg.hidden) hideLogin(); return; }
      const mod = e.ctrlKey || e.metaKey, k = String(e.key || "").toLowerCase();
      if (mod && k === "k") { e.preventDefault(); if ($("#xpal").hidden) palOpen(); else palClose(); return; }
      if (mod && k === "s") { e.preventDefault(); save(false); return; }
      if (!$("#xconf").hidden) { if (e.key === "Escape" && confirmCancel) confirmCancel(); return; }
      if (!$("#xpal").hidden) {
        if (e.key === "Escape") palClose(); else if (e.key === "ArrowDown") { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); palRender(); } else if (e.key === "ArrowUp") { e.preventDefault(); palSel = Math.max(0, palSel - 1); palRender(); } else if (e.key === "Enter") { e.preventDefault(); palRun(palSel); }
        return;
      }
      if (e.key === "Escape") tryClose();
    });
    addEventListener("beforeunload", e => { if (dirty || secDirty) { e.preventDefault(); e.returnValue = ""; } });
  }
  function showLogin() { fetch("/api/auth/info").then(r => r.json()).then(i => { $("#xdl").hidden = !i.discord; }).catch(() => {}); lg.hidden = false; void lg.offsetWidth; lg.classList.add("open"); setTimeout(() => $("#xlf").user.focus(), 250); }
  function hideLogin() { lg.classList.remove("open"); setTimeout(() => lg.hidden = true, 300); if (location.hash === "#yonetim") history.replaceState(null, "", location.pathname); }
  function showPanel() { root.hidden = false; void root.offsetWidth; root.classList.add("open"); document.body.style.overflow = "hidden"; clearInterval(timer); timer = setInterval(() => { if (!root.hidden) loadOrders(); }, 20000); }
  function hidePanel() { clearInterval(timer); root.classList.remove("open"); document.body.style.overflow = ""; setTimeout(() => root.hidden = true, 450); if (location.hash === "#yonetim") history.replaceState(null, "", location.pathname); }
  async function tryClose() {
    if (auto && (dirty || secDirty)) await save(true);
    if ((dirty || secDirty) && !(await ask("Kaydedilmemiş değişiklikler silinsin mi?", { title: "Kaydedilmemiş değişiklik", ok: "Sil ve çık", cancel: "Geri dön", danger: true }))) return;
    if (dirty || secDirty) { location.reload(); return; }
    hidePanel(); if (changed) setTimeout(() => location.reload(), 480);
  }

  async function save(quiet) {
    if (saving) { clearTimeout(saveT); saveT = setTimeout(() => save(quiet), 600); return; }
    const btn = $("#xsave"); saving = true; btn.disabled = true; stat(); let secErr = null;
    try {
      if (secDirty) {
        try { SEC = await api("/api/admin/secrets", "PUT", secDraft); secDraft = {}; secDirty = false; }
        catch (e) {
          if (e.status !== 400) throw e;   // geçersiz değer: o alanı at, site ayarlarını yine de kaydet
          secErr = e; const [g, k] = String(e.field || "").split("."); if (g && k && secDraft[g]) delete secDraft[g][k]; else secDraft = {};
          secDirty = Object.values(secDraft).some(o => o && Object.keys(o).length > 0); toast(e.message, 1);
        }
      }
      if (dirty || !quiet) { const before = JSON.stringify(D); const r = await api("/api/admin/data" + (forceSave ? "?force=1" : ""), "PUT", D); forceSave = false; (r.vip || []).forEach((id, i) => { if (D.vip[i]) D.vip[i].id = id; }); D._rev = r.rev; rev = r.rev; dirty = JSON.stringify(D) !== before; }
      changed = true; lastSave = new Date(); btn.classList.remove("x-dirty");
      if (secErr) render(true, true);
      else if (!quiet) { toast("Kaydedildi ✓"); if (["odeme", "sunucu", "urunler", "bildirim", "guvenlik"].includes(tab)) render(true, true); }
    } catch (e) {
      if (e.status === 409) {
        clearTimeout(saveT);
        if (await ask("Bu ayarlar başka bir pencerede veya cihazda daha yeni kaydedilmiş.\n\n“Güncel hali yükle”: sunucudaki son hali getirir (buradaki kaydedilmemiş değişiklikler silinir).\n“Benimkini kaydet”: bu penceredekini üzerine yazar.", { title: "Kayıt çakışması", ok: "Güncel hali yükle", cancel: "Benimkini kaydet" })) { dirty = secDirty = false; location.reload(); return; }
        forceSave = true; saving = false; btn.disabled = false; return save(quiet);
      }
      toast(e.message, 1); if (e.status === 401) open();
    }
    saving = false; btn.disabled = false; stat();
  }
  const doApi = async (btnRes, fn) => { try { await fn(); } catch (er) { toast(er.message, 1); if (btnRes) btnRes.innerHTML = `<span class="bad">${esc(er.message)}</span>`; } };
  async function sendAnnounce(text, secs) {
    const btn = $("#xsend"), r = $("#xanres"); if (btn) btn.classList.add("busy");
    try {
      const j = await api("/api/admin/announce", "POST", { text, seconds: secs, game: ANN.game, site: ANN.site, mode: ANN.mode });
      const g = j.game; toast(g.ok ? "Duyuru oyuna gönderildi ✓" : g.skipped ? "Duyuru sitede yayında ✓" : "Siteye gitti, oyuna gitmedi", !g.ok && !g.skipped);
      if (r) r.innerHTML = g.ok ? '<span class="ok">✓ Oyuna gönderildi' + (ANN.site ? ", sitede de gösteriliyor." : ".") + "</span>" : g.skipped ? '<span class="ok">✓ Sitede gösteriliyor.</span>' : `<span class="bad">✗ Oyuna gönderilemedi: ${esc(g.error)}</span>`;
      if (r && ANN.site) r.insertAdjacentHTML("beforeend", `<div class="x-prog"><i style="animation:xshrink ${secs}s linear forwards"></i></div>`);
      loadAnn();
    } catch (er) { toast(er.message, 1); if (r) r.innerHTML = `<span class="bad">${esc(er.message)}</span>`; }
    if (btn) btn.classList.remove("busy");
  }
  async function onClick(e) {
    const pi = e.target.closest("[data-pi]"); if (pi && pi.dataset && pi.dataset.pi !== undefined) { palRun(+pi.dataset.pi); return; }
    if (e.target.id === "xpal") { palClose(); return; }
    const b = e.target.closest("[data-act]"); if (!b) return;
    const parts = b.dataset.act.split(":"), a = parts[0], x = parts[1], y = parts[2];
    if (a === "tab") { tab = x; render(); loadTabData(); }
    else if (a === "save") save();
    else if (a === "pal") palOpen();
    else if (a === "theme") { theme = theme === "dark" ? "light" : "dark"; localStorage.setItem("x_theme", theme); applyTheme(); }
    else if (a === "collapse") { collapsed = !collapsed; localStorage.setItem("x_side", collapsed ? "1" : "0"); $(".x-win").classList.toggle("x-collapsed", collapsed); }
    else if (a === "close") tryClose();
    else if (a === "prevtoggle") { previewOn = !previewOn; $("#xprevwrap").hidden = !previewOn; if (previewOn && !$("#xprev").src) $("#xprev").src = "/?preview=1"; else preview(); }
    else if (a === "seg") { set(x, y); mark(); render(true); }
    else if (a === "add") { D[x].push(NEW[x]()); added = [x, D[x].length - 1]; mark(); render(true); }
    else if (a === "addi") { D.kits[+x].items.push({ name: "Yeni eşya", amount: 1, shortname: "" }); mark(); render(true); }
    else if (a === "deli") { D.kits[+x].items.splice(+y, 1); mark(); render(true); }
    else if (a === "del") { if ((await ask("Silinsin mi?", { danger: true }))) { D[x].splice(+y, 1); mark(); render(true); } }
    else if (a === "up" || a === "dn") { const i = +y, j = a === "up" ? i - 1 : i + 1; if (D[x][j]) { [D[x][i], D[x][j]] = [D[x][j], D[x][i]]; added = [x, j]; mark(); render(true); } }
    else if (a === "color") { D.accent = b.dataset.act.slice(6); mark(); render(true); }
    else if (a === "copy") { try { await navigator.clipboard.writeText($("#" + x).textContent); toast("Kopyalandı"); } catch (_) { toast("Kopyalanamadı", 1); } }
    else if (a === "cp") { try { await navigator.clipboard.writeText(x); toast("Kopyalandı"); } catch (_) {} }
    else if (a === "logout") { await api("/api/logout", "POST").catch(() => {}); dirty = secDirty = false; location.reload(); }
    else if (a === "of") { ordFilter = x; render(true); }
    else if (a === "ordload") { ORD = null; $("#xorders").innerHTML = ordersHtml(); loadOrders(); }
    else if (a === "csv") {
      if (!ORD) return; const rows = [["Kod", "Durum", "Ürün", "Tutar", "Yöntem", "SteamID", "E-posta", "Tarih"], ...ORD.orders.map(o => [o.id, ST[o.status], o.productName, o.amount, MT[o.method] || o.method, o.steamId, o.email, o.createdAt])];
      const csv = "\ufeff" + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\n"), a2 = document.createElement("a");
      a2.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a2.download = "siparisler.csv"; a2.click();
    }
    else if (a === "ord") { await doApi(null, async () => { const r = await api("/api/admin/order", "POST", { id: x, status: y }); if (r.delivery) toast(r.delivery.ok ? "Ödendi ve sunucuya teslim edildi ✓" : r.delivery.skipped ? "Ödendi olarak işaretlendi" : "Ödendi; teslim hatası: " + r.delivery.error, !r.delivery.ok && !r.delivery.skipped); else toast("Güncellendi ✓"); await loadOrders(); }); }
    else if (a === "deliver") { b.disabled = true; await doApi(null, async () => { const r = await api("/api/admin/order-deliver", "POST", { id: x }); toast(r.ok ? "Sunucuya teslim edildi ✓" : "Teslim edilemedi: " + r.error, !r.ok); await loadOrders(); }); b.disabled = false; }
    else if (a === "tpl") { ANN.text = b.dataset.act.slice(4); const t = $("#xat"); t.value = ANN.text; $("#xcnt").textContent = ANN.text.length; t.focus(); }
    else if (a === "anmode") { ANN.mode = x; render(true); }
    else if (a === "announce") { const t = ANN.text.trim(); if (!t) return toast("Duyuru metnini yaz", 1); if (!ANN.game && !ANN.site) return toast("En az bir hedef seç", 1); sendAnnounce(t, ANN.seconds); }
    else if (a === "resend") { const h = (ANH || []).find(z => z.id === x); if (h) { ANN.text = h.text; ANN.seconds = h.seconds; ANN.mode = h.mode; render(true); sendAnnounce(h.text, h.seconds); } }
    else if (a === "anload") loadAnn();
    else if (a === "restore") { if ((await ask("Bu yedek geri yüklensin mi? Mevcut ayarların yerine geçer.", { danger: true }))) await doApi(null, async () => { await api("/api/admin/restore", "POST", { id: x }); location.reload(); }); }
    else if (a === "srvconnect") {
      const r = $("#xsrv"); if (!D.server.ip) return toast("Önce sunucu IP:port adresini yaz", 1); r.innerHTML = "Bağlanılıyor… (portlar taranıyor)";
      await doApi(r, async () => {
        const j = await api("/api/admin/server-test", "POST", { server: { ...D.server, liveSource: "query" } });
        if (!j.ok) { r.innerHTML = `<span class="bad">✗ ${esc(j.error)}</span>`; return; }
        const d = j.data, gp = +((String(D.server.ip).split(":")[1]) || 28015);
        D.server.liveSource = "query"; D.server.queryPort = d.port && d.port !== gp ? String(d.port) : (D.server.queryPort || "");
        if (d.name && (!D.server.name || D.server.name === "Sunucum")) D.server.name = d.name; if (d.max) D.server.max = d.max; D.server.online = d.online; mark(); render(true);
        $("#xsrv").innerHTML = `<span class="ok">✓ Bağlandı: <b>${esc(d.name || "sunucu")}</b> · ${esc(d.online)}/${esc(d.max)} oyuncu${d.map ? " · harita: " + esc(d.map) : ""} · sorgu portu ${esc(d.port)}</span>`; loadSrvLive();
      });
    }
    else if (a === "whtest") { const r = $("#xwh_" + x); if (secDirty) await save(true); r.textContent = "Gönderiliyor…"; await doApi(r, async () => { const j = await api("/api/admin/webhook-test", "POST", { which: x }); r.innerHTML = j.ok ? '<span class="ok">✓ Discord’a gönderildi</span>' : `<span class="bad">✗ ${esc(j.error)}</span>`; }); }
    else if (a === "whclear") { ((secDraft.webhooks ??= {}))[x] = null; secDirty = true; await save(true); toast("Webhook silindi"); render(true, true); }
    else if (a === "dlink") { if (secDirty) await save(true); await doApi(null, async () => { const j = await api("/api/admin/discord-link", "POST", {}); location.href = j.url; }); }
    else if (a === "dunlink") { if ((await ask("Bu Discord hesabının yönetici bağlantısı kaldırılsın mı?", { danger: true }))) await doApi(null, async () => { await api("/api/admin/discord-unlink", "POST", { id: x }); SEC = await api("/api/admin/secrets"); render(true, true); toast("Kaldırıldı"); }); }
    else if (a === "srvtest") {
      const r = $("#xsrv"); r.innerHTML = "Bağlanılıyor…";
      await doApi(r, async () => { const j = await api("/api/admin/server-test", "POST", { server: D.server }); r.innerHTML = j.ok ? `<span class="ok">✓ Bağlandı: <b>${esc(j.data.name || "sunucu")}</b> · ${esc(j.data.online)}/${esc(j.data.max)} oyuncu${j.data.map ? " · harita: " + esc(j.data.map) : ""}</span>` : `<span class="bad">✗ ${esc(j.error)}</span>`; });
    }
    else if (a === "rcontest") {
      const r = $("#xrcon"); r.innerHTML = "Bağlanılıyor…";
      await doApi(r, async () => { const j = await api("/api/admin/rcon-test", "POST", {}); r.innerHTML = j.ok ? `<span class="ok">✓ RCON çalışıyor${j.info ? `: <b>${esc(j.info.name)}</b> · ${esc(j.info.players)}/${esc(j.info.max)} oyuncu` : ""}</span>` : `<span class="bad">✗ ${esc(j.error)}</span>`; });
    }
    else if (a === "dsctest") {
      const r = $("#xdsc"); r.textContent = "Kontrol ediliyor…";
      await doApi(r, async () => { const j = await api("/api/admin/discord-test", "POST", { link: D.discord }); r.innerHTML = j.ok ? `<span class="ok">✓ Çalışıyor: ${esc(j.data.members)} üye, ${esc(j.data.online)} çevrimiçi</span>` : `<span class="bad">✗ ${esc(j.error)}</span>`; });
    }
    else if (a === "dns") {
      const r = $("#xdns"); r.textContent = "Kontrol ediliyor…";
      await doApi(r, async () => { const j = await api("/api/admin/dns-check", "POST", { domain: D.domain.name, ip: D.domain.serverIp }); r.innerHTML = j.match ? '<span class="ok">✓ DNS doğru: domain bu sunucuya yönleniyor.</span>' : j.ips.length ? `<span class="bad">✗ Domain şu IP’lere gidiyor: ${esc(j.ips.join(", "))}. Beklenen: ${esc(D.domain.serverIp || "(IP gir)")}</span>` : '<span class="bad">✗ A kaydı bulunamadı. DNS yayılması 5 dk – 24 saat sürebilir.</span>'; });
    }
    else if (a === "pw") {
      const [c, n1, n2] = ["xpw0", "xpw1", "xpw2"].map(i => $("#" + i).value), u = $("#xpu").value.trim();
      if (n1 !== n2) return toast("Yeni şifreler eşleşmiyor", 1);
      await doApi(null, async () => { const r = await api("/api/admin/password", "POST", { current: c, next: n1, user: u }); me = r.user; setUser(); toast("Hesap güncellendi ✓"); ["xpw0", "xpw1", "xpw2"].forEach(i => $("#" + i).value = ""); });
    }
  }

  function normalize(d) {
    d.domain ??= { name: "", serverIp: "", port: 3000 }; d.socials ??= []; d.kits ??= []; d.news ??= []; d.themeStyle ??= "color"; d.themeMode ??= "auto"; d.showDiscordStats ??= true;
    d.notify ??= { orderNew: true, orderPaid: true, delivered: true, deliverFailed: true, announce: true }; d.payments ??= {}; d.payments.methods ??= {}; for (const k of ["paytr", "stripe", "manual"]) d.payments.methods[k] ??= { enabled: false }; d.payments.symbol ??= "₺"; d.payments.currency ??= "TRY";
    d.vip.forEach(v => { v.rcon ??= ""; v.kitId ??= ""; v.amount ??= 0; });
    const s = d.server; s.liveSource ??= s.battlemetricsId ? "battlemetrics" : "manual"; s.queryPort ??= ""; s.battlemetricsId ??= ""; s.connectLabel ??= "Şimdi Bağlan"; s.connectUrl ??= ""; s.nextWipe ??= "";
    return d;
  }
  async function open() {
    if (!root) mount();
    try {
      me = (await api("/api/admin/me")).user; D = normalize(await api("/api/admin/data")); rev = D._rev || 0; SEC = await api("/api/admin/secrets");
      lg.classList.remove("open"); lg.hidden = true; setUser(); $("#xauto").checked = auto; $(".x-win").classList.toggle("x-collapsed", collapsed); applyTheme(); showPanel();
      const dm = window.__discordMsg; window.__discordMsg = null; if (dm === "linked") tab = "guvenlik";
      render(); loadTabData(); stat(); if (dm === "linked") toast("Discord hesabın bağlandı ✓"); else if (dm === "ok") toast("Discord ile giriş yapıldı ✓");
    } catch (e) { if (!root.hidden) hidePanel(); showLogin(); }
  }
  window.Panel = { open };
  open();
})();
