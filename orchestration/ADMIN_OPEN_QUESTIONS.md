# ADMIN_OPEN_QUESTIONS — Câu hỏi mở (mặc định theo SAD_v2)

| # | Chủ đề | Mâu thuẫn | Mặc định tạm dùng |
|---|---|---|---|
| 1 | Thời hạn giữ chỗ | SAD_v2 = 7 ngày; PRD gốc = 24h; PRD §3.5 (0334ebf) + AGENTS.md = 48h (12–72h, Admin cài); code webhook cứng 48h; seed `holding_duration_days=7` | Đọc `holding_duration_days` từ FeeConfig (SAD_v2); không hard-code. Cần chốt đơn vị (ngày vs giờ) |
| 2 | SLA dispatch | SAD_v2: 5p → 3p (≤500m) → broadcast; PRD: 3p nhận việc, tầng 1 ≤200m; booking.service cứng 300s | SAD_v2 (tầng 1=300s, tầng 2=180s) |
| 3 | OTP | PRD 4 số; SAD_v2 (ký) 6 số | SAD_v2 |
| 4 | Webhook cọc | SAD_v2 ≤5s; PRD AC ≤10s | SAD_v2 |
| 5 | Tên key biến phí | SAD: `rating_multiplier_5star`, `slow_inventory_bonus`; PRD AC 4.1.1: `rating_multiplier`, `campaign_bonus`; seed dùng tiền tố `host_` | Giữ key seed hiện có, thêm key SAD khi cần |
| 6 | Khoảng giá trị biến phí | SAD §3.2 ghi "đề xuất, chờ Ops chốt" | Dùng đúng khoảng SAD §3.2 |
| 7 | Hoàn/tịch thu cọc | Chưa chốt (SAD §6.3); code `voidHold` tự đặt "hoàn 100%" | Chỉ khung trạng thái + audit, không tự quyết số tiền |
| 8 | Làm tròn VND | Chưa thấy quy ước trong code | **Cần anh/chị chốt** (đề xuất: Decimal, làm tròn nguyên đồng, half-up) |
| 9 | Công thức payout Host | Chưa có công thức chính thức (cách kết hợp base × rating × peak + deal_commission) | **Cần chốt** trước Bước 2 |
| 10 | Vai compliance_officer / area_lead | Chưa có trong `auth.constants.ts` (chỉ 4 portal); không có role `system` trong seed | Cần xác nhận cách đăng nhập/portal; có thể phải sửa auth (ngoài phạm vi) |
| 11 | Phễu BI giai đoạn "matchmaker" | Không có bảng lưu lượt matchmaker | Cần schema/bảng sự kiện (đề xuất sửa schema) hoặc bỏ giai đoạn |
| 12 | Grace-period FOMO | PRD §3.5: ca xem 45' + ân hạn 30' = 75' tự mở lại | Chưa thuộc phạm vi admin; ghi nhận |
| 13 | HandoverItem | Đề bài nói thiếu `isNormalWear/deductionCost`; schema hiện **đã có** | Không còn là vấn đề |

## Đề xuất sửa schema (chưa thực hiện, cần phép)
- Bảng sự kiện funnel (hoặc cột `source`) cho lượt matchmaker.
- Bảng phiên bản FeeConfig (`effective_from`) để ticket cũ giữ nguyên cấu hình; hoặc lưu snapshot phí vào `DispatchTicket` (cột `feeSnapshot Json`).
- `HostPayout` thiếu liên kết ticket/deposit để bảng kê chi tiết và chống tính trùng.

## QUYẾT ĐỊNH ĐÃ CHỐT (2026-10-04) — áp dụng cho các bước sau

