# 🚀 Hướng dẫn Đồng bộ hóa & Triển khai mã nguồn qua Git + SSH

Dự án **Prinktech Website** áp dụng chiến lược **Dual-Edit Strategy** (Git + SSH) để đồng bộ và triển khai mã nguồn. Cơ chế này cho phép bạn sửa code linh hoạt từ máy Local (PC), từ VPS (thông qua Hermes Agent), hoặc bất kỳ máy nào khác mà vẫn đảm bảo tính nhất quán.

---

## 🏗️ Kiến trúc Dual-Edit

```
Máy Local (PC)  ←─────────────→  GitHub  ←─────────────→  VPS (Linux)
  (Sửa & Test)      git push / pull         git pull / push     (Chạy Web / Hermes)
```

### Lợi ích:
- ✅ Sửa code ở máy Local hay trực tiếp trên VPS đều được đồng bộ hai chiều.
- ✅ Lịch sử Git đầy đủ, dễ dàng rollback hoặc theo dõi thay đổi.
- ✅ Không cần nén file `.tar.gz` hoặc upload thủ công qua `scp`/`rsync` làm chậm tiến trình.
- ✅ Tận dụng tối đa sức mạnh của Hermes Agent trên VPS để sửa lỗi nhanh.

---

## 🔒 Quy tắc vàng để tránh xung đột (Conflict)

Để vận hành trơn tru cơ chế Dual-Edit và tránh xung đột code, hãy luôn tuân thủ nguyên tắc:
> **"Pull trước khi sửa - Push ngay sau khi sửa"**

---

## 🔄 Quy trình làm việc hàng ngày

### Workflow A: Sửa từ Local (PC) → Triển khai lên VPS

Đây là quy trình khi bạn code trên máy tính cá nhân của mình và muốn deploy lên VPS chạy trực tiếp:

1. **Sửa code trên Local** và commit, push lên GitHub:
   ```bash
   git add .
   git commit -m "feat: mô tả thay đổi"
   git push origin master
   ```
   *(Hoặc sử dụng script tự động: chạy `.\deploy-via-git.ps1` từ PowerShell)*

2. **Cập nhật lên VPS:**
   Nếu không dùng script tự động `deploy-via-git.ps1`, bạn có thể tự SSH vào VPS và chạy:
   ```bash
   ssh vps
   cd /srv/website-prinktech
   git pull origin master
   
   # Biên dịch lại code Next.js và khởi chạy lại container
   bash deploy-vps-git.sh
   ```

---

### Workflow B: Sửa code trên VPS (Hermes Agent hoặc sửa tay)

Đây là quy trình khi bạn sử dụng Hermes Agent trực tiếp trên VPS để sửa code và muốn đồng bộ ngược lại máy Local (PC):

1. **Trước khi sửa trên VPS:**
   Đảm bảo VPS đã được cập nhật bản code mới nhất từ local:
   ```bash
   cd /srv/website-prinktech
   git pull origin master
   ```

2. **Tiến hành sửa code** (Hermes Agent sửa hoặc sửa tay).

3. **Commit và push lên GitHub từ VPS:**
   ```bash
   cd /srv/website-prinktech
   git add .
   git commit -m "hermes: fix something on VPS"
   git push origin master
   ```

4. **Biên dịch và chạy thử bản build mới trên VPS:**
   ```bash
   # Chạy script deploy để build lại Next.js trong docker
   bash deploy-vps-git.sh
   ```

5. **Đồng bộ về máy Local (PC):**
   Tại máy PC của bạn, chạy lệnh sau để kéo code mới về máy:
   ```bash
   git pull origin master
   ```

---

## 🆘 Giải quyết xung đột (Conflict)

Nếu bạn lỡ sửa code ở cả hai bên (Local và VPS) mà chưa push/pull, Git sẽ báo lỗi conflict khi bạn chạy pull. Cách giải quyết:

### Cách 1: Ưu tiên code của Local (ghi đè VPS)
Nếu bạn chắc chắn code ở Local là đúng và muốn VPS tuân theo Local:
```bash
# Trên VPS:
git reset --hard origin/master
git pull origin master
```

### Cách 2: Ưu tiên code của VPS (ghi đè Local)
Nếu bạn chắc chắn code trên VPS (Hermes sửa) mới là đúng và muốn Local tuân theo:
```bash
# Trên Local:
git reset --hard origin/master
git pull origin master
```

---

## 🐳 Lệnh Docker thông dụng trên VPS

- **Xem log container:** `ssh vps "docker compose -f /srv/website-prinktech/docker-compose.yml logs -f web"`
- **Restart container:** `ssh vps "docker compose -f /srv/website-prinktech/docker-compose.yml restart web"`
- **Kiểm tra trạng thái container:** `ssh vps "docker compose -f /srv/website-prinktech/docker-compose.yml ps"`
