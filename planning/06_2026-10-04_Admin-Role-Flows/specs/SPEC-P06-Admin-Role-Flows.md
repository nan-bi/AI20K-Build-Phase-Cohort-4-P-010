# SPEC-P06 — Sáu luồng Admin xuyên vai trò

## Phạm vi file

- Được sửa: `backend/src/modules/admin/admin-flows.spec.ts`; cập nhật `orchestration/CROSS_MODULE_FIXES.md` nếu phát hiện lỗi ngoài Admin.
- Cấm sửa trong WP: schema/migration, API/controller/auth, implementation ngoài Admin. Câu hỏi mới cập nhật trong `orchestration/ADMIN_OPEN_QUESTIONS.md`.

## Sáu kịch bản

1. **Tenant booking → Host ticket → Admin SLA**: tạo Unit AVAILABLE, gọi `BookingService.createBooking`; xác nhận viewing/ticket OFFERED liên kết, đúng Host; đọc SLA tại `offeredAt + slaSeconds + 1`; Admin thấy unit/host/ticket breached. Tier 1 SAD_v2 = 300s.
2. **Webhook cọc → HOLDING → lịch trùng bị hủy → Admin → payout retry**: tạo hai viewing cạnh tranh theo điều kiện trong `DepositService`; gọi webhook success; xác nhận deposit PAID_HOLDING, Unit HOLDING, viewing cạnh tranh được xử lý đúng contract, Admin list thấy deposit. Chạy sweep/accrue hai lần; ví tăng đúng payout SAD_v2 và chỉ một `deposit:<depositId>`. Không khẳng định webhook tự gọi payout: quyết định hiện hành dùng sweep. **Hiện BLOCKED**: `processWebhook` không hủy lịch trùng, giữ cứng 48h, cộng cứng 450.000 và nuốt lỗi DB; ghi cross-module fix, không sửa trong P06.
3. **Landlord exit → Admin countdown → HOLDING block**: mandate ACTIVE; landlord request exit; Admin thấy EXIT_REQUESTED/countdown 15; khi Unit HOLDING, terminate reject 409 và state giữ nguyên.
4. **Admin fee đổi → ticket/sự kiện mới dùng config mới, cũ không đổi**: accrue sự kiện cũ theo config A, admin update B, accrue sự kiện mới, retry sự kiện cũ; assert amounts và wallet deltas theo công thức đã chốt, không áp hồi tố.
5. **eKYC NEEDS_REVIEW → compliance approve → deposit/contract tiếp tục; ops_admin không đọc PII**: chỉ chạy full flow nếu route/role được duyệt và có thật. Nếu thiếu, đánh dấu BLOCKED kèm route/model/guard; không thêm quyền/API. Privacy assertion chỉ dùng response thực tế sẵn có.
6. **Admin rotate key → Host không thấy mã cũ; không response plaintext**: seed key điện tử, rotate, đọc `DispatchService.revealDoorKey(ticketId)`; xác nhận secret cũ/ciphertext không lộ và PIN không xuất hiện trong response/audit/log. Không yêu cầu Host nhận PIN mới vì chưa có kênh phát. **Hiện BLOCKED**: Host read path trả PIN giả cố định, không đọc vault key; ghi cross-module fix, không sửa trong P06.

## Vùng cấm

- Không đổi nghiệp vụ/contract/schema để test pass.
- Không thêm compliance vào RolesGuard; không chế hàng đợi eKYC.
- Không tuyên bố idempotency chống race DB; chỉ kiểm logic tuần tự hiện có.
- Không đổi SAD_v2 oracle sang PRD khi mâu thuẫn.
- `HandoverItem.isNormalWear` và `deductionCost` đã có; không thêm lại.

## Xong khi

Đủ sáu scenario được mô tả và có trạng thái rõ; 1–4 và 6 có assertions state + effects; scenario 5 chỉ PASS nếu dependency được duyệt/đã tồn tại, nếu không BLOCKED và không tính là 6/6 pass. Không rò PII/PIN; không có thay đổi ngoài scope hoặc test skip bị che giấu.

Ngoài ra phải đạt toàn bộ tiêu chí chung tại `TESTING-ACCEPTANCE.md`: route guard 401/403/200 cho mọi `/admin/*`, không đổi contract HTTP hiện có, AuditLog cho mọi mutation/sensitive read, regression backend xanh và diff chỉ nằm trong phạm vi đã duyệt.
