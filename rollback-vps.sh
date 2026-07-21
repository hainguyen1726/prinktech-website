#!/bin/bash
# 🚀 SYSTEM ROLLBACK SCRIPT FOR PRINK TECH WEBSITE
# Chạy trực tiếp trên VPS: bash /srv/website-prinktech/rollback-vps.sh [git-commit-hash]

set -e

APP_DIR="/srv/website-prinktech"
LOCKFILE="/tmp/prinktech-deploy.lock"

# Prevent concurrent operations
if [ -f "$LOCKFILE" ]; then
    PID=$(cat "$LOCKFILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "\033[1;33m⚠️  Một tiến trình deploy/rollback khác đang chạy (PID: $PID).\033[0m"
        exit 0
    fi
fi
echo $$ > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

function info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
function success() { echo -e "${GREEN}✅ $1${NC}"; }
function warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
function error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

cd "$APP_DIR"

# 1. Xác định phiên bản muốn rollback về
ROLLBACK_VERSION="$1"

if [ -z "$ROLLBACK_VERSION" ]; then
    info "Không truyền tham số phiên bản. Đang tìm phiên bản thành công gần nhất trước đó trong deploy_history.log..."
    if [ -f "deploy_history.log" ]; then
        # Tìm dòng SUCCESS gần nhất nhưng không phải là dòng cuối cùng (vì dòng cuối là bản hiện tại vừa chạy lỗi)
        # Hoặc tìm bản SUCCESS khác bản hiện tại đang active
        CURRENT_ACTIVE_VERSION=$(grep NEXT_PUBLIC_APP_VERSION .env | cut -d '=' -f2 || echo "")
        info "Phiên bản hiện tại đang hoạt động: $CURRENT_ACTIVE_VERSION"
        
        # Lọc ra commit khác với bản hiện tại và lấy bản gần nhất
        ROLLBACK_VERSION=$(grep "SUCCESS:" deploy_history.log | grep -v "$CURRENT_ACTIVE_VERSION" | tail -n 1 | awk '{print $5}' || echo "")
    fi
fi

if [ -z "$ROLLBACK_VERSION" ]; then
    error "Không tìm thấy thông tin phiên bản hợp lệ để rollback. Vui lòng truyền commit hash cụ thể!"
fi

info "Tiến hành Rollback về phiên bản: $ROLLBACK_VERSION"

# 2. Kiểm tra xem Docker Image của phiên bản đó có tồn tại trên VPS không
IMAGE_EXISTS=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "^prinktech-website:$ROLLBACK_VERSION$" | wc -l)
if [ "$IMAGE_EXISTS" -eq 0 ]; then
    error "Không tìm thấy Docker Image prinktech-website:$ROLLBACK_VERSION trên hệ thống. Không thể rollback nhanh!"
fi

# 3. Xác định target container để deploy rollback (Blue-Green)
BLUE_RUNNING=$(docker ps --filter "name=prinktech-website-blue" --filter "status=running" -q | wc -l)

if [ "$BLUE_RUNNING" -gt 0 ]; then
    TARGET_COLOR="green"
    TARGET_SERVICE="web-green"
    TARGET_CONTAINER="prinktech-website-green"
    TARGET_PORT=3021
    
    OLD_COLOR="blue"
    OLD_SERVICE="web-blue"
    OLD_CONTAINER="prinktech-website-blue"
else
    TARGET_COLOR="blue"
    TARGET_SERVICE="web-blue"
    TARGET_CONTAINER="prinktech-website-blue"
    TARGET_PORT=3019
    
    OLD_COLOR="green"
    OLD_SERVICE="web-green"
    OLD_CONTAINER="prinktech-website-green"
fi

info "Môi trường rollback sẽ là container $TARGET_CONTAINER (cổng $TARGET_PORT)."

# 4. Ghi đè tag image build thành bản cũ
info "Đang thiết lập lại image tag và khởi chạy container..."
docker tag prinktech-website:$ROLLBACK_VERSION prinktech-website-web-$TARGET_COLOR:latest

# Cập nhật biến môi trường trong file .env
sed -i '/NEXT_PUBLIC_APP_VERSION/d' .env || true
echo "NEXT_PUBLIC_APP_VERSION=$ROLLBACK_VERSION" >> .env

# Khởi chạy container target
docker rm -f "$TARGET_CONTAINER" 2>/dev/null || true
docker compose up -d "$TARGET_SERVICE"

# 5. Kiểm tra sức khỏe
HEALTHY=false
for i in {1..15}; do
    if curl -s "http://localhost:$TARGET_PORT" > /dev/null; then
        success "Container rollback $TARGET_CONTAINER đã sẵn sàng!"
        HEALTHY=true
        break
    fi
    info "Chờ container khởi động (lần $i/15)..."
    sleep 2
done

if [ "$HEALTHY" = false ]; then
    docker compose stop "$TARGET_SERVICE" || true
    error "Khởi động container rollback thất bại!"
fi

# 6. Swap Caddy proxy
CADDYFILE_PATHS=(
    "/home/n8n/Caddyfile"
    "/srv/caddy/Caddyfile"
    "/srv/n8n/Caddyfile"
    "/etc/caddy/Caddyfile"
)
FOUND_CADDYFILE=""
for path in "${CADDYFILE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        FOUND_CADDYFILE="$path"
        break
    fi
done

if [ -n "$FOUND_CADDYFILE" ]; then
    info "Đang swap proxy trong Caddyfile bằng Python regex linh hoạt & Inode-safe..."
    python3 -c "
import sys, re
caddyfile = sys.argv[1]
target = sys.argv[2]
with open(caddyfile, 'r') as f:
    content = f.read()
pattern = r'(prinktech\.netslive\.com\s*\{[^}]*reverse_proxy\s+)[^\s\n\}]+'
new_content = re.sub(pattern, r'\g<1>' + target, content)
with open('/tmp/caddy_swap.tmp', 'w') as f:
    f.write(new_content)
" "$FOUND_CADDYFILE" "$TARGET_CONTAINER:3000"

    cat /tmp/caddy_swap.tmp > "$FOUND_CADDYFILE"
    rm -f /tmp/caddy_swap.tmp
    
    docker exec -i n8n-caddy-1 sh -c 'cat > /etc/caddy/Caddyfile' < "$FOUND_CADDYFILE"
    docker exec n8n-caddy-1 caddy reload --config /etc/caddy/Caddyfile
    success "Caddy reload rollback thành công! Traffic trỏ về $TARGET_CONTAINER:3000."
fi

# 7. Stop container lỗi
OLD_RUNNING=$(docker ps --filter "name=$OLD_CONTAINER" --filter "status=running" -q | wc -l)
if [ "$OLD_RUNNING" -gt 0 ]; then
    info "Đang dừng container bị lỗi ($OLD_CONTAINER)..."
    docker compose stop "$OLD_SERVICE"
fi

# Ghi nhận sự kiện rollback thành công vào lịch sử
DEPLOY_DATE=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$DEPLOY_DATE] ROLLBACK: Rolled back successfully to version $ROLLBACK_VERSION on $TARGET_COLOR. Active port: $TARGET_PORT." >> deploy_history.log

echo ""
echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    ✅ ROLLBACK THÀNH CÔNG!         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
echo ""
echo "  🌐 Domain: https://prinktech.netslive.com"
echo "  📂 Container Active: $TARGET_CONTAINER (Cổng $TARGET_PORT)"
echo "  🏷️  Phiên bản rollback: $ROLLBACK_VERSION"
echo ""