| # | Nội dung | Trạng thái |
|---|---|---|
| 1 | Giữ chỗ: nguồn duy nhất FeeConfig `holding_duration_days` (ngày, mặc định 7). `/admin/settings/hold-policy` giữ lại, đọc/ghi FeeConfig, có audit, giữ nguyên trường response cũ, thêm trường mới nếu cần đơn vị mới. Khoảng hợp lệ 1–14 ngày | ĐÃ CHỐT; khoảng 1–14 **[CHỜ XÁC NHẬN]** |
| 2 | SLA dispatch 300s/180s; OTP ký 6 số; webhook ≤5s theo SAD_v2. Ngoài phạm vi admin | ĐÃ CHỐT |
| 3 | Key biến phí giữ key seed (tiền tố `host_`), key mới cùng tiền tố; khoảng theo SAD_v2 §3.2 | ĐÃ CHỐT |
| 4 | VND: Decimal, làm tròn nguyên đồng, half-up | ĐÃ CHỐT |
| 5 | Payout mỗi ca cọc thành công = base_viewing_fee × peak_hour_multiplier (nếu giờ vàng, else ×1) + deal_commission × rating_multiplier_5star (nếu khách chấm 5 sao, else ×1). Tính tại thời điểm sự kiện, ghi số tiền đã tính; chống trùng bằng `HostPayout.transRef` duy nhất `deposit:<id>`. Không sửa schema | ĐÃ CHỐT; công thức + định nghĩa giờ vàng **[CHỜ XÁC NHẬN]** |
| 6 | Bước 1 khóa toàn bộ `/admin/*` bằng `ops_admin`. Hàng đợi eKYC compliance_officer BỎ khỏi vòng này (backlog), không sửa auth | ĐÃ CHỐT |
| 7 | BI funnel chỉ hiển thị giai đoạn có dữ liệu thật; "matchmaker" trả `null` + `available:false`. Không sửa schema | ĐÃ CHỐT |
| 8 | Trong hàm admin được sửa: bỏ mọi `catch` trả dữ liệu giả (lỗi DB → lỗi HTTP). `getContracts` bỏ PII (CCCD, SĐT đầy đủ) | ĐÃ CHỐT |
| 9 | `voidHold`: không tự quyết hoàn/tịch thu; chỉ chuyển trạng thái tối thiểu + audit, message trung tính | ĐÃ CHỐT |
| 10 | Lỗi ngoài module admin KHÔNG sửa ở nhánh này; ghi vào `CROSS_MODULE_FIXES.md` | ĐÃ CHỐT |
| 11 | Đề xuất sửa schema chỉ ghi nhận | ĐÃ CHỐT |

Backlog: hàng đợi eKYC NEEDS_REVIEW cho compliance_officer (cần portal đăng nhập trước). Các câu #1–#4, #6, #8, #11 trong bảng trên (bản cũ) được thay thế bởi bảng này.

## Cập nhật Bước 2 (2026-10-04)
- ĐÃ XÁC NHẬN: khoảng giữ chỗ `holding_duration_days` = 1–14 ngày nguyên. Được phép cập nhật `ai-pack/ROUTE_GUARD_TABLE.md` (làm cuối Bước 2).
- [ĐỀ XUẤT SCHEMA, chưa làm] `HostPayout.transRef`: thêm `@@unique` (hiện `String?` không unique; chống trùng dựa vào kiểm tra + transaction, hai request đồng thời vẫn có thể trùng).
- [ĐỀ XUẤT SCHEMA, chưa làm] `HostPayout`: thêm cột chi tiết khoản (loại A/B/C, đầu vào cấu hình) thay vì chỉ ghi vào AuditLog.
- Thiếu khóa seed `host_peak_hour_start` / `host_peak_hour_end`: chưa có ⇒ không áp hệ số giờ vàng. Cần Ops xác nhận khung giờ.
- Móc `accrueViewing` / `accrueDeposit` vào module host/deposit: chưa làm (tránh xung đột với nan-bi); thay bằng `POST /admin/payouts/sweep`.

## Cập nhật Bước 3 (2026-10-04)
- ĐÃ CHỐT: `:id` của `POST /admin/bookings/:id/reassign` là Viewing id; chặn leo thang khi ticket đã ở tầng 3; tầng 3 dùng `slaSeconds` = 180 (SAD_v2 không nêu số riêng).
- Thay đổi hợp đồng request: reassign nay BẮT BUỘC thêm `reason` (frontend cũ chỉ gửi `hostId` sẽ nhận 400; cần cập nhật apps/web).
- Ticket `ESCALATED` không hiện trong pool Host (API host chỉ lấy `hostId=null` + `OFFERED`): admin phải giao lại thủ công; cần quyết định có cho Area Lead nhận ticket tầng 3 không.
- `isBreached` chỉ tính lúc đọc cho ticket `OFFERED`; không có job tự chuyển `EXPIRED` (ngoài phạm vi).
- [ĐỀ XUẤT SCHEMA, chưa làm] `DispatchTicket`: thêm `escalatedAt`, `reassignedAt`, `interventionReason` (hiện chỉ lý do nằm trong AuditLog; `offeredAt` bị reset khi giao lại/leo thang).

