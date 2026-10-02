# Route–Guard Table (backend)

Nguồn: `backend/src/modules/**/*.controller.ts` trên `main` `0334ebf`, sinh bằng `tools/make_route_guard_table.py`. Đường dẫn thật = `/api/v1` + path (prefix lấy từ `API_PREFIX`, mặc định `api/v1`).

## Cách guard hoạt động (đã đọc code)
- `app.module.ts` đăng ký toàn cục 2 `APP_GUARD`: `SupabaseAuthGuard` rồi `RolesGuard`.
- `SupabaseAuthGuard`: route có `@Public()` (method hoặc class) thì bỏ qua xác thực. Ngược lại cần token (cookie `vs_access` hoặc `Authorization: Bearer`); thiếu/sai token -> `unauthorized`. Có chế độ demo: header `x-demo-role` bỏ qua xác thực nếu `AUTH_DEMO_MODE=true` và `NODE_ENV!=production`.
- `RolesGuard`: không có `@Roles` thì cho qua mọi người (kể cả chưa đăng nhập nếu `@Public`). Có `@Roles` thì cần `user.role` nằm trong danh sách; riêng `field_host` phải `isHostVerified`.
- `ThrottlerGuard` chỉ gắn thủ công ở `auth.controller.ts` và `otp.controller.ts`, không toàn cục.
- Vai trò hợp lệ (`auth.constants.ts`): `tenant`, `landlord`, `field_host`, `ops_admin`.

## Tổng kết
- Route: 88; có `@Public`: 84; có `@Roles`: 3; còn lại cần đăng nhập nhưng không giới hạn vai trò: 1.
- Checklist cần gắn (`[ ]`, public và chưa `@Roles`, không tính `auth`): 74; `auth` cần xem xét (`(?)`): 10.

| Module | Route | PUBLIC | ROLES | Cần gắn @Roles |
|---|---:|---:|---:|---:|
| account | 8 | 8 | 0 | 8 |
| admin | 19 | 19 | 0 | 19 |
| auth | 14 | 10 | 3 | xem xét |
| booking | 9 | 9 | 0 | 9 |
| contract | 3 | 3 | 0 | 3 |
| deposit | 4 | 4 | 0 | 4 |
| dispatch | 9 | 9 | 0 | 9 |
| handover | 2 | 2 | 0 | 2 |
| host | 4 | 4 | 0 | 4 |
| identity | 2 | 2 | 0 | 2 |
| landlord | 10 | 10 | 0 | 10 |
| matchmaker | 1 | 1 | 0 | 1 |
| property | 3 | 3 | 0 | 3 |

## Chi tiết theo module

Cột `Gợi ý` chỉ là đề xuất theo tên module để người duyệt; KHÔNG phải sự thật trong code. `[ ]` = checklist chưa gắn guard.

### account

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | GET | `/me/profile` | getProfile | backend/src/modules/account/account.controller.ts:13 | có | không | — | PUBLIC: không xác thực | tenant|landlord (CHƯA RÕ) |
| [ ] | PATCH | `/me/profile` | updateProfile | backend/src/modules/account/account.controller.ts:21 | có | không | — | PUBLIC: không xác thực | tenant|landlord (CHƯA RÕ) |
| [ ] | GET | `/me/bookings` | getBookings | backend/src/modules/account/account.controller.ts:29 | có | không | — | PUBLIC: không xác thực | tenant|landlord (CHƯA RÕ) |
| [ ] | GET | `/me/contracts` | getContracts | backend/src/modules/account/account.controller.ts:37 | có | không | — | PUBLIC: không xác thực | tenant|landlord (CHƯA RÕ) |
| [ ] | GET | `/me/favorites` | getFavorites | backend/src/modules/account/account.controller.ts:45 | có | không | — | PUBLIC: không xác thực | tenant|landlord (CHƯA RÕ) |
| [ ] | PUT | `/me/favorites/:unitId` | addFavorite | backend/src/modules/account/account.controller.ts:52 | có | không | — | PUBLIC: không xác thực | tenant|landlord (CHƯA RÕ) |
| [ ] | DELETE | `/me/favorites/:unitId` | removeFavorite | backend/src/modules/account/account.controller.ts:59 | có | không | — | PUBLIC: không xác thực | tenant|landlord (CHƯA RÕ) |
| [ ] | GET | `/me/notifications` | getNotifications | backend/src/modules/account/account.controller.ts:66 | có | không | — | PUBLIC: không xác thực | tenant|landlord (CHƯA RÕ) |

