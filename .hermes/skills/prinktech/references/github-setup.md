# GitHub Setup — PrinK Tech Website

**Repository**: https://github.com/hainguyen1726/prinktech-website  
**Created**: 2026-07-08  
**Method**: `gh repo create` (GitHub CLI v2.96.0)

## Remote Configuration

```bash
git remote -v
# origin  https://github.com/hainguyen1726/prinktech-website.git (fetch)
# origin  https://github.com/hainguyen1726/prinktech-website.git (push)
```

## Initial Commit

```
87c79fb Initial commit from Create Next App
```

## Workflow

### Push code mới (sau khi sửa)

```bash
git add .
git commit -m "feat: mô tả thay đổi ngắn gọn"
git push origin master
```

### Pull code từ GitHub (khi có thay đổi từ nơi khác)

```bash
git pull origin master
```

### Sync 2 chiều (Local ↔ GitHub ↔ VPS)

1. Sửa code trên Local
2. `git commit && git push`
3. SSH VPS → `cd /srv/website-prinktech && git pull origin master`
4. `docker compose restart web`

## Lưu ý

- Branch mặc định: `master` (không phải `main`)
- Visibility: Public
- Token scopes: `gist`, `read:org`, `repo`, `workflow`
- Không push `.env*`, `node_modules`, `.next`
