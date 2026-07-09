# 🛠️ Sổ Tay Khắc Phục Lỗi CI & Triển Khai (Next.js, ESLint, TypeScript & Windows Local)

Tài liệu này tổng hợp các lỗi kinh nghiệm thực tế phát sinh trong quá trình xây dựng hệ thống CI/CD, phân tách Sandbox Dev Workspace, và cách khắc phục triệt để để áp dụng cho các dự án khác.

---

## 1. Lỗi Lệch Lockfile (`npm ci` thất bại trên GitHub Actions)

### 🔴 Triệu chứng
GitHub Actions hoặc VPS báo lỗi đỏ ngay tại bước cài đặt thư viện sạch `npm ci` với mã lỗi `exit code 1` (hoặc `EUSAGE`):
```text
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
```

### 🔍 Nguyên nhân
Lệnh `npm ci` bắt buộc tệp `package-lock.json` và `package.json` phải trùng khớp tuyệt đối 100%. Lỗi xảy ra do:
- AI hoặc lập trình viên chỉnh sửa thủ công tệp `package.json` (ví dụ: thay đổi version package) nhưng quên chạy `npm install` ở local để cập nhật lại `package-lock.json` tương ứng trước khi push.
- Quá trình chạy cài đặt cục bộ ở local bị ngắt quãng hoặc bị lock bởi tiến trình khác.

### 🟢 Cách khắc phục (Quy trình 3 bước chuẩn)
1. **Xóa sạch bộ nhớ tạm và thư mục lỗi ở local:**
   ```powershell
   # Chạy trên Windows PowerShell
   Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules, package-lock.json
   ```
2. **Cài đặt lại để tái sinh lockfile sạch:**
   ```bash
   npm install
   ```
3. **Commit và push lockfile mới lên GitHub:**
   ```bash
   git add package-lock.json
   git commit -m "build: sync package-lock.json to fix CI"
   git push origin master
   ```

### 💡 Giải pháp tối ưu vĩnh viễn cho file CI/CD Workflow (`ci.yml`):
Nếu phiên bản Node/NPM ở máy ảo CI (thường là Node v20/v24 và npm v10) khác biệt so với máy Local (ví dụ: Node v23, npm v11), lệnh `npm ci` rất dễ bị crash do khác biệt cấu trúc lockfile giữa các hệ điều hành/phiên bản npm.
- **Khắc phục**: Thay đổi bước cài đặt thư viện trong tệp cấu hình `.github/workflows/ci.yml`:
  * **Cũ**: `run: npm ci`
  * **Mới**: `run: npm install --legacy-peer-deps`
  *Cách này giúp máy ảo CI tự động phân giải các thư viện tương thích nhất với môi trường chạy thực tế của nó.*

---

## 2. Lỗi Thiếu File Đóng Gói Next.js (`Cannot find module 'next/dist/compiled/babel-packages'`)

### 🔴 Triệu chứng
Khi chạy `next build` hoặc `eslint`, terminal ném lỗi Node.js không tìm thấy module con trong thư mục đã biên dịch của Next.js:
```text
Error: Cannot find module 'next/dist/compiled/babel-packages'
Require stack:
- /node_modules/next/dist/compiled/babel/bundle.js
```

### 🔍 Nguyên nhân
- Sử dụng các phiên bản Next.js **Canary / Experimental** (ví dụ: bản Next.js `16.2.10` tự khởi tạo hoặc do AI đề xuất sai lệch) chưa hoàn thiện và bị lỗi đóng gói (packaging bug) của nhà phát triển Next.js.
- Tiến trình Antivirus (Windows Defender) trên Windows quét thư mục `node_modules` và tự động cách ly/xóa nhầm các file Javascript thực thi `.js` trong tiến trình cài đặt của npm.

### 🟢 Cách khắc phục
- **Hạ cấp Next.js về phiên bản chính thức ổn định (Stable)** tương thích tốt nhất với phiên bản React hiện tại (ví dụ: sử dụng Next.js `15.1.6` nếu chạy React 19):
  Trong `package.json`:
  ```json
  "dependencies": {
    "next": "15.1.6"
  },
  "devDependencies": {
    "eslint-config-next": "15.1.6"
  }
  ```
