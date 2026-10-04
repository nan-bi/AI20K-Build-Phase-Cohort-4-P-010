# ADMIN_AUDIT — Khảo sát backend admin (Bước 0, chỉ đọc)

Branch: `feat/admin-flows` (từ `main`). Baseline Jest: **12 suite / 234 test pass** (không phải 9/149 như đề bài; đã có thêm auth/account/landlord/guards). Không có test nào cho `admin`, `host`, `deposit`, `dispatch`, `booking`, `identity`.

Ghi chú: engine brain (`init_brain.js`) nằm ngoài repo, không có → bỏ qua theo chỉ định của người dùng (phương án a).

## 1. Route admin hiện có

Tất cả nằm trong [admin.controller.ts](../backend/src/modules/admin/admin.controller.ts), **đều `@Public`, không `@Roles`, không test**. Ngoại lệ: `/admin/field-hosts` (GET/POST) nằm ở `auth/host-invites`, `@Roles('ops_admin')`, đã được guard.

| # | Method | Path | Service method | Hiện trạng |
|---|---|---|---|---|
| 1 | GET | /admin/bi-funnel | getBiFunnelAndHeatmap | MOCK (số phễu, heatmap, noShowRate cứng; `catch` trả dữ liệu giả) |
| 2 | GET | /admin/exclusive-inventory | getExclusiveInventory | MỘT PHẦN (đọc Unit+mandate; `exitCountdownDays` cứng 15; fallback mock) |
| 3 | POST | /admin/consignments/:id/approve | approveConsignment | MOCK (chỉ log, không đổi mandate, không audit) |
| 4 | POST | /admin/consignments/:id/reject | rejectConsignment | MOCK |
| 5 | GET | /admin/dispatch-sla | getDispatchSla | MỘT PHẦN (`isBreached:false` cứng, không phân tầng; fallback mock) |
| 6 | POST | /admin/bookings/:id/reassign | reassignBooking | MOCK (không đổi ticket, không audit) |
| 7 | GET | /admin/contracts | getContracts | CÓ nhưng trả nguyên `findMany` kèm tenant/landlord/deposit (lộ PII); fallback mock |
| 8 | GET | /admin/contracts/:id | getContractById | MOCK (CCCD cứng) |
| 9 | POST | /admin/contracts/:id/void-hold | voidHold | MOCK; trả `FORFEITED` nhưng message "hoàn 100%" (tự đặt chính sách) |
| 10 | POST | /admin/contracts/:id/complete-exit | completeExit | MOCK (không kiểm HOLDING/HĐ, không thu hồi khóa) |
| 11 | POST | /admin/contracts/:id/remind-renewal | remindRenewal | MOCK |
| 12-15 | GET | /admin/contract-templates, contract-parties (+`:id`) | tĩnh | Dữ liệu tĩnh |
| 16 | GET | /admin/commission-engine | getCommissionEngine | MỘT PHẦN (đọc FeeConfig; không payout) |
| 17 | POST | /admin/commission-engine/config | updateCommissionParam | MOCK (không ghi FeeConfig, không audit, không validate khoảng) |
| 18 | GET | /admin/settings/hold-policy | getHoldPolicy | Bộ nhớ trong tiến trình (mặc định 48h) |
| 19 | POST | /admin/settings/hold-policy | updateHoldPolicy | Bộ nhớ trong tiến trình, mất khi restart, không audit |

`AdminService` đã inject `PrismaService` + `AuditService` nhưng **không gọi audit ở đâu**. `AdminModule` chưa import `AuditModule`/Prisma rõ ràng (kiểm khi Bước 1).

