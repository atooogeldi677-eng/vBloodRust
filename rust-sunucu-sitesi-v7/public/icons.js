// Hazır sosyal medya simgeleri (24x24, çizgi stili). Panel ve site aynı listeyi kullanır.
(() => {
  const I = (label, host, svg) => ({ label, host, svg });
  window.ICONS = {
    discord: I("Discord", /discord/i, '<path d="M7.6 7.2c1.4-.7 2.900-1 4.400-1s3 .3 4.400 1l1.700 9.300c-1.200 1-2.600 1.600-4.100 1.900l-.9-1.400M7.600 7.200L5.900 16.500c1.200 1 2.600 1.600 4.100 1.900l.9-1.400"/><path d="M9.300 12.400h.01M14.700 12.400h.01" stroke-width="2.600"/>'),
    youtube: I("YouTube", /youtu/i, '<path d="M22.540 6.420a2.780 2.780 0 0 0-1.940-2C18.880 4 12 4 12 4s-6.880 0-8.600.460a2.780 2.780 0 0 0-1.940 2A29 29 0 0 0 1 11.750a29 29 0 0 0 .460 5.330A2.780 2.780 0 0 0 3.400 19c1.720.460 8.600.460 8.600.460s6.880 0 8.600-.460a2.780 2.780 0 0 0 1.940-2 29 29 0 0 0 .460-5.250 29 29 0 0 0-.460-5.330z"/><path d="M9.750 15.020L15.500 11.750 9.750 8.480z"/>'),
    instagram: I("Instagram", /instagram/i, '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.370A4 4 0 1 1 12.630 8 4 4 0 0 1 16 11.370z"/><path d="M17.500 6.500h.01"/>'),
    tiktok: I("TikTok", /tiktok/i, '<path d="M14 4v10.500a3.500 3.500 0 1 1-3.500-3.500"/><path d="M14 4c.4 2.400 2 4 4.500 4.200"/>'),
    x: I("X (Twitter)", /(^|[/.])(x|twitter)\.com/i, '<path d="M5 5l14 14M19 5L5 19"/>'),
    twitch: I("Twitch", /twitch/i, '<path d="M21 2H3v16h5v4l4-4h5l4-4V2z"/><path d="M11 11V7M16 11V7"/>'),
    kick: I("Kick", /kick\.com/i, '<rect x="3.500" y="3.500" width="17" height="17" rx="3"/><path d="M9 8v8M9 12l5-4M10.500 12l4.500 4"/>'),
    steam: I("Steam", /steamcommunity|steampowered/i, '<circle cx="12" cy="12" r="9"/><circle cx="15" cy="9.500" r="2.400"/><path d="M4.500 14l4.200 1.700"/><circle cx="8.600" cy="15.600" r="1.800"/>'),
    facebook: I("Facebook", /facebook|fb\.com/i, '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'),
    telegram: I("Telegram", /t\.me|telegram/i, '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>'),
    whatsapp: I("WhatsApp", /whatsapp|wa\.me/i, '<path d="M4 20l1.300-4.200A8.200 8.200 0 1 1 8.300 19z"/><path d="M9.200 8.800c0 3.300 2.700 6 6 6l1.100-1.400-2-1.100-.9.800c-1.100-.4-2-1.300-2.400-2.400l.9-.9-1-2z"/>'),
    github: I("GitHub", /github/i, '<path d="M9 19c-5 1.500-5-2.500-7-3m14 6v-3.870a3.370 3.370 0 0 0-.940-2.610c3.140-.350 6.440-1.540 6.440-7A5.440 5.440 0 0 0 20 4.770 5.070 5.070 0 0 0 19.910 1S18.730.650 16 2.480a13.380 13.380 0 0 0-7 0C6.270.650 5.090 1 5.090 1A5.070 5.070 0 0 0 5 4.770a5.440 5.440 0 0 0-1.500 3.780c0 5.420 3.300 6.610 6.440 7A3.370 3.370 0 0 0 9 18.130V22"/>'),
    reddit: I("Reddit", /reddit/i, '<circle cx="12" cy="14" r="6.500"/><circle cx="19" cy="9" r="1.400"/><path d="M12 7.500l1.200-4 4 1M9.500 13.500h.01M14.500 13.500h.01" stroke-width="2.400"/><path d="M9.800 16.400c1.300 1 3.100 1 4.400 0"/>'),
    spotify: I("Spotify", /spotify/i, '<circle cx="12" cy="12" r="9"/><path d="M7 9.500c3.500-1 7-.7 10 1M7.600 12.600c2.800-.8 5.600-.5 8 .9M8.300 15.400c2.200-.6 4.300-.4 6.200.6"/>'),
    mail: I("E-posta", /^mailto:/i, '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    website: I("Web sitesi", /./, '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.300 15.300 0 0 1 4 10 15.300 15.300 0 0 1-4 10 15.300 15.300 0 0 1-4-10 15.300 15.300 0 0 1 4-10z"/>')
  };
  window.iconFor = s => {
    if (s.platform && s.platform !== "auto" && window.ICONS[s.platform]) return s.platform;
    const k = String(s.name || "").toLowerCase().replace(/[^a-z]/g, ""); if (window.ICONS[k]) return k;
    for (const [id, v] of Object.entries(window.ICONS)) if (id !== "website" && v.host.test(String(s.url || ""))) return id;
    return "website";
  };
  window.iconSvg = id => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(window.ICONS[id] || window.ICONS.website).svg}</svg>`;
})();