- Sau khi đổi, bắt buộc phải chạy lại **Quy trình xóa sạch cài lại** ở mục 1 để đảm bảo các file đóng gói được tải đầy đủ.

---

## 3. Lỗi Mất Lệnh Thực Thi trên Windows (`eslint/tsc is not recognized...`)

### 🔴 Triệu chứng
Khi chạy npm run script (ví dụ: `npm run lint` hoặc `npm run type-check`), terminal báo lỗi không nhận diện được lệnh, mặc dù kiểm tra thư mục `node_modules/eslint` hoặc `node_modules/typescript` vẫn tồn tại:
```text
'eslint' is not recognized as an internal or external command,
operable program or batch file.
```
Kiểm tra thư mục `node_modules/.bin/` thấy rỗng hoặc không có file symlink mong muốn.

### 🔍 Nguyên nhân
- Trên hệ điều hành Windows, nếu thư mục dự án nằm ở ổ đĩa khác với ổ đĩa cài đặt Node.js (ví dụ Node ở ổ `C:\` nhưng code ở ổ `D:\`), npm sẽ gặp lỗi quyền ghi chéo ổ đĩa và **âm thầm bỏ qua việc tạo symlink** trong thư mục `.bin/`.
- Quyền User hiện tại của Windows không đủ đặc quyền (Administrator) để tạo link tượng trưng (symlinks).

### 🟢 Cách khắc phục (Giải pháp viết npm script bền bỉ)
Bọc tiền tố lệnh bằng **`npx`** trực tiếp trong cấu hình scripts của `package.json`. Lệnh `npx` sẽ tự phân giải đường dẫn package cục bộ mà không phụ thuộc vào liên kết `.bin`:
```json
  "scripts": {
    "lint": "npx eslint .",
    "lint:fix": "npx eslint . --fix",
    "type-check": "npx tsc --noEmit"
  }
```
*(Cấu trúc này hoạt động hoàn hảo 100% trên cả Windows, Linux và môi trường VPS mà không cần quyền Administrator để tạo symlink).*

---

## 4. Lỗi Phân Giải ESM trong ESLint (`TypeError: nextVitals is not iterable` hoặc `Cannot find module .../eslint-config-next/...`)

### 🔴 Triệu chứng
Khi chạy `next lint` hoặc `npm run lint` trên máy ảo CI (sử dụng Node v22+), hệ thống báo lỗi không phân giải được module con của config hoặc báo lỗi kiểu dữ liệu:
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../node_modules/eslint-config-next/core-web-vitals'
TypeError: nextVitals is not iterable
```

### 🔍 Nguyên nhân
- Từ Node.js v22 trở lên, thuật toán phân giải module ESM của Node.js trở nên cực kỳ nghiêm ngặt đối với các file cấu hình có đuôi mở rộng `.config.mjs`. Nó không cho phép import các package con CommonJS (không có phần mở rộng `.js` rõ ràng hoặc không có exports khai báo).
- Cú pháp spread operator (`...nextVitals`) bị crash do package `eslint-config-next` thực tế export default ra một **Object** CommonJS thông thường, không phải là một config Array (Iterable) nên không thể dùng cú pháp spread.

### 🟢 Cách khắc phục (Đổi sang cấu hình FlatCompat chuẩn Next.js 15)
1. **Cài đặt adapter tương thích ngược cho Flat Config:**
   ```bash
   npm install @eslint/eslintrc --save-dev
   ```
2. **Ghi đè nội dung file `eslint.config.mjs` theo chuẩn FlatCompat của Next.js 15:**
   ```javascript
   import { FlatCompat } from "@eslint/eslintrc";

   const compat = new FlatCompat({
     // import.meta.dirname khả dụng từ Node.js >= 20.11.0
     baseDirectory: import.meta.dirname,
   });

   const eslintConfig = [
     ...compat.extends("next/core-web-vitals", "next/typescript"),
   ];

   export default eslintConfig;
   ```
