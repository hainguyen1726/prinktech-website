# Dual-Edit Strategies for PrinK Tech (Local Windows + VPS Linux)

## Mô hình 1: Git-based (Khuyến nghị cho production)

```
Local ──git push──► GitHub ──git pull──► VPS
       ◄──git pull──         ◄──git push──
```

**Ưu điểm**: History rõ ràng, CI/CD dễ tích hợp, rollback dễ.

**Nhược điểm**: Mỗi lần sửa phải commit/push/pull.

## Mô hình 2: Rsync Direct (Nhanh cho development)

```
Local ──rsync──► VPS
       ◄──rsync──
```

**Ưu điểm**: Sync tức thì, không cần commit.

**Nhược điểm**: Dễ mất code nếu không cẩn thận, không có history.

## Mô hình 3: Mount (Chỉ khi VPS gần Local)

Không khuyến nghị vì network latency cao giữa Windows ↔ Linux VPS.

## Quy trình làm việc khuyến nghị

### Ngày làm việc (Development)

1. Sửa code trên **Local Windows**
2. Test: `npm run dev` + `npm run build`
3. Sync nhanh: `.\sync-to-vps.ps1`
4. Restart container trên VPS:
   ```bash
   ssh root@180.93.146.26 "docker compose -f /srv/website-prinktech/docker-compose.yml restart web"
   ```

### Deploy chính thức

Chạy script `deploy-local-to-vps.ps1` (đã có sẵn).

### Sửa gấp trên VPS (Hotfix)

1. SSH vào VPS
2. Sửa file trực tiếp trong `/srv/website-prinktech/src/...`
3. Restart container
4. **Sau đó sync ngược về Local**: `bash sync-from-vps.sh`
5. Commit thay đổi từ Local lên Git

## Lưu ý quan trọng

- Luôn backup `.env` trước khi sync/deploy
- Không sync folder `node_modules` và `.next`
- Dùng `.rsync-exclude` để tránh sync script + secrets
- Commit thường xuyên khi dùng Git workflow
