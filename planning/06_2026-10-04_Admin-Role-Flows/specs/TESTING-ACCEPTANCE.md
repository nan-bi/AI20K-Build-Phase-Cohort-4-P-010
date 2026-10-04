# P06 — Kiểm thử và nghiệm thu

## Tiêu chí nghiệm thu chung (bắt buộc)

1. **Route guard:** mọi route `GET|POST|PUT|PATCH|DELETE /admin/*` đang đăng ký phải có test `401` (chưa xác thực), `403` (sai role) và `200` (ops_admin hợp lệ); route có DTO/state conflict phải giữ thêm test 400/404/409 phù hợp. Sinh ma trận route từ `admin.controller.ts` và routes admin đăng ký ở module khác, đối chiếu test HTTP hiện có.
2. **Tương thích route:** không đổi tên/xóa route hoặc đổi shape/status của response hiện hữu. Bằng chứng là `git diff` trên controller, DTO, route table và snapshot/expect HTTP trước/sau; mọi ngoại lệ phải được duyệt trước.
3. **AuditLog:** mọi thay đổi cấu hình/trạng thái và mọi lần đọc dữ liệu nhạy cảm đều phải tạo audit có actor, action, entity, timestamp và lý do/đích đọc phù hợp. Test phải chứng minh audit được ghi đúng một lần, không chứa PII/secret; lỗi nghiệp vụ không được ghi audit thành công.
4. **Regression baseline:** toàn bộ test backend cũ phải pass; tiêu chí đầu vào người dùng cung cấp là **9 suite / 149 test pass**. `orchestration/ADMIN_AUDIT.md` ghi baseline khác là **12 suite / 234 test pass**. Trước triển khai cần chạy baseline trên HEAD và chốt con số thực tế; cổng yêu cầu số test pass không giảm, fail=0, skip=0.
5. **File scope:** chỉ đổi file trong package P06, module Admin/backend admin test và tài liệu liên module ghi rõ trong plan. File module khác chỉ được thêm thay đổi nhỏ đã nêu trong plan/cross-module; không sửa implementation module khác nếu chưa có duyệt riêng.

## Ma trận test

| # | Bằng chứng | Gate |
|---|---|---|
| 1 | viewingId/ticketId/hostId, tier/SLA, breached/secondsOverdue | ✅ local khi Jest pass |
| 2 | deposit/unit/viewing state, viewing bị hủy, Admin listing, wallet before/after, transRef count, retry delta=0 | ⬜ hiện blocked: webhook hard-code 48h/450.000, không hủy viewing trùng, nuốt lỗi DB |
| 3 | countdown=15, lỗi 409 khi HOLDING, state không đổi | ✅ local khi Jest pass |
| 4 | payout amount A/B, payout cũ không đổi, wallet delta | ✅ local khi công thức được duyệt |
| 5 | eKYC transition, compliance authorization, flow tiếp tục, ops PII scan | ⬜ blocked tới khi compliance backlog được duyệt/triển khai |
| 6 | Host projection không chứa secret cũ/ciphertext; response/audit/log không plaintext | ⬜ hiện blocked: `revealDoorKey` trả PIN giả cố định, không đọc key vault |

## Exit Gates

- **Local:** test mục tiêu exit 0; toàn bộ suite exit 0; build exit 0; `git diff --check` exit 0.
- **Route guard:** ma trận toàn bộ `/admin/*` có 401/403/200 pass.
- **Tương thích:** không có route rename/delete/response change trong `git diff`.
- **Audit:** mọi cấu hình/trạng thái và sensitive read có AuditLog assertions đạt; audit không làm lộ PII/secret.
- **Regression:** pass count ≥ baseline đã xác minh, fail=0, skip=0.
- **File scope:** không có file ngoài phạm vi; ngoại lệ module khác phải được liệt kê và giới hạn như plan.
- **Chất lượng:** đủ sáu scenario có trạng thái; 0 skip; không giả lập route compliance; lỗi DB không biến thành dữ liệu thành công.
- **Scope:** diff đúng phạm vi; schema unchanged; lưu diff stat và SHA.
- **Privacy:** scan response surfaces không PII/PIN; một leak là FAIL.
- **Server:** ⬜ không áp dụng, không deploy.
- Scenario 5 phải được quyết định trước khi ghi nhận 6/6 nghiệm thu.

## Phép đo phải từng đỏ

Trước khi kết luận xanh, cố tình làm đỏ tối thiểu các phép đo mới sau rồi phục hồi:

1. Bỏ idempotency webhook/accrual → test duplicate phải fail.
2. Cho terminate mandate khi Unit HOLDING → test 409/state phải fail.
3. Serialize PII hoặc ciphertext/PIN vào response → privacy scan phải fail.

Ghi lệnh và exit code của từng phép đo đỏ; sau phục hồi chạy lại suite.

## Report cuối

Gồm khai vai; lệnh + exit code; tổng/pass/fail/skip; diff stat + SHA; bảng WP/tầng thực tế; việc không làm và lý do; câu hỏi cần người. Không đóng khi thiếu evidence hoặc câu hỏi eKYC chưa có quyết định.
