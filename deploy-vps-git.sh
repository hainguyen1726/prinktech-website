#!/bin/bash
# 🚀 SYSTEM DEPLOYMENT SCRIPT VIA GIT FOR PRINK TECH WEBSITE (ZERO-DOWNTIME BLUE-GREEN)
# Chạy trực tiếp trên VPS: bash /srv/website-prinktech/deploy-vps-git.sh

set -e

APP_DIR="/srv/website-prinktech"
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
function warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
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

# Lấy Git Commit Hash và message mới nhất
GIT_COMMIT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
success "Cập nhật mã nguồn thành công. Phiên bản hiện tại: $GIT_COMMIT ($COMMIT_MSG)"

# ============================================
# 2. XÁC ĐỊNH TRẠNG THÁI BLUE-GREEN HIỆN TẠI
# ============================================
step "2️⃣  XÁC ĐỊNH TARGET DEPLOYMENT (BLUE-GREEN)"

# Kiểm tra xem container blue có đang chạy không
BLUE_RUNNING=$(docker ps --filter "name=prinktech-website-blue" --filter "status=running" -q | wc -l)
GREEN_RUNNING=$(docker ps --filter "name=prinktech-website-green" --filter "status=running" -q | wc -l)

if [ "$BLUE_RUNNING" -gt 0 ]; then
    info "Phát hiện container BLUE đang chạy. Target deployment sẽ là GREEN."
    TARGET_COLOR="green"
    TARGET_SERVICE="web-green"
    TARGET_CONTAINER="prinktech-website-green"
    TARGET_PORT=3021
    
    OLD_COLOR="blue"
    OLD_SERVICE="web-blue"
    OLD_CONTAINER="prinktech-website-blue"
else
    info "Phát hiện container GREEN đang chạy hoặc chưa chạy container nào. Target deployment sẽ là BLUE."
    TARGET_COLOR="blue"
    TARGET_SERVICE="web-blue"
    TARGET_CONTAINER="prinktech-website-blue"
    TARGET_PORT=3019
    
    OLD_COLOR="green"
    OLD_SERVICE="web-green"
    OLD_CONTAINER="prinktech-website-green"
fi

# ============================================
# 3. BUILD & UP CONTAINER TARGET (KHÉP KÍN TRONG DOCKER)
# ============================================
step "3️⃣  BUILD & UP CONTAINER MỚI ($TARGET_COLOR)"

info "Đang thiết lập biến môi trường phiên bản Git cho build stage..."
# Ghi biến env phiên bản vào file .env trên VPS để Next.js nhận diện
sed -i '/NEXT_PUBLIC_APP_VERSION/d' .env || true
echo "NEXT_PUBLIC_APP_VERSION=$GIT_COMMIT" >> .env

info "Đang build Docker image cho tag $GIT_COMMIT và khởi chạy dịch vụ $TARGET_SERVICE..."
# Thiết lập biến env cho docker-compose build
export GIT_COMMIT_HASH="$GIT_COMMIT"
docker compose build --build-arg NEXT_PUBLIC_SUPABASE_URL="$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d '=' -f2)" --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d '=' -f2)" "$TARGET_SERVICE"

# Xóa container target cũ (nếu có) để tránh xung đột tên container
docker rm -f "$TARGET_CONTAINER" 2>/dev/null || true
docker compose up -d "$TARGET_SERVICE"

# Gán thêm tag cụ thể theo Git Commit cho Docker Image vừa build để lưu lịch sử phiên bản
docker tag prinktech-website-web-$TARGET_COLOR:latest prinktech-website:$GIT_COMMIT || true

# ============================================
# 4. KIỂM TRA SỨC KHỎE (HEALTH CHECK) CONTAINER MỚI
# ============================================
step "4️⃣  KIỂM TRA SỨC KHỎE (HEALTH CHECK)"

info "Đang chờ container $TARGET_CONTAINER khởi động trên cổng $TARGET_PORT..."
HEALTHY=false
for i in {1..20}; do
    if curl -s "http://localhost:$TARGET_PORT" > /dev/null; then
        success "Container $TARGET_CONTAINER đã sẵn sàng và phản hồi thành công!"
        HEALTHY=true
        break
    fi
    info "Chờ container khởi động (lần $i/20)..."
    sleep 3
