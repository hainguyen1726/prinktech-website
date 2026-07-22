# ⚠️ QUY TẮC BẮT BUỘC: ƯU TIÊN CHẠY DEPLOY QUA GIT & GITHUB (.\deploy-via-git.ps1)
# BỎ QUA FILE NÀY VÀ ƯU TIÊN DÙNG .\deploy-via-git.ps1 ĐỂ GIỮ LỊCH SỬ PHIÊN BẢN VÀ ZERO DOWNTIME, TRỪ KHI KHÁCH HÀNG YÊU CẦU BẰNG VĂN BẢN!

param (
    [string]$ScriptPath = "/srv/website-prinktech/deploy-vps-git.sh"
)

$VPS_IP = "180.93.146.26"
$VPS_USER = "root"
$APP_DIR = "d:\16. Code\32-website-prinktech"

# Colors
$GREEN = "Green"
$YELLOW = "Yellow"
$CYAN = "Cyan"
$RED = "Red"

function Step($msg) {
    Write-Host ""
    Write-Host "════════════════════════════════════" -ForegroundColor $CYAN
    Write-Host "  $msg" -ForegroundColor $CYAN
    Write-Host "════════════════════════════════════" -ForegroundColor $CYAN
}

function Success($msg) {
    Write-Host "✅ $msg" -ForegroundColor $GREEN
}

function Error($msg) {
    Write-Host "❌ $msg" -ForegroundColor $RED
    exit 1
}

# ============================================
# 1. PACK SOURCE CODE
# ============================================
Step "1️⃣  ĐÓNG GÓI MÃ NGUỒN WEBSITE"

Push-Location $APP_DIR

Write-Host "📦 Nén source code (loại bỏ node_modules, .next, .git, .env)..." -ForegroundColor Cyan
tar -czf website-prinktech.tar.gz `
    --exclude=node_modules `
    --exclude=.next `
    --exclude=.git `
    --exclude=.env `
    --exclude=.env.local `
    --exclude=website-prinktech.tar.gz `
    .

if ($LASTEXITCODE -ne 0) {
    Error "Nén source code thất bại!"
}

$tarSize = (Get-Item "website-prinktech.tar.gz").Length / 1MB
Write-Host "  Kích thước file nén: $([Math]::Round($tarSize, 2)) MB"

Pop-Location

Success "Đóng gói hoàn tất."

# ============================================
# 2. UPLOAD LÊN VPS
# ============================================
Step "2️⃣  TẢI LÊN VPS"

Write-Host "📤 Tải file nén website-prinktech.tar.gz → root@${VPS_IP}:/srv/" -ForegroundColor Cyan
scp -P 22 "$APP_DIR\website-prinktech.tar.gz" "${VPS_USER}@${VPS_IP}:/srv/"

if ($LASTEXITCODE -ne 0) {
    Error "Không thể upload website-prinktech.tar.gz!"
}

Write-Host "📤 Tải script Zero-Downtime deploy → root@${VPS_IP}:${ScriptPath}" -ForegroundColor Cyan
scp -P 22 "$APP_DIR\deploy-vps-git.sh" "${VPS_USER}@${VPS_IP}:$ScriptPath"

if ($LASTEXITCODE -ne 0) {
    Error "Không thể upload script deploy!"
}

if (Test-Path "$APP_DIR\.env.local") {
    Write-Host "📤 Tải file cấu hình .env.local → root@${VPS_IP}:/srv/website-prinktech.env" -ForegroundColor Cyan
    scp -P 22 "$APP_DIR\.env.local" "${VPS_USER}@${VPS_IP}:/srv/website-prinktech.env"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Không thể upload .env.local lên VPS!" -ForegroundColor Yellow
    }
}

Success "Tải lên thành công."

# ============================================
# 3. KÍCH HOẠT DEPLOY TRÊN VPS
# ============================================
Step "3️⃣  TRIỂN KHAI TRÊN VPS"

Write-Host "🚀 Chạy script deploy từ xa..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_IP}" "bash $ScriptPath"

if ($LASTEXITCODE -ne 0) {
    Error "Quá trình chạy deploy trên VPS bị lỗi!"
}

Success "Triển khai hoàn tất."

# ============================================
# 4. DỌN DẸP FILE TẠM
# ============================================
Step "4️⃣  DỌN DẸP LOCAL"

Write-Host "🧹 Xóa file nén website-prinktech.tar.gz tạm..." -ForegroundColor Cyan
Remove-Item "$APP_DIR\website-prinktech.tar.gz" -Force

Success "Dọn dẹp xong."

# ============================================
# SUMMARY
# ============================================
Write-Host ""

Write-Host ""
Write-Host "  🌐 Website: https://prinktech.netslive.com" -ForegroundColor Cyan
Write-Host "  📂 Đường dẫn VPS: /srv/website-prinktech" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Xem Logs: ssh root@${VPS_IP} 'docker compose -f /srv/website-prinktech/docker-compose.yml logs web --tail=50'" -ForegroundColor Cyan
Write-Host ""
