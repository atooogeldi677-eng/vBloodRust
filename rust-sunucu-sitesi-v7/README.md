# Rust Sunucu Sitesi

Site + yönetim paneli + ödeme + veritabanı + Rust sunucusuna bağlantı (RCON, canlı oyuncu sayısı). Node.js 18+ ile çalışır.

## 1) Nereye kurulur?
| Seçenek | Uygun mu? | Not |
|---|---|---|
| **VPS** (Hetzner, Contabo, DigitalOcean, Turhost VPS…) | ✅ **Önerilen** | Tek komutla kurulur, 7/24 çalışır, verilerin senin diskinde kalır. |
| **Render / Railway / Fly.io** | ✅ | Disk geçici olduğu için **PostgreSQL şart** (`render.yaml` hazır). Ücretsiz planlar boşta uyuyabilir. |
| **cPanel “Node.js” hosting** | ⚠️ | Yalnızca hostun *Setup Node.js App* sunuyorsa (Node 18+). Denemedim; satın almadan hosta sor. |
| Klasik PHP hosting | ❌ | Node çalıştıramaz. |
| GitHub Pages | ❌ | Yalnızca statik dosya sunar. GitHub'ı kod deposu olarak kullan. |

## 2) VPS kurulumu (önerilen, ~10 dakika)
1. Ubuntu 22.04 veya 24.04 bir VPS al. Domaininin DNS'inde **A kaydı** sunucunun IP'sini göstersin (`@` ve `www`).
2. Bu klasörü sunucuya yükle (WinSCP/FileZilla ile veya `scp -r . root@IP:/root/site`).
3. Sunucuda: `cd /root/site && sudo bash deploy/install-ubuntu.sh`
   Domain, kullanıcı adı ve **şifreni** sorar. Node.js, HTTPS (Caddy), 7/24 çalışan servis (çökerse kendiliğinden kalkar), güvenlik duvarı ve günlük yedek kendiliğinden kurulur.
4. `https://domainin.com` açılır. Panel: üstteki **🔐 Yönetim**.
- **Güncelleme:** yeni dosyaları yükle → `sudo bash deploy/update.sh` (şifren, ayarların ve siparişlerin **değişmez**).
- **Loglar:** `journalctl -u rustsite -f` · **Yedek:** `/var/backups/rustsite` (her gün, 14 gün) · elle: `sudo bash deploy/backup.sh`

## 3) Render ile kurulum
GitHub'a yükle (`.env` ve `data/` yüklenmez) → Render → *New → Blueprint* → repoyu seç. `render.yaml` web servisini ve PostgreSQL'i kurar. Ortam değişkenleri: `ADMIN_PASSWORD`, `PUBLIC_URL` (https://domainin.com). *Custom Domains*'den domainini ekle.

## 4) Ayarlar neden “eski haline” dönebilir, nasıl engellendi?
| Neden | Önlem |
|---|---|
| Kaydet'e basmadan çıkmak | **Otomatik kaydet** (1 sn). Üstte “✓ Kaydedildi #12 14:32” yazar. |
| Panel iki pencerede/cihazda açık, eski olan yenisini ezer | **Çakışma koruması:** her kaydın numarası var; eski pencere kaydedemez, sana sorar. |
| Geçici disk (Render vb.) | Panel kırmızı uyarı verir; PostgreSQL bağla. |
| Yeni klasöre kurup eski `data/` klasörünü almamak | Güncellemede `data/` ve `.env` korunur (`update.sh`). |
| Tarayıcı eski dosyayı tutuyor | CSS/JS `no-cache + ETag` ile sunulur. |
| Sunucu kısa süre yanıt vermezse site varsayılana dönüyordu | Site **son gerçek veriyi** gösterir, 5 sn'de bir yeniden dener. |
Her kayıtta önceki hali saklanır (Panel → Yedekler, son 30) ve dosya modunda `data/backups` otomatik dolar. Panel → **Domain & Yayın** “yayın hazırlığı” listesiyle eksikleri gösterir.

## Panel ipuçları
`Ctrl+K` her sayfayı/ayarı arar, `Ctrl+S` kaydeder, `Esc` kapatır. Sol altta koyu/açık tema ve menüyü daraltma düğmeleri var. Panelin rengi sitenin vurgu rengini izler.

## 5) Kurulumdan sonra (Panel → Özet kontrol listesi)
1. **Sunucu:** IP:port yaz → *Bağlan ve Test Et*. Oyuncu sayısı, slot, sıra, harita ve 24 saatlik grafik canlı gelir. (UDP sorgu portu açık olmalı.)
2. **Güvenlik:** şifreni/kullanıcı adını değiştir; istersen Discord ile girişi bağla.
3. **Ödeme:** PayTR / Stripe / Havale. Bildirim adresleri panelde yazar (`/api/pay/paytr`, `/api/pay/stripe`).
4. **RCON:** sunucuda `+rcon.web 1 +rcon.port 28016 +rcon.password ŞİFRE`; panelde test et. Ürünlere teslimat komutu yaz (`oxide.usergroup add {steamid} vip`).
5. **Bildirimler:** Discord webhook adresi. **Duyuru:** oyuna + siteye anlık (kayan ekran için `rust-plugin/SiteAnnounce.cs` → `oxide/plugins`).
6. **Kitler, Haberler, Sosyal medya, Sonraki wipe tarihi** (animasyonlu geri sayım) panelden düzenlenir.

## 6) Discord ile giriş
Panel → Güvenlik. [Developer Portal](https://discord.com/developers/applications) → uygulama → OAuth2 → Redirects'e panelin gösterdiği adresi ekle; Client ID/Secret'ı panele yaz; **“Discord hesabımı bağla”**. Yalnızca bağlı hesaplar girebilir.

## 7) Test
`npm test` giriş, sipariş, ödeme onayı, RCON teslimatı, duyuru, port bulma, webhook, Discord OAuth, çakışma koruması ve yedeği sahte sunucularla dener (GitHub Actions her push'ta çalıştırır).

## Bilinen sınırlar
Tek para birimi. E-posta bildirimi, fatura ve iade ekranı yok (iade ödeme sağlayıcının panelinden).
