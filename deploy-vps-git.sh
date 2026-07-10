#!/bin/bash
# 🚀 SYSTEM DEPLOYMENT SCRIPT VIA GIT FOR PRINK TECH WEBSITE
# Chạy trực tiếp trên VPS: bash /srv/website-prinktech/deploy-vps-git.sh

set -e

APP_DIR="/srv/website-prinktech"
CONTAINER_NAME="prinktech-website"

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
info "Đang pull code mới nhất từ nhánh master..."

# Kiểm tra xem có thay đổi chưa commit trên VPS không (đề phòng Hermes Agent sửa chưa commit)
if [ -n "$(git status --porcelain)" ]; then
    info "Phát hiện có thay đổi chưa commit trên VPS. Đang tự động commit để tránh xung đột..."
    git add .
    git commit -m "chore: auto commit local changes on VPS before pull" || true
fi

# Pull code
git pull origin master

success "Cập nhật mã nguồn thành công."

# ============================================
# 2. XÓA CONTAINER CŨ
# ============================================
step "2️⃣  DỌN CONTAINER CŨ"

if docker ps -a | grep -q "$CONTAINER_NAME"; then
    info "Đang xóa container Docker cũ: $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    success "Container cũ đã xóa."
else
    info "Không tìm thấy container cũ đang chạy."
fi

# ============================================
# 3. CÀI ĐẶT THƯ VIỆN & BUILD NEXT.JS
# ============================================
step "3️⃣  CÀI ĐẶT & BUILD NEXT.JS (DOCKER)"

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
# 4. KHỞI CHẠY CONTAINER
# ============================================
step "4️⃣  KHỞI CHẠY DOCKER CONTAINER"

info "Chạy docker compose..."
docker compose up -d

sleep 3

if docker ps | grep -q "$CONTAINER_NAME"; then
    success "Container $CONTAINER_NAME đang chạy ở cổng 3019."
else
    error "Container docker compose không thể khởi chạy!"
fi

# ============================================
# 5. TỰ ĐỘNG CẬP NHẬT REVERSE PROXY CADDY
# ============================================
step "5️⃣  CẤU HÌNH DOMAIN TRÊN CADDY"

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