done

if [ "$HEALTHY" = false ]; then
    warning "Container mới khởi động thất bại hoặc không phản hồi. Tiến hành Rollback tự động (giữ nguyên container cũ)."
    docker compose stop "$TARGET_SERVICE" || true
    
    # Ghi nhận sự kiện lỗi vào log history
    DEPLOY_DATE=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$DEPLOY_DATE] FAILED: Attempted deploy version $GIT_COMMIT to $TARGET_COLOR failed healthcheck. Automatically rolled back to $OLD_CONTAINER." >> deploy_history.log
    
    error "Deploy thất bại. Container cũ ($OLD_CONTAINER) vẫn hoạt động an toàn."
fi

# ============================================
# 5. SWAP PROXY TRÊN CADDY & RELOAD
# ============================================
step "5️⃣  CẬP NHẬT REVERSE PROXY CADDY (ZERO-DOWNTIME SWAP)"

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
    
    # Thực hiện swap cấu hình proxy trong Caddyfile
    if [ "$TARGET_COLOR" = "green" ]; then
        sed -i 's/reverse_proxy prinktech-website-blue:3000/reverse_proxy prinktech-website-green:3000/g' "$FOUND_CADDYFILE"
        sed -i 's/reverse_proxy prinktech-website:3000/reverse_proxy prinktech-website-green:3000/g' "$FOUND_CADDYFILE"
    else
        sed -i 's/reverse_proxy prinktech-website-green:3000/reverse_proxy prinktech-website-blue:3000/g' "$FOUND_CADDYFILE"
        sed -i 's/reverse_proxy prinktech-website:3000/reverse_proxy prinktech-website-blue:3000/g' "$FOUND_CADDYFILE"
    fi
    
    # Reload Caddy container
    if docker ps | grep -q "n8n-caddy-1"; then
        info "Reloading Caddy container (n8n-caddy-1)..."
        docker exec -i n8n-caddy-1 sh -c 'cat > /etc/caddy/Caddyfile' < "$FOUND_CADDYFILE"
        docker exec n8n-caddy-1 caddy reload --config /etc/caddy/Caddyfile
        success "Caddy reload thành công! Cổng traffic mới: $TARGET_PORT."
    else
        warning "Không tìm thấy container n8n-caddy-1 để reload. Vui lòng reload caddy thủ công."
    fi
else
    warning "Không tìm thấy Caddyfile trên VPS. Vui lòng tự cấu hình trỏ domain về container $TARGET_CONTAINER:3000."
fi

# ============================================
# 6. DỪNG CONTAINER CŨ
# ============================================
step "6️⃣  DỪNG CONTAINER CŨ ĐỂ GIẢI PHÓNG TÀI NGUYÊN"

# Chỉ dừng container cũ nếu trước đó nó thực sự đang chạy
OLD_RUNNING=$(docker ps --filter "name=$OLD_CONTAINER" --filter "status=running" -q | wc -l)
if [ "$OLD_RUNNING" -gt 0 ]; then
    info "Đang dừng container cũ ($OLD_CONTAINER)..."
    docker compose stop "$OLD_SERVICE"
    success "Đã dừng container cũ thành công."
else
    info "Không có container cũ nào đang hoạt động."
fi

# Ghi nhận deploy thành công vào lịch sử
DEPLOY_DATE=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$DEPLOY_DATE] SUCCESS: Deployed version $GIT_COMMIT ($COMMIT_MSG) to $TARGET_COLOR. Active port: $TARGET_PORT." >> deploy_history.log

echo ""
echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DEPLOY WEBSITE THÀNH CÔNG!   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
echo ""
echo "  🌐 Domain: https://prinktech.netslive.com"
echo "  📂 Container Active: $TARGET_CONTAINER (Cổng $TARGET_PORT)"
echo "  ⚡ Trạng thái: ZERO-DOWNTIME DEPLOYED"
echo ""
