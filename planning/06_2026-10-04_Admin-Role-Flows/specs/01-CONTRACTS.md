# P06 — Contract mock Prisma và test

## Entry point

`backend/src/modules/admin/admin-flows.spec.ts`, Jest `testRegex: .*\.spec\.ts$`.

```ts
function makeDb(): { db: SharedState; prisma: PrismaMock }
```

`makeDb` trả một mutable state và Prisma mock. Các service trong scenario cùng nhận mock/state đó. Chỉ cài delegates thật sự được gọi; delegate thiếu phải throw.

## Chuyển tiếp và oracle

| Luồng | API hiện có (chữ ký cụ thể xác nhận tại source trước thi công) | Oracle |
|---|---|---|
| Booking → dispatch → SLA | `BookingService.createBooking(input)`; `AdminDispatchService.getSlaMonitoring(now)` | Viewing/ticket liên kết; đúng host/tier; SLA được tính tại thời điểm cố định |
| Webhook → HOLDING → hủy lịch → Admin → payout | `DepositService.processWebhook(dto)`; `AdminDepositService.listDeposits(query)`; `AdminPayoutService.sweep(actor)` hoặc `accrueDeposit(id)` | PAID_HOLDING, Unit HOLDING, viewing xung đột xử lý đúng contract, admin thấy deposit, một transRef `deposit:<id>`. Hiện webhook vi phạm các oracle này; scenario blocked tới khi lỗi ngoài Admin được cho phép xử lý |
| Landlord exit | `LandlordMandateService.requestExit(actorId,dto,now)`; `AdminInventoryService.getExclusiveInventory(now)`; `terminateMandate(id,reason,actor,now)` | Countdown 15; HOLDING gây Conflict; mandate/unit không đổi |
| Fee config | `AdminFeeService.updateCommissionParam(dto,actor)`; `AdminPayoutService.accrueViewing(viewingId)` | Cấu hình mới áp sự kiện mới; payout cũ giữ amount đã ghi |
| eKYC/PII | Chỉ dùng API/guard có thật và được duyệt; không có thì scenario BLOCKED | Không mock endpoint compliance; ops_admin response không lộ identifier |
| Door key | `AdminKeyService.rotateKey(id,{reason},actor,now)`; `listKeys()`; `DispatchService.revealDoorKey(ticketId)` | Secret cũ không tới Host; plaintext/ciphertext không serialize. Host read path hiện trả PIN giả cố định, chưa đọc key đã rotate; scenario blocked tới khi lỗi ngoài Admin được cho phép xử lý |

## Luật BẮT BUỘC / CẤM

- BẮT BUỘC assert state trước/sau, ID liên kết, wallet delta và caller-visible effects.
- BẮT BUỘC retry webhook/accrual trên cùng state.
- BẮT BUỘC lỗi DB propagate, không success giả.
- CẤM sửa schema hoặc thêm unique constraint trong P06.
- CẤM giả vờ compliance endpoint đã có; cấm trả PIN plaintext; cấm coi `transRef` DB-unique.

## Phân loại lỗi và caller

| Loại | Phản ứng bắt buộc |
|---|---|
| 400 DTO/config sai | Assert BadRequest, state không đổi |
| 404 entity thiếu | Assert NotFound, không tạo side effect |
| 409 Unit không AVAILABLE/HOLDING/state conflict | Assert Conflict, không ghi thành công/cộng ví |
| DB/internal | Assert reject; không fallback success |
| BLOCKED compliance | Ghi route/role/model thiếu; không tạo API giả |

## Số đo nghiệm thu

Ghi tổng scenario/pass/blocked, Jest pass/fail/skip, state cuối của deposit/unit/viewing, wallet delta, payout count theo transRef, và kết quả scan PII/PIN ở response/audit/Host view. Mọi lệnh có exit code nguyên văn.