## Cập nhật Bước 4 (2026-10-04)
- ĐÃ CHỐT: sau khi mandate TERMINATED, Unit chuyển UNLISTED; ngưỡng cảnh báo heatmap < 80% lấp đầy; `reason` của reassign giữ bắt buộc (apps/web chưa gọi route này).
- Phễu BI: giai đoạn 1 (truy cập) và 2 (matchmaker) không có bảng ⇒ `count:null, available:false`; `avgDecisionTimeMinutes` null. Đề xuất schema (chưa làm): bảng sự kiện truy cập/matchmaker, mốc `decidedAt`.
- LƯU Ý HÌNH DẠNG: `dropRate`, `noShowRate`, `occupancyRate` đổi từ chuỗi mock ('3.8%') sang số (phần trăm, 1 chữ số thập phân) — trước đây là dữ liệu giả nên không có client thật phụ thuộc; cần xác nhận khi nối UI thật.
- Terminate mandate chỉ cho phép khi mandate EXIT_REQUESTED, đã qua `exitEffectiveAt`, Unit không HOLDING, không có Contract ACTIVE/AWAITING_*/DISPUTED. Audit ghi qua AuditService (ngoài transaction vì AuditService dùng Prisma riêng) — cân nhắc audit trong cùng transaction.
- CÒN MỞ: `consignments/:id/approve|reject` vẫn là giả (chỉ log); chưa có quyết định luồng PENDING_INSPECTION → ACTIVE.

## Cập nhật Bước 5 (2026-10-04)
- ĐÃ CHỐT: bỏ hẳn SĐT/CCCD khỏi `GET /admin/contracts` (không che 4 số cuối); `voidHold` chỉ ghi audit `DEPOSIT_VOID_REQUESTED`, không đổi `paymentStatus`; từ chối UNC ⇒ `QR_EXPIRED`.
- CÒN MỞ (chính sách): hủy cọc giữ chỗ khi chủ nhà vi phạm / bất khả kháng thì hoàn hay tịch thu, và phạt vi phạm bao nhiêu? `DepositStatus` chưa có trạng thái "hủy trung tính". Đề xuất (chưa làm schema): thêm trạng thái hoặc bảng yêu cầu hủy.
- `POST /admin/contracts/:id/void-hold`: `:id` là id của HoldingDeposit (giữ đường dẫn cũ để không vỡ frontend).
- Mã khóa: rotate sinh PIN 6 số, mã hóa bằng `PhoneService.encrypt` (AES) rồi lưu `vaultSecretRef`; PIN không trả về cho admin nên chưa có kênh gửi mã mới cho Host/khách (cần quyết định luồng).
- Chưa làm: hàng đợi eKYC `NEEDS_REVIEW` cho compliance_officer (role chưa có trong RolesGuard); `GET /admin/contracts/:id`, `complete-exit`, `remind-renewal` vẫn là dữ liệu giả (getContractById chứa SĐT/CCCD giả).

## Câu hỏi mở cho Bước 6 — test xuyên vai trò (2026-10-04)

Mặc định theo SAD_v2; mục này chỉ định oracle kiểm thử, không cho phép đổi contract/schema.

