#!/usr/bin/env bash
# Ubuntu 22.04 / 24.04 VPS kurulumu: Node.js 22 + Caddy (otomatik HTTPS) + systemd (7/24 çalışır, çökerse kendiliğinden kalkar).
# Kullanım (sunucuda, proje klasörünün içinde):   sudo bash deploy/install-ubuntu.sh
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Root olarak çalıştır:  sudo bash deploy/install-ubuntu.sh"; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"; APP=/opt/rust-site; USR=rustsite

read -rp "Domain (örn. siteadi.com): " DOMAIN
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo "Geçersiz domain"; exit 1; }
read -rp "Yönetici kullanıcı adı [admin]: " AUSER; AUSER=${AUSER:-admin}
read -rsp "Yönetici şifresi (en az 8 karakter): " APASS; echo
[ "${#APASS}" -ge 8 ] || { echo "Şifre en az 8 karakter olmalı"; exit 1; }

echo "== Paketler =="; export DEBIAN_FRONTEND=noninteractive
apt-get update -y; apt-get install -y curl ca-certificates gnupg rsync ufw debian-keyring debian-archive-keyring apt-transport-https
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -; apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y; apt-get install -y caddy
fi

echo "== Uygulama =="; id "$USR" >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/$USR --shell /usr/sbin/nologin "$USR"
mkdir -p "$APP" "$APP/data"
rsync -a --exclude node_modules --exclude .env --exclude data --exclude .git "$SRC"/ "$APP"/
if [ ! -f "$APP/.env" ]; then   # güncellemede şifre/ayarlar bozulmasın diye sadece yoksa yazılır
  printf 'ADMIN_USER=%s\nADMIN_PASSWORD=%s\nPUBLIC_URL=https://%s\nTRUST_PROXY=1\nPORT=3000\n' "$AUSER" "$APASS" "$DOMAIN" > "$APP/.env"; chmod 600 "$APP/.env"
fi
chown -R "$USR:$USR" "$APP"
(cd "$APP" && sudo -u "$USR" npm install --omit=dev --no-audit --no-fund) || echo "npm install atlandı (PostgreSQL kullanmayacaksan sorun değil)"

echo "== Servis =="
cat > /etc/systemd/system/rustsite.service <<UNIT
[Unit]
Description=Rust Sunucu Sitesi
After=network.target
[Service]
User=$USR
WorkingDirectory=$APP
ExecStart=$(command -v node) server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$APP/data
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN, www.$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}
CADDY
cat > /etc/cron.daily/rustsite-backup <<'CRON'
#!/bin/sh
mkdir -p /var/backups/rustsite && tar -czf /var/backups/rustsite/data-$(date +%F).tar.gz -C /opt/rust-site data && find /var/backups/rustsite -name 'data-*.tar.gz' -mtime +14 -delete
CRON
chmod +x /etc/cron.daily/rustsite-backup

ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw --force enable >/dev/null
systemctl daemon-reload; systemctl enable --now rustsite; systemctl restart caddy
sleep 2; systemctl is-active --quiet rustsite && echo "✓ Site çalışıyor." || { echo "✗ Servis başlamadı:  journalctl -u rustsite -n 50"; exit 1; }
cat <<DONE

==================================================
 Kurulum tamam.
 Domain DNS'inde A kaydı bu sunucunun IP'sini göstermeli:
   $DOMAIN      A   $(curl -s -4 ifconfig.me || echo SUNUCU_IP)
   www.$DOMAIN  A   $(curl -s -4 ifconfig.me || echo SUNUCU_IP)
 DNS yayılınca https://$DOMAIN açılır (HTTPS otomatik).
 Panel: sitenin üstündeki "Yönetim" butonu.   Kullanıcı: $AUSER
 Loglar:      journalctl -u rustsite -f
 Güncelleme:  yeni dosyaları yükleyip  sudo bash deploy/update.sh
 Yedekler:    /var/backups/rustsite  (her gün, 14 gün saklanır)
==================================================
DONE
