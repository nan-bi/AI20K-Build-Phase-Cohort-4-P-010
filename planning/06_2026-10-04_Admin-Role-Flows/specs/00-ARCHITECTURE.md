# P06 — Kiến trúc và bất biến

## Mục tiêu

Chứng minh sáu luồng xuyên vai trò dùng cùng trạng thái Prisma mock. Test gọi service nguồn và đích; không dùng database thật, network, Zalo hay VietQR thật.

## Non-goals

- Không sửa schema, API công khai, auth/RolesGuard hay chính sách giữ chỗ.
- Không triển khai compliance queue, OCR, ký hợp đồng, gửi PIN hay webhook bank thật.
- Không khẳng định atomicity/race-safety của mock tương đương PostgreSQL.
- Không sửa lỗi ngoài module Admin trong nhánh này.

## Bất biến BẮT BUỘC

1. Prisma mock dùng chung state object giữa các service trong một scenario; thiếu delegate phải fail rõ ràng, không trả fixture mặc định.
2. Scenario deposit giữ thứ tự webhook → effects Unit/viewing → payout sweep/accrual; retry không nhân đôi `deposit:<id>` payout.
3. FeeConfig thay đổi không ghi ngược khoản payout đã tạo.
4. `ops_admin` không nhận CCCD/SĐT đầy đủ hoặc dữ liệu định danh; không cấp quyền compliance giả.
5. PIN plaintext không xuất hiện trong response, audit, host view hay log.
6. Thời gian cố định trong fixture; dùng tham số `now` nếu service hỗ trợ.

## Thứ tự đọc

1. `orchestration/ADMIN_OPEN_QUESTIONS.md`, `orchestration/CROSS_MODULE_FIXES.md`.
2. `backend/src/modules/admin/admin-flows.spec.ts` (nháp chưa theo dõi), `admin-dispatch.service.spec.ts`.
3. Booking/deposit/admin-deposit/admin-payout/identity/key services và guards.
4. `backend/prisma/schema.prisma`, rồi contract và scenario P06.

## Vùng cấm

Không chế API để test xanh, không sửa module ngoài Admin. Lỗi liên module được ghi vào `orchestration/CROSS_MODULE_FIXES.md` cùng file/line và bằng chứng.
