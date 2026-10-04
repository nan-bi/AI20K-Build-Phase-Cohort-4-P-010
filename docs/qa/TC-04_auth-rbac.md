# TC-04 — Authentication và Authorization

| Mục | Giá trị |
|---|---|
| Kết quả | **FAIL** — 53 ca: 49 Pass, 4 Fail (M8 🔴, M9 🔴, M10, 2/M7 do dữ liệu test) |
| Ngày chạy | 2026-10-04 |
| Commit | `9e9ad74` (main) |
| Môi trường | local: backend NestJS `http://localhost:4000` (`backend/.env`), DB Supabase cloud |
| Role đã test | tenant, landlord, field_host (Sale + Thẩm định), ops_admin — tài khoản demo |
| Kiểu thao tác | Chỉ GET hoặc body rỗng; không in token/mật khẩu |
| Bug | [BUG-TC04-01](bugs/BUG-TC04-01.md) 🔴 (M8), [BUG-TC04-02](bugs/BUG-TC04-02.md) 🔴 (M9 + M10) |

Bước 1 M1–M8 chạy dừng ở ca lệch đầu tiên; M9 chạy sau khi ghi bug M8; phần còn lại (44 ca) chạy một lượt theo yêu cầu.

## Ma trận quyền kỳ vọng

| # | Endpoint | Role được phép | Role bị cấm | Nguồn |
|---|---|---|---|---|
| M1 | `GET /admin/field-hosts` | ops_admin | vô danh (401), tenant/landlord/field_host (403) | `backend/src/modules/field-hosts/field-hosts.controller.ts:14-19` |
| M2 | `GET /admin/bi-funnel` | ops_admin | như trên | `backend/src/modules/admin/admin.controller.ts:30,44` |
| M3 | `GET /landlord/units` | landlord | vô danh, role khác | `backend/src/modules/landlord/landlord.controller.ts:39,57` |
| M4 | `GET /me/bookings` | tenant | vô danh, role khác | `backend/src/modules/account/account.controller.ts:35-36` |
| M5 | `GET /host/board` | field_host (sale) | vô danh, role khác | `backend/src/modules/host-viewings/host-viewings.controller.ts:20-30` |
| M6 | `GET /host/inspections` | field_host (inspector) | vô danh, role khác | `backend/src/modules/inspection/inspection.controller.ts:51-62` |
| M7 | `GET /contracts/:id/evidence-package` | ops_admin | vô danh, role khác | `backend/src/modules/contract/contract.controller.ts:23-24` |
| M8 | `GET /host/earnings?hostId=` | field_host (đích) | vô danh | `backend/README.md:115`; code `@Public` `backend/src/modules/host/host.controller.ts:39-44` |
| M9 | `GET /handovers/contracts/:id` | field_host, tenant (đích) | vô danh | `backend/README.md:114`; code `@Public` `backend/src/modules/handover/handover.controller.ts:22-23` |
| M10 | `POST /handovers` | field_host, tenant (đích) | vô danh | như trên, `handover.controller.ts:12-13` |

## Kết quả