### admin

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | GET | `/admin/bi-funnel` | getBiFunnel | backend/src/modules/admin/admin.controller.ts:20 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/exclusive-inventory` | getInventory | backend/src/modules/admin/admin.controller.ts:30 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | POST | `/admin/consignments/:id/approve` | approveConsignment | backend/src/modules/admin/admin.controller.ts:40 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | POST | `/admin/consignments/:id/reject` | rejectConsignment | backend/src/modules/admin/admin.controller.ts:47 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/dispatch-sla` | getDispatchSla | backend/src/modules/admin/admin.controller.ts:54 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | POST | `/admin/bookings/:id/reassign` | reassignBooking | backend/src/modules/admin/admin.controller.ts:64 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/contracts` | getContracts | backend/src/modules/admin/admin.controller.ts:71 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/contracts/:id` | getContractById | backend/src/modules/admin/admin.controller.ts:78 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | POST | `/admin/contracts/:id/void-hold` | voidHold | backend/src/modules/admin/admin.controller.ts:85 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | POST | `/admin/contracts/:id/complete-exit` | completeExit | backend/src/modules/admin/admin.controller.ts:92 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | POST | `/admin/contracts/:id/remind-renewal` | remindRenewal | backend/src/modules/admin/admin.controller.ts:99 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/contract-templates` | getContractTemplates | backend/src/modules/admin/admin.controller.ts:106 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/contract-templates/:id` | getContractTemplateById | backend/src/modules/admin/admin.controller.ts:113 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/contract-parties` | getContractParties | backend/src/modules/admin/admin.controller.ts:120 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/contract-parties/:id` | getContractPartyById | backend/src/modules/admin/admin.controller.ts:127 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/commission-engine` | getCommissionEngine | backend/src/modules/admin/admin.controller.ts:134 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | POST | `/admin/commission-engine/config` | updateCommissionParam | backend/src/modules/admin/admin.controller.ts:144 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | GET | `/admin/settings/hold-policy` | getHoldPolicy | backend/src/modules/admin/admin.controller.ts:154 | có | không | — | PUBLIC: không xác thực | ops_admin |
| [ ] | POST | `/admin/settings/hold-policy` | updateHoldPolicy | backend/src/modules/admin/admin.controller.ts:161 | có | không | — | PUBLIC: không xác thực | ops_admin |

### auth

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| (?) | POST | `/auth/login` | login | backend/src/modules/auth/auth.controller.ts:43 | có | không | ThrottlerGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| (?) | POST | `/auth/signup` | signup | backend/src/modules/auth/auth.controller.ts:59 | có | không | ThrottlerGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| (?) | POST | `/auth/demo-login` | demoLogin | backend/src/modules/auth/auth.controller.ts:76 | có | không | ThrottlerGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| (?) | GET | `/auth/google` | CHƯA RÕ | backend/src/modules/auth/auth.controller.ts:87 | có | không | ThrottlerGuard, GoogleAuthGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| (?) | GET | `/auth/google/callback` | googleCallback | backend/src/modules/auth/auth.controller.ts:104 | có | không | ThrottlerGuard, GoogleCallbackGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| (?) | GET | `/auth/session` | session | backend/src/modules/auth/auth.controller.ts:119 | có | không | ThrottlerGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| (?) | POST | `/auth/refresh` | refresh | backend/src/modules/auth/auth.controller.ts:137 | có | không | ThrottlerGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| (?) | POST | `/auth/logout` | logout | backend/src/modules/auth/auth.controller.ts:155 | có | không | ThrottlerGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| — | POST | `/auth/verify-rfid` | verifyRfid | backend/src/modules/auth/auth.controller.ts:164 | không | không | ThrottlerGuard | Đăng nhập, mọi vai trò (không @Roles) | — |
| — | GET | `/admin/field-hosts` | list | backend/src/modules/auth/host-invites/host-invites.controller.ts:14 | không | 'ops_admin' | — | Đăng nhập + vai trò 'ops_admin' | — |
| — | POST | `/admin/field-hosts` | create | backend/src/modules/auth/host-invites/host-invites.controller.ts:20 | không | 'ops_admin' | — | Đăng nhập + vai trò 'ops_admin' | — |
| (?) | POST | `/auth/otp/send` | send | backend/src/modules/auth/otp/otp.controller.ts:38 | có | không | ThrottlerGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| (?) | POST | `/auth/otp/verify` | verify | backend/src/modules/auth/otp/otp.controller.ts:52 | có | không | ThrottlerGuard | PUBLIC: không xác thực | auth bootstrap: public có thể đúng chủ đích, cần người xác nhận |
| — | POST | `/auth/phone/verify` | verifyPhone | backend/src/modules/auth/otp/otp.controller.ts:67 | không | 'landlord', 'field_host' | ThrottlerGuard | Đăng nhập + vai trò 'landlord', 'field_host' | — |

### booking

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | POST | `/bookings` | createBooking | backend/src/modules/booking/booking.controller.ts:13 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/bookings/request-otp` | requestOtp | backend/src/modules/booking/booking.controller.ts:23 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/bookings/confirm` | confirmBooking | backend/src/modules/booking/booking.controller.ts:33 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/bookings/:id/lobby-checkin` | lobbyCheckIn | backend/src/modules/booking/booking.controller.ts:43 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | GET | `/bookings/by-ref/:ref` | getByRef | backend/src/modules/booking/booking.controller.ts:53 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | GET | `/bookings/:id` | getViewingDetails | backend/src/modules/booking/booking.controller.ts:60 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/bookings/:id/cancel` | cancelBooking | backend/src/modules/booking/booking.controller.ts:67 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/bookings/:id/reschedule` | rescheduleBooking | backend/src/modules/booking/booking.controller.ts:74 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/bookings/:id/rating` | rateBooking | backend/src/modules/booking/booking.controller.ts:81 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |

### contract

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | POST | `/contracts/holding-agreement/sign` | signDepositAgreement | backend/src/modules/contract/contract.controller.ts:13 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/contracts/mandate/create` | createMandate | backend/src/modules/contract/contract.controller.ts:23 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | GET | `/contracts/:id/evidence-package` | getEvidencePackage | backend/src/modules/contract/contract.controller.ts:33 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |

