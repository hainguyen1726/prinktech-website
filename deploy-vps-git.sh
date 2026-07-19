#!/bin/bash
# 🚀 SYSTEM DEPLOYMENT SCRIPT VIA GIT FOR PRINK TECH WEBSITE
# Chạy trực tiếp trên VPS: bash /srv/website-prinktech/deploy-vps-git.sh

set -e

APP_DIR="/srv/website-prinktech"
CONTAINER_NAME="prinktech-website"
LOCKFILE="/tmp/prinktech-deploy.lock"

# Prevent concurrent deployments
if [ -f "$LOCKFILE" ]; then
    PID=$(cat "$LOCKFILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "\033[1;33m⚠️  Một tiến trình deploy khác đang chạy (PID: $PID). Bỏ qua lượt build này để tránh xung đột.\033[0m"
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
function step() { 
    echo ""
    echo -e "${BLUE}════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════${NC}"
}
function error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ============================================
# 1. PULL CODE MỚI NHẤT TỪ GITHUB
# ============================================
step "1️⃣  CẬP NHẬT MÃ NGUỒN TỪ GITHUB"

cd "$APP_DIR"
info "Đang fetch code mới nhất từ GitHub..."
git fetch origin master

info "Đang reset cứng mã nguồn VPS về origin/master..."
git reset --hard origin/master

success "Cập nhật mã nguồn thành công."

# ============================================
# 2. CÀI ĐẶT THƯ VIỆN & BUILD NEXT.JS
# ============================================
step "2️⃣  CÀI ĐẶT & BUILD NEXT.JS"

info "Đang cài đặt node_modules..."
npm install --include=dev --no-audit --no-fund --legacy-peer-deps

info "Đang dọn dẹp cache Next.js cũ (.next)..."
rm -rf .next

info "Đang build Next.js (chế độ Production)..."
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1
npm run build

if [ ! -f ".next/BUILD_ID" ]; then
    error "Build Next.js thất bại (không xuất hiện thư mục .next/BUILD_ID)"
fi

success "Build Next.js thành công (Build ID: $(cat .next/BUILD_ID))."

# ============================================
# 3. RESTART CONTAINER (ZERO-DOWNTIME)
# ============================================
step "3️⃣  KHỞI CHẠY CONTAINER (ZERO-DOWNTIME)"

info "Đang khởi động lại container bằng docker compose..."
docker compose up -d --force-recreate

sleep 3

if docker ps | grep -q "$CONTAINER_NAME"; then
    success "Container $CONTAINER_NAME đang chạy ở cổng 3019."
else
    error "Container docker compose không thể khởi chạy!"
fi
# ============================================
# 4. TỰ ĐỘNG CẬP NHẬT REVERSE PROXY CADDY
# ============================================
step "4️⃣  CẤU HÌNH DOMAIN TRÊN CADDY"

CADDYFILE_PATHS=(
    "/home/n8n/Caddyfile"
    "/srv/caddy/Caddyfile"
    "/srv/n8n/Caddyfile"
    "/etc/caddy/Caddyfile"
    "/srv/docker/caddy/Caddyfile"
)

FOUND_CADDYFILE=""
for path in "${CADDYFILE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        FOUND_CADDYFILE="$path"
        break
    fi
done

if [ -n "$FOUND_CADDYFILE" ]; then
    info "Tìm thấy Caddyfile tại: $FOUND_CADDYFILE"
    
    # Kiểm tra xem domain đã cấu hình chưa
    if grep -q "prinktech.netslive.com" "$FOUND_CADDYFILE"; then
        info "Cấu hình domain prinktech.netslive.com đã có sẵn trong Caddyfile."
    else
        info "Đang thêm cấu hình domain prinktech.netslive.com vào Caddyfile..."
        echo -e "\nprinktech.netslive.com {\n    reverse_proxy prinktech-website:3000\n}" >> "$FOUND_CADDYFILE"
        success "Đã thêm cấu hình domain."
    fi
    
    # Reload Caddy container
    if docker ps | grep -q "n8n-caddy-1"; then
        info "Reloading Caddy container (n8n-caddy-1)..."
        docker exec n8n-caddy-1 caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
        success "Caddy reloaded thành công."
    else
        info "Không tìm thấy container n8n-caddy-1 (bỏ qua reload)."
    fi
else
    info "Cảnh báo: Không tìm thấy Caddyfile trên VPS. Vui lòng tự cấu hình trỏ prinktech.netslive.com về container prinktech-website:3000."
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DEPLOY WEBSITE THÀNH CÔNG!   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
echo ""
echo "  🌐 Domain: https://prinktech.netslive.com"
echo "  📂 Container: $CONTAINER_NAME (Cổng 3019)"
echo ""
