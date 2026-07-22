# 🚀 DEPLOY VIA GIT & SSH (PRINK TECH WEBSITE)
# ⚠️ QUY TẮC BẮT BUỘC KHÓA HỆ THỐNG: LUÔN ƯU TIÊN SỬ DỤNG SCRIPT NÀY (.\deploy-via-git.ps1) ĐỂ PUSH MÃ NGUỒN LÊN GITHUB & DEPLOY VPS ZERO-DOWNTIME, TRỪ KHI KHÁCH HÀNG YÊU CẦU KHÁC BẰNG VĂN BẢN!
# Chạy từ máy Local (Windows): .\deploy-via-git.ps1

param(
    [string]$CommitMsg = "deploy: update from local via script"
)

$VPS_IP = "180.93.146.26"
$VPS_USER = "root"
$APP_DIR = "d:\16. Code\32-website-prinktech"
$REMOTE_SCRIPT = "/srv/website-prinktech/deploy-vps-git.sh"

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
# 0. CHẠY KIỂM TRA & TỰ ĐỘNG SỬA LỖI
# ============================================
Step "0️⃣  KIỂM TRA CHẤT LƯỢNG MÃ NGUỒN"

# Write-Host "🔍 Đang chạy kiểm tra Lint, TypeScript & Build..." -ForegroundColor Cyan
# node check-and-fix.js
# 
# if ($LASTEXITCODE -ne 0) {
#     Error "Kiểm tra mã nguồn thất bại! Tiến trình push và deploy bị HỦY để tránh lỗi trên VPS Production."
# }
# 
# Success "Mã nguồn sạch. Đủ điều kiện deploy."

# ============================================
# 1. COMMIT & PUSH TO GITHUB FROM LOCAL
# ============================================
Step "1️⃣  COMMIT & PUSH LÊN GITHUB"

Push-Location $APP_DIR

Write-Host "📦 Kiểm tra trạng thái Git local..." -ForegroundColor Cyan
$status = git status --porcelain

if ($null -eq $status -or $status -eq "") {
    Write-Host "Working tree clean. Không có gì thay đổi để commit." -ForegroundColor Yellow
} else {
    Write-Host "Phát hiện thay đổi. Đang commit & push..." -ForegroundColor Cyan
    git add .
    git commit -m $CommitMsg
    git push origin master
    if ($LASTEXITCODE -ne 0) {
        Error "Push lên GitHub thất bại! Vui lòng kiểm tra lại kết nối hoặc SSH key."
    }
    Success "Đã push code mới lên GitHub."
}

Pop-Location

# ============================================
# 2. RUN DEPLOY SCRIPT ON VPS VIA SSH
# ============================================
Step "2️⃣  KÍCH HOẠT DEPLOY TRÊN VPS"

Write-Host "📤 Đồng bộ script deploy lên VPS..." -ForegroundColor Cyan
scp "$APP_DIR\deploy-vps-git.sh" "${VPS_USER}@${VPS_IP}:$REMOTE_SCRIPT"

Write-Host "🚀 Đang gửi lệnh thực thi deploy qua SSH..." -ForegroundColor Cyan
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=5 "${VPS_USER}@${VPS_IP}" "bash $REMOTE_SCRIPT"

if ($LASTEXITCODE -ne 0) {
    Error "Quá trình deploy trên VPS gặp lỗi!"
}

Success "Triển khai hoàn tất thành công trên VPS!"
Write-Host ""
Write-Host "🌐 Website: https://prinktech.netslive.com" -ForegroundColor Cyan
Write-Host ""
