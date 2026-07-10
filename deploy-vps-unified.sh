#!/bin/bash
# 🚀 SYSTEM DEPLOYMENT SCRIPT FOR PRINK TECH WEBSITE
# Chạy trực tiếp trên VPS: bash /srv/deploy-vps-unified-website.sh

set -e

APP_DIR="/srv/website-prinktech"
TAR_FILE="/srv/website-prinktech.tar.gz"
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
# 1. KIỂM TRA FILE NÉN
# ============================================
step "1️⃣  KIỂM TRA FILE NÉN"

if [ ! -f "$TAR_FILE" ]; then
    error "Không tìm thấy file nén tải lên: $TAR_FILE"
fi

info "File nén: $TAR_FILE ($(du -h "$TAR_FILE" | cut -f1))"
success "File nén hợp lệ."

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
# 3. SAO LƯU & GIẢI NÉN MÃ NGUỒN
# ============================================
step "3️⃣  GIẢI NÉN MÃ NGUỒN MỚI"

# Backup file .env nếu có
if [ -f "$APP_DIR/.env" ]; then
    info "Sao lưu .env..."
    cp "$APP_DIR/.env" "$APP_DIR/.env.backup"
fi
if [ -f "$APP_DIR/.env.local" ]; then
    info "Sao lưu .env.local..."
    cp "$APP_DIR/.env.local" "$APP_DIR/.env.local.backup"
fi

# Xóa folder cũ (giữ lại backups)
info "Dọn dẹp thư mục ứng dụng cũ..."
if [ -d "$APP_DIR" ]; then
    find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name "*.backup" ! -name "*.env*" ! -name ".git" -exec rm -rf {} + 2>/dev/null || true
fi

mkdir -p "$APP_DIR"

# Giải nén code mới
info "Giải nén code mới vào $APP_DIR..."
tar -xzf "$TAR_FILE" -C "$APP_DIR"
success "Giải nén hoàn tất."

# Khôi phục .env
if [ -f "$APP_DIR/.env.backup" ]; then
    mv "$APP_DIR/.env.backup" "$APP_DIR/.env"
fi
if [ -f "$APP_DIR/.env.local.backup" ]; then
    mv "$APP_DIR/.env.local.backup" "$APP_DIR/.env.local"
fi

# Áp dụng .env mới tải lên
if [ -f "/srv/website-prinktech.env" ]; then
    info "Phát hiện file cấu hình mới tải lên, đang áp dụng..."
    mv "/srv/website-prinktech.env" "$APP_DIR/.env"
fi

# ============================================
# 4. CÀI ĐẶT THƯ VIỆN & BUILD NEXT.JS
# ============================================
step "4️⃣  CÀI ĐẶT & BUILD NEXT.JS (DOCKER)"

cd "$APP_DIR"

info "Dọn dẹp triệt để thư mục build cũ bằng Docker..."
docker run --rm -v "$APP_DIR:/app" -w /app node:20 rm -rf .next node_modules

info "Dọn dẹp package-lock.json để tránh xung đột Windows/Linux..."
rm -f package-lock.json

info "Đang cài đặt node_modules..."
docker run --rm \
    -v "$APP_DIR:/app" \
    -w /app \
    -e NODE_ENV=development \
    node:20 \
    npm install --include=dev --no-audit --no-fund --legacy-peer-deps

info "Đang build Next.js (chế độ Production)..."
docker run --rm \
    -v "$APP_DIR:/app" \
    -w /app \
    -e NODE_ENV=production \
    -e NODE_OPTIONS="--max-old-space-size=4096" \
    -e NEXT_TELEMETRY_DISABLED=1 \
    node:20 \
    npm run build

if [ ! -f ".next/BUILD_ID" ]; then
    error "Build Next.js thất bại (không xuất hiện thư mục .next/BUILD_ID)"
fi

success "Build Next.js thành công (Build ID: $(cat .next/BUILD_ID))."

# ============================================
# 5. KHỞI CHẠY CONTAINER
# ============================================
step "5️⃣  KHỞI CHẠY DOCKER CONTAINER"

info "Chạy docker-compose..."
docker compose up -d

sleep 3

if docker ps | grep -q "$CONTAINER_NAME"; then
    success "Container $CONTAINER_NAME đang chạy ở cổng 3019."
else
    error "Container docker compose không thể khởi chạy!"
fi

# ============================================
# 6. TỰ ĐỘNG CẬP NHẬT REVERSE PROXY CADDY
# ============================================
step "6️⃣  CẤU HÌNH DOMAIN TRÊN CADDY"

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

# Dọn dẹp file tar.gz tạm trên VPS
rm -f "$TAR_FILE"

echo ""
echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DEPLOY WEBSITE THÀNH CÔNG!   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
echo ""
echo "  🌐 Domain: https://prinktech.netslive.com"
echo "  📂 Container: $CONTAINER_NAME (Cổng 3019)"
echo ""
