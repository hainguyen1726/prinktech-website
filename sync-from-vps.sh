#!/bin/bash
# 🔄 SYNC VPS → LOCAL (PRINK TECH)
# Chạy từ VPS: bash sync-from-vps.sh
# Hoặc từ Local (qua SSH): ssh root@180.93.146.26 "bash /srv/website-prinktech/sync-from-vps.sh"

VPS_PATH="/srv/website-prinktech"
LOCAL_PATH="$HOME/website-prinktech-backup"   # Thay đổi nếu cần

echo "════════════════════════════════════"
echo "  🔄 SYNC VPS → LOCAL (PRINK TECH)"
echo "════════════════════════════════════"

echo "📥 Đang sync từ VPS → Local ($LOCAL_PATH)..."

mkdir -p "$LOCAL_PATH"

rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='*.log' \
    --exclude='*.tar.gz' \
    --progress \
    "$VPS_PATH/" "$LOCAL_PATH/"

echo "✅ Sync hoàn tất!"
echo "💡 Gợi ý: Copy file cần thiết về Local Windows qua WinSCP / FileZilla / SCP"
