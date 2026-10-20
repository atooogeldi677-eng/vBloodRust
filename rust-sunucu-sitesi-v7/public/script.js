(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const url = s => /^(https?:\/\/|\/|\.\/|assets\/|#)/i.test(String(s || "")) ? String(s) : "#";
  let wired = false;
  const canBuy = (t, C) => (C.payMethods || []).length > 0 && t.amount > 0 && t.id;
  const money = (t, C) => t.amount > 0 ? esc((C.payments?.symbol || "₺") + Number(t.amount).toLocaleString("tr-TR", { maximumFractionDigits: 2 })) : esc(t.price || "");
  const preview = new URLSearchParams(location.search).has("preview");
  const fmtDate = d => { const t = Date.parse(d); return t ? new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : ""; };
  function tickWipe() {
    const el = $("wipeCd"), t = window.__wipeT, left = t - Date.now();
    if (!t || left < -3600e3) { el.hidden = true; return; } el.hidden = false;
    if (left <= 0) { $("wipeBoxes").innerHTML = '<b class="wnow">Wipe başladı! 🎉</b>'; return; }
    const v = [[Math.floor(left / 864e5), "gün"], [Math.floor(left / 36e5) % 24, "saat"], [Math.floor(left / 6e4) % 60, "dk"], [Math.floor(left / 1e3) % 60, "sn"]];
    $("wipeBoxes").innerHTML = v.map(x => `<div class="wbx"><b>${String(x[0]).padStart(2, "0")}</b><small>${x[1]}</small></div>`).join("");
  }
  setInterval(tickWipe, 1000);
  async function loadChart() {
    try {
      const d = await (await fetch("/api/stats", { cache: "no-store" })).json(), p = d.points || [], svg = $("sChart");
      if (p.length < 2) { svg.innerHTML = ""; $("sChartMeta").textContent = "Veri toplanıyor… (5 dakikada bir ölçülür)"; return; }
      const t0 = p[0][0], t1 = p[p.length - 1][0], mx = Math.max(1, ...p.map(x => x[1])) * 1.15, X = t => 4 + (t - t0) / Math.max(1, t1 - t0) * 292, Y = v => 76 - v / mx * 68;
      const line = p.map((x, i) => (i ? "L" : "M") + X(x[0]).toFixed(1) + " " + Y(x[1]).toFixed(1)).join(" ");
      svg.innerHTML = `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="${line} L${X(t1).toFixed(1)} 78 L${X(t0).toFixed(1)} 78Z" fill="url(#cg)"/><path class="cl" d="${line}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
      $("sChartMeta").textContent = "Zirve: " + d.peak + " · Ortalama: " + d.avg;
    } catch (_) {}
  }
  setInterval(() => { if (!document.hidden && window.__site?.server?.ip) loadChart(); }, 300e3);

  function render(C) {
    window.__site = C;
    const S = C.server || {}, root = document.documentElement;
    const mono = C.themeStyle === "mono";
    root.classList.toggle("mono", mono);
    if (C.themeMode === "light" || C.themeMode === "dark") root.dataset.theme = C.themeMode; else delete root.dataset.theme;
    if (!mono && /^#[0-9a-f]{6}$/i.test(C.accent || "")) {
      root.style.setProperty("--accent", C.accent);
      root.style.setProperty("--accent2", `color-mix(in srgb, ${C.accent} 78%, #000)`);
      root.style.setProperty("--glow", `color-mix(in srgb, ${C.accent} 22%, transparent)`);
    } else ["--accent", "--accent2", "--glow"].forEach(k => root.style.removeProperty(k));

    document.title = (C.brand + " " + C.heroSubtitle).trim();
    document.querySelectorAll("[data-brand]").forEach(e => e.textContent = C.brand);
    document.querySelectorAll("[data-discord]").forEach(e => e.href = url(C.discord));
    $("heroSub").textContent = C.heroSubtitle;
    $("tagline").textContent = C.tagline;
    $("footNote").textContent = C.footerNote;
    $("logoWrap").innerHTML = C.logoUrl ? `<img src="${esc(url(C.logoUrl))}" alt="">` : "<b>R</b>";

    const hasSrv = !!S.ip, off = hasSrv && S.status === "offline";
    const pct = hasSrv && S.max > 0 ? Math.min(100, Math.round(S.online / S.max * 100)) : 0;
    $("liveTxt").textContent = !hasSrv ? "Sunucu yakında" : off ? "Sunucu şu an çevrimdışı" : S.online + " oyuncu şu an çevrimiçi";
    $("sStatus").textContent = !hasSrv ? "● Yakında" : off ? "● Çevrimdışı" : "● Çevrimiçi";
    $("sStatus").style.color = !hasSrv || off ? "var(--muted)" : "";
    $("stats").innerHTML = (hasSrv ? [[S.online, "Çevrimiçi oyuncu"], [S.max || "—", "Toplam slot"], [S.group || "—", "Grup limiti"], [S.max > 0 ? "%" + pct : "—", "Doluluk"]] : [["—", "Çevrimiçi oyuncu"], ["—", "Toplam slot"], ["—", "Grup limiti"], ["—", "Doluluk"]])
      .map(x => `<div class="stat"><b>${esc(x[0])}</b><small>${x[1]}</small></div>`).join("");
    $("sReg").textContent = S.region || ""; $("sName").textContent = S.name || ""; $("sDesc").textContent = S.description || "";
    $("sFeat").innerHTML = (S.features || []).map(f => `<li>${esc(f)}</li>`).join("");
    $("sOn").textContent = hasSrv ? S.online : "—"; $("sMax").textContent = hasSrv && S.max ? "/ " + S.max : ""; $("sBar").style.width = pct + "%";
    $("sQueue").hidden = !(hasSrv && S.queue > 0); $("sQueue").textContent = "+" + (S.queue || 0) + " kişi sırada";
    $("sMapRow").hidden = !(hasSrv && S.map); $("sMap").textContent = S.map || "";
    $("sGroup").textContent = S.group || "—"; $("sWipe").textContent = S.wipe || "—"; $("sIp").textContent = hasSrv ? S.ip : "Henüz eklenmedi";
    $("sOnLbl").textContent = hasSrv ? "oyuncu çevrimiçi" : "sunucu henüz bağlanmadı";
    $("sConn").textContent = S.connectLabel || "Şimdi Bağlan";
    $("sConn").hidden = !hasSrv && !S.connectUrl; $("sCopy").hidden = !hasSrv;
    $("sConn").href = /^(https?:\/\/|steam:\/\/)/i.test(S.connectUrl || "") ? S.connectUrl : /^[\w.:-]+$/.test(S.ip || "") ? "steam://connect/" + S.ip : "#";
    const ds = C.discordStats;
    $("dcStats").hidden = !ds;
    if (ds) $("dcStats").textContent = "👥 " + ds.members + " üye" + (ds.online ? " · " + ds.online + " çevrimiçi" : "");
    $("socials").innerHTML = (C.socials || []).filter(s => s.url && url(s.url) !== "#").map(s => { const id = window.iconFor(s); return `<a class="soc" href="${esc(url(s.url))}" target="_blank" rel="noopener" title="${esc(s.name || window.ICONS[id].label)}" aria-label="${esc(s.name || window.ICONS[id].label)}">${window.iconSvg(id)}</a>`; }).join("");
    const news = (C.news || []).slice().sort((x, y) => String(y.date).localeCompare(String(x.date)));
    $("haberler").hidden = !news.length; $("navNews").hidden = !news.length;
    $("news").innerHTML = news.map(n => `<article class="card"><div class="news-d">${esc(fmtDate(n.date))}</div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></article>`).join("");
    window.__wipeT = S.nextWipe ? Date.parse(S.nextWipe) : 0; tickWipe(); $("sChartWrap").hidden = !hasSrv; if (hasSrv) loadChart();
    const kits = C.kits || [];
    ["kitler", "navKits"].forEach(i => $(i).hidden = !kits.length);
    $("kits").innerHTML = kits.map(k => `<button class="card kit" data-kit="${esc(k.id)}" type="button"><div class="kit-ic">${esc(k.icon || "🎁")}</div><h3>${esc(k.name)}</h3><p>${esc(k.description || "")}</p><div class="kit-meta"><span>${(k.items || []).length} eşya</span>${k.cooldown ? `<span>⏱ ${esc(k.cooldown)}</span>` : ""}</div><div class="kit-open">İçini gör →</div></button>`).join("");
    $("sCopy").onclick = () => {
      try { navigator.clipboard.writeText("client.connect " + S.ip); } catch (_) {}
      const t = $("toast"); t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1600);
    };

    const has = (C.vip || []).length > 0;
    ["magaza", "navStore", "ctaStore"].forEach(i => $(i).hidden = !has);
    $("vip").innerHTML = (C.vip || []).map(t => `
      <div class="card tier${t.hot ? " hot" : ""}">
        ${t.image ? `<img class="pimg" src="${esc(url(t.image))}" alt="">` : ""}
        <h3>${esc(t.name)}</h3>
        <div class="price">${money(t, C)}<small> ${esc(t.period)}</small></div>
        <ul>${(t.features || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
        ${(C.kits || []).some(k => k.id === t.kitId) ? `<button class="btn g kit-btn" data-kit="${esc(t.kitId)}" type="button">🎒 Kit içeriğini gör</button>` : ""}
        ${canBuy(t, C) ? `<button class="btn${t.hot ? "" : " g"}" data-buy="${esc(t.id)}" style="width:100%;justify-content:center">Satın Al</button>` : `<a class="btn${t.hot ? "" : " g"}" href="${esc(url(t.url || C.storeLink))}" style="width:100%;justify-content:center">Satın Al</a>`}
      </div>`).join("");
    $("rules").innerHTML = (C.rules || []).map(r => `<div class="card"><h3><span class="ic">${esc(r.icon)}</span>${esc(r.title)}</h3><p>${esc(r.text)}</p></div>`).join("");
    $("faq").innerHTML = (C.faq || []).map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");

    const v = $("bg"), sb = $("snd"), src = url(C.videoUrl || "assets/hero.mp4");
    if (C.posterUrl && v.getAttribute("poster") !== url(C.posterUrl)) v.setAttribute("poster", url(C.posterUrl));
    if (v.dataset.src !== src) { v.dataset.src = src; v.src = src; if (!matchMedia("(prefers-reduced-motion:reduce)").matches) v.play().catch(() => {}); }
    if (!wired) {
      wired = true;
      sb.onclick = () => { v.muted = !v.muted; if (!v.muted) v.play().catch(() => {}); sb.textContent = v.muted ? "🔇 Sesi aç" : "🔊 Sesi kapat"; };
    }
  }
  window.SiteUI = { render };

  const CK = "site_cache_v1", showSite = C => { window.__pm = C.payMethods; render(C); };
  const note = t => document.body.insertAdjacentHTML("afterbegin", `<div id="netnote" style="background:#b45309;color:#fff;padding:9px 16px;font:600 13px system-ui;text-align:center;position:relative;z-index:50">${t}</div>`);
  function loadSite(retry) {
    fetch("/api/site", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(C => {
      try { localStorage.setItem(CK, JSON.stringify(C)); } catch (_) {}
      const n = $("netnote"); if (n) n.remove(); showSite(C);
      const q = new URLSearchParams(location.search); if (q.get("o") && q.get("t") && window.Checkout) { window.Checkout.status(q.get("o"), q.get("t"), q.get("odeme")); history.replaceState(null, "", location.pathname); }
    }).catch(() => {
      if (location.protocol === "file:") { render(window.DEFAULT_SITE); note("Önizleme modu: site dosyadan açıldı. Gerçek içerik için sitenin yayındaki adresini aç."); return; }
      let c = null; try { c = JSON.parse(localStorage.getItem(CK)); } catch (_) {}
      if (c) { if (!window.__site) { showSite(c); note("Bağlantı sorunu: son kaydedilen görünüm gösteriliyor. Yeniden deneniyor…"); } }
      else if (!window.__site) note("Site verisi yüklenemedi. Yeniden deneniyor…");
      setTimeout(() => loadSite(true), 5000);
    });
  }
  loadSite();

  function openPanel() {
    if (location.protocol === "file:") { alert("Yönetim paneli yalnızca sitenin yayındaki adresinde (hostingde) çalışır."); return; }
    if (window.Panel) { window.Panel.open(); return; }
    if (window.__pl) return; window.__pl = 1;
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/_panel/panel.css"; document.head.appendChild(l);
    const s = document.createElement("script"); s.src = "/_panel/panel.js"; document.body.appendChild(s);
  }
  document.addEventListener("click", e => {
    const kb = e.target.closest("[data-kit]");
    if (kb && window.Checkout) { const k = (window.__site.kits || []).find(x => x.id === kb.dataset.kit); if (k) window.Checkout.kit(k); return; }
    const b = e.target.closest("[data-buy]"); if (!b || !window.Checkout) return;
    const t = (window.__site.vip || []).find(v => v.id === b.dataset.buy); if (t) window.Checkout.open(t, window.__site);
  });
  addEventListener("message", e => { if (e.origin === location.origin && e.data && e.data.type === "render" && e.data.site) { e.data.site.payMethods = window.__pm || []; render(e.data.site); } });

  /* ---- Duyuru afişi: kayarak gelir, tık sesi çalar, süre sonunda kalkar ---- */
  let lastAnn = "", annT, annCtx;
  const tick = () => { try { const AC = window.AudioContext || window.webkitAudioContext, c = annCtx || (annCtx = new AC()); if (c.state === "suspended") c.resume(); const o = c.createOscillator(), g = c.createGain(); o.type = "square"; o.frequency.setValueAtTime(1100, c.currentTime); o.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.05); g.gain.setValueAtTime(0.1, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.09); } catch (_) {} };
  function showAnn(a) {
    const el = $("ann"), sec = a.left || a.seconds || 10;
    el.innerHTML = `<b>📢 DUYURU</b><span>${esc(a.text)}</span><i class="ann-bar" style="animation-duration:${sec}s"></i>`;
    el.hidden = false; void el.offsetWidth; el.classList.add("show"); tick();
    clearTimeout(annT); annT = setTimeout(() => { el.classList.remove("show"); setTimeout(() => { el.hidden = true; el.innerHTML = ""; }, 600); }, sec * 1000);
  }
  async function pollAnn() {
    if (document.hidden || preview || location.protocol === "file:") return;
    try { const a = await (await fetch("/api/announcement", { cache: "no-store" })).json(); if (a && a.id !== lastAnn) { lastAnn = a.id; showAnn(a); } } catch (_) {}
  }
  setInterval(pollAnn, 4000); pollAnn();
  const dq = new URLSearchParams(location.search).get("discord");
  if (dq && !preview) {
    window.__discordMsg = dq; history.replaceState(null, "", location.pathname + (dq === "ok" || dq === "linked" ? "#yonetim" : ""));
    if (dq === "denied") alert("Bu Discord hesabı yönetici olarak bağlı değil. Önce şifrenle girip Güvenlik sekmesinden Discord hesabını bağla.");
    else if (dq === "error") alert("Discord girişi tamamlanamadı. Tekrar dene.");
    else if (dq === "notconfigured") alert("Discord girişi henüz ayarlanmamış.");
  }
  if (preview) $("adminLink").hidden = true;
  else { $("adminLink").addEventListener("click", e => { e.preventDefault(); openPanel(); }); if (location.hash === "#yonetim") openPanel(); }
})();
