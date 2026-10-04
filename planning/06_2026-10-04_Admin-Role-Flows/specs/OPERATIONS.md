# P06 — Vận hành, bằng chứng, rollback

## Thứ tự

1. Chờ duyệt kế hoạch và câu hỏi trong `orchestration/ADMIN_OPEN_QUESTIONS.md`.
2. Đọc services/controller hiện hành; xác nhận chữ ký webhook và Host key read path trước khi viết.
3. Sửa mock chung và scenario; không đổi implementation ngoài Admin.
4. Chạy test mục tiêu, suite, build, `git diff --check`; lưu output/exit code.
5. Đo lại file scope, diff stat và SHA; ghi report theo AGENTS.md.

## Lệnh đo (tại `backend/`)

```powershell
npm test -- --runInBand modules/admin/admin-flows.spec.ts
npm test -- --runInBand
npm run build
```

Tại root:

```powershell
git diff --check
git diff --stat
git rev-parse HEAD
```

Ghi exit code trực tiếp, không pipe qua grep.

## Rollback

Chỉ revert file do P06 tạo sau khi xem `git status` và diff. Không discard `admin-flows.spec.ts` vì file này đã tồn tại trước WP và hiện untracked. P06 không sửa schema nên không có rollback DB.

## Bảng lỗi

| Lỗi | Hành vi điều phối |
|---|---|
| Brain hub missing | Ghi lệnh/exit 1; không sửa engine hoặc bypass |
| Thiếu compliance contract | Đánh dấu scenario 5 blocked, xin quyết định; các WP độc lập có thể tiếp tục sau duyệt |
| Lỗi ngoài Admin | Ghi `orchestration/CROSS_MODULE_FIXES.md`, không tự sửa |
| Mock thiếu delegate | Sửa mock theo source thật; không nới assertion |
| Diff ngoài scope | Dừng gate và xử lý phạm vi trước khi nghiệm thu |
