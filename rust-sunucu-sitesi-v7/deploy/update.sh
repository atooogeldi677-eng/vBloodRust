#!/usr/bin/env bash
# Güncelleme: yeni dosyaları kopyalar; .env, data/ ve şifren DEĞİŞMEZ. Kullanım: sudo bash deploy/update.sh
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Root olarak çalıştır"; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"; APP=/opt/rust-site
mkdir -p /var/backups/rustsite; tar -czf /var/backups/rustsite/before-update-$(date +%F-%H%M).tar.gz -C "$APP" data 2>/dev/null || true
rsync -a --exclude node_modules --exclude .env --exclude data --exclude .git "$SRC"/ "$APP"/
chown -R rustsite:rustsite "$APP"
(cd "$APP" && sudo -u rustsite npm install --omit=dev --no-audit --no-fund) || true
systemctl restart rustsite; sleep 2; systemctl is-active --quiet rustsite && echo "✓ Güncellendi, site çalışıyor." || { echo "✗ Başlamadı: journalctl -u rustsite -n 50"; exit 1; }