### deposit

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | POST | `/deposits/generate-vietqr` | generateVietQr | backend/src/modules/deposit/deposit.controller.ts:13 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/deposits/webhook-vietqr` | processWebhook | backend/src/modules/deposit/deposit.controller.ts:23 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/deposits/:id/host-receipt` | uploadHostReceipt | backend/src/modules/deposit/deposit.controller.ts:33 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | GET | `/deposits/:id` | getDepositStatus | backend/src/modules/deposit/deposit.controller.ts:43 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |

### dispatch

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | GET | `/dispatch/tickets` | getHostTickets | backend/src/modules/dispatch/dispatch.controller.ts:13 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/dispatch/tickets/:id/accept` | acceptTicket | backend/src/modules/dispatch/dispatch.controller.ts:21 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/dispatch/tickets/:id/reject` | rejectTicket | backend/src/modules/dispatch/dispatch.controller.ts:31 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/dispatch/tickets/:id/claim` | claimTicket | backend/src/modules/dispatch/dispatch.controller.ts:38 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/dispatch/tickets/:id/elevator-rfid` | swipeElevatorRfid | backend/src/modules/dispatch/dispatch.controller.ts:45 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/dispatch/tickets/:id/reveal-key` | revealDoorKey | backend/src/modules/dispatch/dispatch.controller.ts:55 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/dispatch/tickets/:id/emergency` | reportEmergency | backend/src/modules/dispatch/dispatch.controller.ts:65 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/dispatch/tickets/:id/no-show` | reportNoShow | backend/src/modules/dispatch/dispatch.controller.ts:72 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | POST | `/dispatch/tickets/:id/not-interested` | reportNotInterested | backend/src/modules/dispatch/dispatch.controller.ts:79 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |

### handover

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | POST | `/handovers` | createHandover | backend/src/modules/handover/handover.controller.ts:13 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | GET | `/handovers/contracts/:contractId` | getHandoverByContract | backend/src/modules/handover/handover.controller.ts:23 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |

### host

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | GET | `/host/inspections` | getInspections | backend/src/modules/host/host.controller.ts:13 | có | không | — | PUBLIC: không xác thực | field_host |
| [ ] | POST | `/host/inspections/:consignmentId/accept` | acceptInspection | backend/src/modules/host/host.controller.ts:21 | có | không | — | PUBLIC: không xác thực | field_host |
| [ ] | POST | `/host/inspections/:consignmentId/report` | submitInspectionReport | backend/src/modules/host/host.controller.ts:28 | có | không | — | PUBLIC: không xác thực | field_host |
| [ ] | GET | `/host/earnings` | getEarnings | backend/src/modules/host/host.controller.ts:38 | có | không | — | PUBLIC: không xác thực | field_host |

### identity

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | POST | `/identity/ekyc/verify` | verifyEkyc | backend/src/modules/identity/identity.controller.ts:13 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | GET | `/identity/:depositId` | getEkycResult | backend/src/modules/identity/identity.controller.ts:23 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |

### landlord

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | GET | `/landlord/dashboard` | getDashboard | backend/src/modules/landlord/landlord.controller.ts:13 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | GET | `/landlord/units` | getLandlordUnits | backend/src/modules/landlord/landlord.controller.ts:24 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | GET | `/landlord/units/:id` | getLandlordUnitById | backend/src/modules/landlord/landlord.controller.ts:32 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | GET | `/landlord/units/:unitId/audit-trail` | getUnitDoorAuditTrail | backend/src/modules/landlord/landlord.controller.ts:39 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | POST | `/landlord/consignments` | createConsignment | backend/src/modules/landlord/landlord.controller.ts:49 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | GET | `/landlord/consignments/:id` | getConsignmentById | backend/src/modules/landlord/landlord.controller.ts:56 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | POST | `/landlord/consignments/:id/sign` | signConsignment | backend/src/modules/landlord/landlord.controller.ts:63 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | GET | `/landlord/finance` | getLandlordFinance | backend/src/modules/landlord/landlord.controller.ts:70 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | POST | `/landlord/mandates/request-exit` | requestExitMandate | backend/src/modules/landlord/landlord.controller.ts:78 | có | không | — | PUBLIC: không xác thực | landlord |
| [ ] | POST | `/landlord/mandates/cancel-exit` | cancelExitMandate | backend/src/modules/landlord/landlord.controller.ts:88 | có | không | — | PUBLIC: không xác thực | landlord |

### matchmaker

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | POST | `/matchmaker/recommend` | recommend | backend/src/modules/matchmaker/matchmaker.controller.ts:13 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |

### property

| ✓ | Method | Path | Handler | File:dòng | @Public | @Roles | @UseGuards | Trạng thái | Gợi ý |
|---|---|---|---|---|---|---|---|---|---|
| [ ] | GET | `/properties/buildings` | getBuildings | backend/src/modules/property/property.controller.ts:13 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | GET | `/properties/units` | getUnits | backend/src/modules/property/property.controller.ts:20 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |
| [ ] | GET | `/properties/units/:id` | getUnitById | backend/src/modules/property/property.controller.ts:30 | có | không | — | PUBLIC: không xác thực | CHƯA RÕ |

