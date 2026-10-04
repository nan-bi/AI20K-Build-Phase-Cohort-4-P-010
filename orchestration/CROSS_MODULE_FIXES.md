# CROSS_MODULE_FIXES — Lỗi ngoài module admin (KHÔNG sửa ở nhánh `feat/admin-flows`)

| # | Vị trí | Mô tả | Đề xuất sửa |
|---|---|---|---|
| 1 | `backend/src/modules/deposit/deposit.service.ts:122-155` (`processWebhook`) | Webhook `@Public` không xác thực chữ ký; trùng `bankRefNumber` ném lỗi bị `catch` nuốt rồi trả `success:true`; không kiểm Unit đang AVAILABLE (thiếu khóa dòng `FOR UPDATE`); không hủy lịch trùng; cộng ví Host cứng 450.000; hạn giữ cứng 48h (dòng 119) | Xác thực chữ ký/secret; tìm EscrowTransaction theo `bankRefNumber` trước (idempotent); khóa unit trong transaction, ≠AVAILABLE → đánh dấu cọc cần xử lý thủ công; hủy lịch trùng; đọc `holding_duration_days`; tính payout theo công thức FeeConfig với `transRef=deposit:<id>`; bỏ catch trả giả |
| 2 | `backend/src/modules/dispatch/dispatch.service.ts:152` (`reveal-key`) | Route `@Public`, lộ mã khóa không xác thực | `@Roles('field_host')`, chỉ khi ticket ACCEPTED/CHECKED đúng căn, ghi audit, không trả plaintext lưu trữ |
| 3 | `backend/src/modules/identity` (`GET /identity/:depositId`) | Công khai, trả dữ liệu định danh, không audit | Guard theo vai, audit mọi lần đọc, che dữ liệu |
| 4 | `backend/src/modules/booking/booking.service.ts:96` | Ticket cứng `tier 1, slaSeconds 300`; viewing + ticket không trong transaction | `$transaction`; đọc SLA từ cấu hình; (đề xuất) lưu snapshot phí |
| 5 | `backend/src/modules/deposit/deposit.service.ts` (`uploadHostReceipt`) | Chỉ log, không đổi DB | Đổi trạng thái UNC_PENDING_REVIEW thật + khóa tạm |

## 6. Gọi AdminPayoutService.accrue* từ luồng thật (Bước 2)
- `AdminPayoutService.accrueViewing(viewingId)`: gọi sau khi Viewing chuyển COMPLETED (host/booking).
- `AdminPayoutService.accrueDeposit(depositId)`: gọi sau khi HoldingDeposit chuyển PAID_HOLDING (webhook deposit).
- Hiện chưa móc; dùng `POST /admin/payouts/sweep` để bù. Sweep dùng cấu hình tại thời điểm quét, không phải lúc sự kiện.
- `HostPayout.transRef` chưa `@unique`: chống trùng chỉ bằng findFirst trong transaction (có race); đề xuất `@@unique([transRef])` (ghi trong ADMIN_OPEN_QUESTIONS).


## Door PIN lưu gần như plaintext (phát hiện Bước 5)
- `backend/src/modules/contract/contract.service.ts` (~L129) lưu `vaultSecretRef` dạng `vault:aes256:pin:${doorPin}` — PIN nằm nguyên văn, không mã hóa thật. Nên dùng `PhoneService.encrypt` như `landlord-consignment.service.ts`. Không sửa trên nhánh `feat/admin-flows`.