## 2. Hợp đồng đích vs hiện trạng

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| GET /admin/bi-funnel (6 giai đoạn từ bảng thật) | MOCK | Cần Viewing, DispatchTicket (checked), HoldingDeposit, Contract; chưa có "matchmaker" lưu DB → câu hỏi mở |
| GET /admin/exclusive-inventory + countdown 15 ngày | MỘT PHẦN | Tính từ `exitEffectiveAt` thật |
| GET/POST commission-engine (FeeConfig, audit old/new/actor/lý do, khoảng SAD §3.2) | MỘT PHẦN / MOCK | GET đọc thật; POST không ghi. Key seed: `host_base_viewing_fee`, `host_deal_commission`, `host_rating_multiplier_5star`, `host_peak_hour_multiplier`; chưa có `handover_inspection_fee`, `slow_inventory_bonus`... |
| dispatch-sla + giao lại/leo thang | MỘT PHẦN / MOCK | Chưa có máy trạng thái chuyển hợp lệ |
| Payout Host (công thức, bảng kê tuần, CSV) | THIẾU | `HostPayout` có sẵn trong schema, chưa dùng. Webhook cọc cộng cứng 450.000 vào ví ([deposit.service.ts:150](../backend/src/modules/deposit/deposit.service.ts#L150)), không đọc FeeConfig |
| Hàng đợi eKYC NEEDS_REVIEW | THIẾU | `identity` mock: luôn VERIFIED, không có NEEDS_REVIEW |
| Mã khóa rotate/revoke | THIẾU | `DoorAccessKey` có `lastRotatedAt/revokedAt/status`; `reveal-key` ở dispatch |
| Giám sát cọc / UNC_PENDING_REVIEW | THIẾU | `uploadHostReceipt` chỉ log + trả mock, không đổi DB |
| Hold duration từ FeeConfig | THIẾU | Webhook cứng 48h ([deposit.service.ts:119](../backend/src/modules/deposit/deposit.service.ts#L119)); seed `holding_duration_days=7` (đơn vị ngày) |

## 3. Role seed / guard

- Seed ([seed.ts:17-22](../backend/prisma/seed.ts#L17)): có `tenant, landlord, field_host, area_lead, ops_admin, compliance_officer`. **Không có `system`** (audit dùng actor UUID `...0001`, FK tới Profile: có thể lỗi nếu profile không tồn tại; lỗi bị nuốt).
- [auth.constants.ts](../backend/src/modules/auth/auth.constants.ts) chỉ biết 4 vai/portal (tenant, landlord, field_host, ops_admin) → `compliance_officer`, `area_lead` chưa có portal; cần xác minh khi đăng nhập (Bước 1).
- Guard toàn cục: `SupabaseAuthGuard` (bỏ qua `@Public`, có demo header `x-demo-role` khi `AUTH_DEMO_MODE=true` và không production) rồi `RolesGuard` (không có `@Roles` ⇒ cho qua). Dùng thật: `landlord` (controller), `ops_admin` (host-invites). `compliance_officer`, `area_lead`: chưa route nào dùng.
- 88 route, 84 `@Public` theo ROUTE_GUARD_TABLE.

## 4. Rủi ro

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| 1 | Cao | admin.controller.ts (toàn bộ) | 19 route admin công khai |
| 2 | Cao | identity controller (`/identity/:depositId`) | Đọc dữ liệu định danh công khai, không audit |
| 3 | Cao | deposit `webhook-vietqr` @Public, [deposit.service.ts:122-155](../backend/src/modules/deposit/deposit.service.ts#L122) | Không xác thực chữ ký; không chặn trùng (`bankRefNumber` unique chỉ báo lỗi → `catch` nuốt rồi trả success); không kiểm Unit đang AVAILABLE (không `FOR UPDATE`); không hủy lịch trùng; cộng ví cứng 450.000; `$transaction` có nhưng lỗi bị nuốt và trả `success:true` giả |
| 4 | Cao | dispatch `reveal-key` @Public ([dispatch.service.ts:152](../backend/src/modules/dispatch/dispatch.service.ts#L152)) | Lộ mã khóa không cần xác thực |
| 5 | Trung | admin.service.ts getContracts | Trả PII qua include |
| 6 | Trung | admin.service.ts (nhiều `catch`) | Fallback mock che lỗi DB, admin thấy số giả |
| 7 | Trung | admin.service.ts hold-policy | Cấu hình in-memory, không audit, không đọc FeeConfig |
| 8 | Trung | admin.service.ts voidHold | Tự quyết chính sách hoàn cọc (thiếu căn cứ) |
| 9 | Trung | [booking.service.ts:96](../backend/src/modules/booking/booking.service.ts#L96) | Tạo ticket cứng `tier 1, slaSeconds 300`, không đọc cấu hình; viewing + ticket không trong transaction |
| 10 | Thấp | audit.service.ts:49 | `log()` nuốt lỗi (an toàn cho luồng nhưng có thể mất audit); fallback actor `...0001` |
| 11 | Thấp | DTO `UpdateCommissionParamDto.paramValue: number` | Float cho tiền; cần Decimal/string |
| 12 | Thấp | schema `HandoverItem` | **Đã có** `isNormalWear/deductionCost` (khác nhận định đề bài) → bỏ khỏi mâu thuẫn |

## 5. Ai đang sửa (7 ngày)

- admin, booking, deposit, dispatch, identity: chỉ `6bb0fd8` (nan-bi).
- landlord, host: `9e3df16` (NamDev), `6bb0fd8`.
- account, auth: NamDev, Tran Thu Phuong (6399ce6, 141b1bc, c74b3f6, 6ac8a42...).
- audit: không đổi.
→ Module landlord/auth/account đang hoạt động nhiều; chỉ thêm nhỏ khi thật cần.
