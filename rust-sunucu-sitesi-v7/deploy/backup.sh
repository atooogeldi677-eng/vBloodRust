#!/usr/bin/env bash
# Elle yedek: ayarlar, siparişler ve şifre dahil tüm veriyi tek dosyaya alır.
set -euo pipefail
mkdir -p /var/backups/rustsite; F=/var/backups/rustsite/data-$(date +%F-%H%M).tar.gz
tar -czf "$F" -C /opt/rust-site data && echo "Yedek: $F"
