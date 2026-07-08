# 🔄 SYNC LOCAL → VPS (PRINK TECH)
# Chạy từ Local Windows: .\sync-to-vps.ps1

param(
    [string]$VpsIp = "180.93.146.26",
    [string]$VpsUser = "root",
    [string]$VpsPath = "/srv/website-prinktech"
)

$LocalPath = "D:\16. Code\32-website-prinktech"
$ExcludeFile = "$LocalPath\.rsync-exclude"

# Tạo file exclude nếu chưa có
if (-not (Test-Path $ExcludeFile)) {
    @"
node_modules
.next
.git
.env
.env.local
.env.backup
*.log
*.tar.gz
.DS_Store
"@ | Out-File -FilePath $ExcludeFile -Encoding utf8
}

Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔄 SYNC LOCAL → VPS (PRINK TECH)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan

Write-Host "📤 Đang sync từ Local → VPS ($VpsIp:$VpsPath)..." -ForegroundColor Yellow

# Rsync (cần cài rsync qua Git Bash hoặc WSL)
$rsyncCmd = "rsync -avz --delete --exclude-from='$ExcludeFile' --progress '$LocalPath/' '$VpsUser@$VpsIp:$VpsPath/'"

Write-Host "Lệnh: $rsyncCmd" -ForegroundColor Gray

# Thử dùng bash rsync (Git Bash)
$bashPath = "C:\Program Files\Git\bin\bash.exe"
if (Test-Path $bashPath) {
    & $bashPath -c $rsyncCmd
} else {
    Write-Host "⚠️  Không tìm thấy Git Bash. Hãy cài Git for Windows hoặc dùng WSL." -ForegroundColor Red
    Write-Host "Hoặc chạy thủ công trong Git Bash/WSL:" -ForegroundColor Yellow
    Write-Host $rsyncCmd -ForegroundColor White
}

Write-Host "✅ Sync hoàn tất!" -ForegroundColor Green
Write-Host "💡 Gợi ý: Sau khi sync, SSH vào VPS và chạy: docker compose -f /srv/website-prinktech/docker-compose.yml restart web" -ForegroundColor Cyan
