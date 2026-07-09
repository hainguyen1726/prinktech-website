#!/bin/bash
# 🛠️ SCRIPT KIỂM TRA & SỬA LỖI TRÊN VPS (DEV WORKSPACE)
# Chạy từ VPS: bash check-and-fix.sh

set -e

# Đảm bảo di chuyển vào đúng thư mục dự án
cd "$(dirname "$0")"

# Thực thi script kiểm tra Node.js
node check-and-fix.js