| # | Hành động | Role | Expected | Actual (status + body) | Pass/Fail |
|---|---|---|---|---|---|
| 1/M1–M7 | 7 endpoint nhạy cảm | vô danh | 401 | `HTTP 401` · `{"success":false,"statusCode":401,…,"code":"unauthorized","message":"Chưa đăng nhập hoặc phiên đã hết hạn","errors":null}` | Pass ×7 |
| 1/M8 | `GET /host/earnings?hostId=4fc12629-9bf4-4097-8f3c-5cb93c8c15b5` | vô danh | 401 | `HTTP 200 1573ms` · `{"success":true,"statusCode":200,"data":{"hostId":"4fc12629-9bf4-4097-8f3c-5cb93c8c15b5","fullName":"Phương Nam","rating":4.9,"walletBalance":450000,"stats":{"totalViewings":18,"totalDeals":6,"dealCommissionTotal":2400000,"viewingFeeTotal":900000,"ratingBonus":360000,"totalEarnings":3660000},"currentPeriod":"Tuần 40 / 2026","payouts":[]},"timestamp":"2026-10-04T15:50:40.898Z"}` | **FAIL 🔴 NGHIÊM TRỌNG** |
| 1/M9 | `GET /handovers/contracts/ce7dacb4-148c-4461-842a-8195c9cb0d82` | vô danh | 401 | `HTTP 200 679ms` · `{"success":true,"statusCode":200,"data":[],"timestamp":"2026-10-04T15:52:02.370Z"}` | **FAIL 🔴 NGHIÊM TRỌNG** |
| 1/M10 | `POST /handovers {}` | vô danh | 401 | `HTTP 400` · `{"success":false,"statusCode":400,"timestamp":"2026-10-04T15:56:15.524Z","path":"/api/v1/handovers","code":"invalid_request","message":["contractId must be a UUID","items must be an array","utilityReadings must be an array"],"errors":null}` | **FAIL** — lọt qua xác thực, chỉ chặn ở validation |
| 2/M1–M7 | 7 endpoint × 3 role bị cấm | đã dùng token của tenant / landlord / field_host / ops_admin | 403 | `HTTP 403` · vd. `{…"code":"forbidden","message":"Yêu cầu vai trò [ops_admin], vai trò hiện tại: [tenant]",…}` | Pass ×21 |
| 2/M1–M6 | role được phép | ops_admin (M1, M2), landlord (M3), tenant (M4), field_host (M5, M6) | 2xx | `HTTP 200` ×6 (vd. M3 `{"success":true,"statusCode":200,"data":[],…}`) | Pass ×6 |
| 2/M7 | `GET /contracts/ce7dacb4-…/evidence-package` | đã dùng token của ops_admin | 2xx | `HTTP 404` · `{…"code":"not_found","message":"Không tìm thấy tài liệu","errors":null}` | **FAIL do dữ liệu test**: endpoint tìm `signedDocument` (`backend/src/modules/contract/contract.service.ts:80-87`), ID truyền vào là của bảng `contract`. Phân quyền cho admin qua đúng |
| 3/I0 | `GET /bookings/VS-HZLLC` (lịch của mình, đối chứng) | tenant | 200 | `HTTP 200` | Pass |
| 3/I1 | `GET /bookings/VS-RK4WJ` (lịch của tenant khác) | tenant | 403/404 | `HTTP 404` · `{…"code":"booking_not_found","message":"Không tìm thấy lịch hẹn trong tài khoản của bạn.",…}` | Pass |
| 3/I2 | `GET /me/contracts/ce7dacb4-…/pdf` (HĐ không thuộc mình) | tenant | 403/404 | `HTTP 404` · `{…"message":"Không tìm thấy hợp đồng",…}` | Pass |
| 3/I3, I4 | `GET /landlord/units/aef63d32-…` và `…/viewings` (căn của landlord khác) | landlord | 403/404 | `HTTP 404` · `{…"message":"Không tìm thấy căn hộ",…}` | Pass ×2 |
| 3/I5 | `GET /host/viewings/VS-RK4WJ` (ca của Host khác) | field_host | 403/404 | `HTTP 404` · `{…"code":"viewing_not_found","message":"Không tìm thấy lịch hoặc lịch không thuộc bạn.",…}` | Pass |
| 4/T1–T6 | Token sai định dạng (Bearer, cookie), ký bằng khoá sai, `alg=none`, hết hạn, sai issuer | token tự tạo (đã che) | 401 | `HTTP 401` · `{…"code":"unauthorized",…}` | Pass ×6 |
| 4/T7 | Đối chứng: token đúng khoá, còn hạn | token tự tạo | 200 | `HTTP 200` | Pass |
| 4/T8 | Chỉ header `x-demo-role: ops_admin` | vô danh | 401 | `HTTP 401` | Pass |
| 4/T9 | Tài khoản tenant đăng nhập `portal=admin` | tenant | 4xx, không cookie | `HTTP 403` · `{…"code":"wrong_portal","message":"Tài khoản thuộc một vai trò khác. Vui lòng đăng nhập đúng cổng dành cho vai trò của bạn",…}`, `cookie_set=false` | Pass |
| 5 | Quét mọi response tìm stack trace / thông tin nội bộ | — | 0 | `Số response chứa dấu hiệu stack trace/thông tin nội bộ: 0 []` | Pass |

## Chưa kiểm được

- Host chỉ có một vai con (sale hoặc inspector) — không có tài khoản như vậy với mật khẩu đã biết.
- 2/M7 với `signedDocument` id hợp lệ — chưa chạy lại.
- M10 với body hợp lệ — cố ý không thử để tránh tạo dữ liệu.
- M8 khi bỏ `hostId` — [GIẢ ĐỊNH] từ code, chưa chạy.
- M9 khi đã có biên bản bàn giao thật — DB có 0 biên bản.

## Dữ liệu test phát sinh (KHÔNG tự xoá)

`auth_audit_logs`: `1d2e6a17-0e01-49c6-8645-64ce3826dcca`, `d191fb51-9497-41a0-8baf-fd0d0fbef1e1`, `b2327de5-3f3a-4a8f-bde2-592c70b73553`, `0bc96610-a24e-417d-9258-d40dd6415f25` (`login_succeeded`), `e4db2a5e-8362-4e27-8c97-f709a8c7aa5d` (`login_rejected`). Không tạo lịch xem hay biên bản bàn giao nào (sau test: viewings `5`, handovers `0`).

## Bằng chứng

Lưu tạm trong scratchpad phiên Claude Code (có thể mất khi phiên kết thúc): `tc04/ids.txt`, `tc04/step1.log`, `tc04/step1_M8.json`, `tc04/rest.log`, `tc04/records_after.txt`, script `tc04_lib.js`, `tc04_step1.js`, `tc04_step1b.js`, `tc04_rest.js`.