| # | Chủ đề | Bất nhất / bằng chứng | Mặc định cho test | Cần duyệt |
|---|---|---|---|---|
| 1 | Giữ chỗ | SAD_v2=7 ngày; PRD gốc=24h; PRD §3.5 ở `0334ebf` + AGENTS.md=48h; FeeConfig seed=7 ngày; Bước 2 chốt đọc `holding_duration_days` | FeeConfig `holding_duration_days`, mặc định 7 ngày; không hard-code 24/48h | Xác nhận giữ quyết định Bước 2 |
| 2 | Dispatch SLA | SAD_v2=5p→3p (≤500m)→broadcast; PRD=3p nhận việc, tier 1 ≤200m; booking hiện tạo 300s | SAD_v2 tier 1=300s, tier 2=180s; không đo khoảng cách/broadcast nếu code chưa có | Không, trừ khi đổi SAD_v2 |
| 3 | OTP | PRD=4 số; SAD_v2 ký=6 số | 6 số; không tạo OTP mới trong Bước 6 | Không, trừ khi đổi SAD_v2 |
| 4 | Webhook SLA | SAD_v2≤5s; PRD AC≤10s | ≤5s theo SAD_v2; mock Prisma không đo hiệu năng thật | Xác nhận có đưa performance test thật vào bước này không |
| 5 | HandoverItem | Yêu cầu nói thiếu `isNormalWear`/`deductionCost`; schema hiện có cả hai trường | Đã giải quyết theo `backend/prisma/schema.prisma`; không sửa schema | Không |
| 6 | eKYC/compliance | Kịch bản cần compliance approve `NEEDS_REVIEW`; quyết định Bước 1 để hàng đợi compliance backlog, không sửa auth; role chưa được RolesGuard hỗ trợ | Không giả lập API chưa tồn tại. Kịch bản 5 BLOCKED/deferred; chỉ kiểm PII nếu có contract thực tế | **Có**: mở backlog compliance/auth hay chấp nhận 5/6 scenario được nghiệm thu |
| 7 | Payout sau webhook | Bước 2 chốt không móc `accrueDeposit` vào webhook; dùng `POST /admin/payouts/sweep`; `transRef` chưa unique trong DB | Scenario 2 gọi webhook rồi sweep/accrue trên mock chung; retry chỉ xác nhận idempotency tuần tự, không khẳng định chống race liên tiến trình | Xác nhận sweep là hợp đồng tích hợp |
| 8 | Mã mới sau rotate | Bước 5: PIN mã hóa, không trả plaintext; chưa có kênh gửi PIN mới cho Host/khách | Chỉ xác nhận Host không thấy mã cũ, response không có plaintext; không yêu cầu nhận PIN mới | Xác nhận chấp nhận giới hạn này |
| 9 | Trạng thái thực tế webhook và key Host | `DepositService.processWebhook` hiện cộng cứng 450.000, giữ cứng 48h, không hủy viewing trùng và catch lỗi DB rồi trả success giả; `DispatchService.revealDoorKey` đang trả PIN giả cố định, chưa đọc key vault | Scenario 2/6 là kiểm thử yêu cầu nhưng chưa thể pass với code hiện hành; lỗi thuộc deposit/dispatch ngoài Admin, ghi cross-module fix và không sửa tại P06 | **Có**: xác nhận các lỗi cross-module là prerequisite/deferred hay mở riêng phạm vi sửa |
| 10 | Payout oracle | Bước 2 chốt công thức theo viewing fee + deal commission và tính lúc sự kiện; `AdminPayoutService` tách `accrueViewing` và `accrueDeposit`, còn webhook hiện tự cộng số cố định | Assert mỗi thành phần theo đúng API payout đã chốt, không cộng lặp thành phần viewing/deposit; wallet delta phải được mô tả rõ trong test | Xác nhận payout sweep là bước sau webhook và tổng delta mong đợi |

Đối chiếu `0334ebf` và `a1a7d0e`: PRD/Dynamic Pricing bổ sung vận hành/pricing, không thay các quyết định Admin ở cập nhật Bước 1–5; `a1a7d0e` chỉ cập nhật mô hình tài chính.

### Tiêu chí nghiệm thu chung được bổ sung (2026-10-04)

- Route guard: mọi `/admin/*` có test 401/403/200.
- Contract: không rename/xóa route hoặc đổi response; kiểm bằng `git diff`.
- AuditLog: mọi mutation/config update và sensitive read phải có audit.
- Regression: người dùng cung cấp baseline 9 suite/149 test; `ADMIN_AUDIT.md` ghi 12 suite/234 test. Chạy baseline tại HEAD trước thi công để xác nhận số đo thật; yêu cầu pass không giảm, fail/skip bằng 0.
- Scope: không đổi file ngoài phạm vi đã duyệt; ngoại lệ module khác chỉ là phần nhỏ được nêu trong kế hoạch.
