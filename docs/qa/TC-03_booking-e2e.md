# TC-03 — Luồng đặt lịch xem phòng, đầu-cuối

| Mục | Giá trị |
|---|---|
| Kết quả | **PASS** ở mọi bước đã thực thi; bước 3.2 (phía Chủ nhà / Host) KHÔNG THỰC THI ĐƯỢC |
| Ngày chạy | 2026-10-04 |
| Commit | `9e9ad74` (main) |
| Môi trường | local: backend NestJS `http://localhost:4000` (`backend/.env`), DB Supabase cloud |
| Luồng | Đặt lịch xem `POST /bookings` (`backend/src/modules/booking/booking.controller.ts:18-26`), qua đúng kênh người dùng: đăng nhập → OTP gửi → OTP xác thực → đặt lịch |
| Tài khoản | `khachthue.demo@vinstay.vn` (tenant); Admin `admin@vinstay.vn` cho bước 3 |
| Bug | 0 |

Ghi chú: kênh Zalo và SMS đều chưa triển khai và luôn ném lỗi (`backend/src/modules/auth/otp/senders/zalo-zns.sender.ts:13`, `sms-fallback.sender.ts:8`), nên không có tin nhắn thật nào được gửi. Mã OTP lấy qua `devCode` (`OTP_ECHO_DEV_CODE=true` trong `backend/.env`).

## Trạng thái ban đầu (15:44Z, chỉ đọc)

```
[BEFORE] counts: {"viewings_total":4,"dispatchTickets_total":4,"otpCodes_total":6,"viewings_of_demo_tenant":0}
[BEFORE] unit: {"id":"c7452f05-6bd8-4021-bfd0-5b10cc4ae8e6","unitCode":"VHOP-S2.18-1602","status":"AVAILABLE","isVerified":true,"landlordId":"33333333-3333-3333-3333-333333333333","building":{"buildingCode":"S2.18","zoneName":"The Sapphire 2"}}
[BEFORE] unit owner email: minh.landlord@vinstay.ai
[BEFORE] live viewings on unit: 0
```

Tài khoản tenant demo lúc đầu: `"isPhoneVerified":false,"hasPhone":false`.

## Kết quả

| Bước | Dữ liệu gửi | Expected | Actual (nguyên văn) | Pass/Fail |
|---|---|---|---|---|
| 1.1 | `POST /auth/login {"email":"khachthue.demo@vinstay.vn","password":"<che>","portal":"tenant"}` | 200 + cookie | `HTTP 200` · `{"success":true,"statusCode":200,"data":{"user":{"id":"ccfc8556-d877-490b-aa55-3ac106679422",…,"role":"tenant",…"isPhoneVerified":false…}}…}` | Pass |
| 1.2 | `POST /auth/otp/send {"phone":"0900000101","purpose":"TENANT_VIEWING"}` | 200 | `HTTP 200` · `{"success":true,"statusCode":200,"data":{"expiresInSeconds":300,"devCode":"<che>"},…}` | Pass |
| 1.3 | `POST /auth/otp/verify {…,"code":"<che>"}` | 200 + actionToken | `HTTP 200` · `{"success":true,"statusCode":200,"data":{"actionToken":"<che>","expiresInSeconds":900},…}` | Pass |
| 1.4 | `POST /bookings {"unitCode":"VHOP-S2.18-1602","slot":"2026-10-06T02:30:00.000Z","contactName":"QA TC03 Test","phone":"0900000101","partySize":2,"note":"TC-03 QA test - vui long bo qua","actionToken":"<che>"}` | 201 + mã lịch | `HTTP 201 4708ms` · `{"success":true,"statusCode":201,"data":{"ref":"VS-HZLLC","status":"pending","unit":{"code":"VHOP-S2.18-1602",…},"slot":"2026-10-06T02:30:00.000Z",…,"contact":{"name":"QA TC03 Test","phoneMasked":"8490 ••• 101","persons":2,"note":"TC-03 QA test - vui long bo qua"},"host":{"name":"Phương Nam","rating":4.9},"canModify":true}…}` | Pass |
| 2.1 | `GET /bookings/VS-HZLLC` | Field khớp | `HTTP 200` · cùng nội dung với 1.4 | Pass |
| 2.2 | `GET /me/bookings` | Có VS-HZLLC | `HTTP 200` · `{"data":[{"ref":"VS-HZLLC","status":"pending",…,"contact":{"name":"QA TC03 Test","phoneMasked":"090 ••• ••••","persons":2,…}}]}` | Pass |
| 2.3 | Đọc DB (chỉ đọc) | Khớp từng field | `"bookingRefCode":"VS-HZLLC","unitId":"c7452f05-…","contactName":"QA TC03 Test","partySize":2,"tenantNote":"TC-03 QA test - vui long bo qua","viewingSlot":"2026-10-06T02:30:00.000Z","status":"PENDING_CONFIRMATION"` · ticket `"status":"OFFERED","tier":1`. SĐT lưu mã hoá — chỉ đối chiếu được đuôi `101` qua `phoneMasked` | Pass |
| 3.1 | Admin: `GET /admin/dispatch-sla` | Thấy ticket | `HTTP 200` · `{"ticketId":"e63a9d35-b346-4ede-9a6a-0dd916416c1f","unitCode":"VHOP-S2.18-1602","building":"S2.18","hostName":"Phương Nam","tier":1,"slaSeconds":180,"status":"OFFERED",…,"isBreached":false}` | Pass |
| 3.2 | Chủ nhà `minh.landlord@vinstay.ai`, Host "Phương Nam" | Thấy lịch | KHÔNG THỰC THI ĐƯỢC — không có mật khẩu hai tài khoản | — |
| 4a | Thiếu `contactName` | 4xx | `HTTP 400` · `{…,"code":"invalid_request","message":["contactName must be longer than or equal to 2 characters","contactName must be a string","contactName should not be empty"],"errors":null}` | Pass |
| 4b | `slot:"2026-10-03T02:30:00.000Z"` | 4xx | `HTTP 422` · `{…,"code":"slot_invalid","message":"Chỉ được đặt lịch xem phòng trước giờ xem tối thiểu 30 phút.","errors":null}` | Pass |
| 4c | `unitCode:"VHOP-ZZ.99-9999"` | 4xx | `HTTP 404` · `{…,"code":"unit_not_found","message":"Không tìm thấy căn hộ hoặc căn hộ không còn khả dụng.","errors":null}` | Pass |
| 4d | Gửi lại đúng payload 1.4 | 4xx | `HTTP 409` · `{…,"code":"slot_taken","message":"Khung giờ này vừa có người đặt xem phòng.","errors":null}` | Pass |
| 5 | Chụp lại DB | Chỉ tăng bản ghi của happy path | `counts AFTER: {"viewings_total":5,"dispatchTickets_total":5,"otpCodes_total":8}` · lịch mới từ 15:44Z chỉ có `VS-HZLLC` · 2 OTP mới đều từ bước 1 · căn vẫn `AVAILABLE` | Pass |

Lần chạy đầu bước 1.2 nhận `HTTP 429 … "Vui lòng đợi trước khi yêu cầu mã mới","errors":{"retryAfterSeconds":11}` do vừa gửi OTP 49 giây trước — cooldown hợp lệ; chạy lại đúng quy trình sau khi hết cooldown.

## Ghi nhận

1. 4d: chính khách vừa đặt slot đó nhưng thông báo là *"Khung giờ này vừa có người đặt xem phòng."* — dễ hiểu nhầm. Chặn trùng theo (căn, slot); cùng khách đặt cùng căn ở slot khác chưa test.
2. 4b: thông báo nói "tối thiểu 30 phút", không nói rõ ngày đã qua.
3. Che SĐT không thống nhất: `"8490 ••• 101"` (POST, GET theo ref) và `"090 ••• ••••"` (`/me/bookings`).
4. Ticket của lịch test đang mời Host thật "Phương Nam"; trong TC-04 lịch này đã ở `WIDE_POOL`, `canClaim:true` trên `/host/board` — cần dọn sớm.

## Dữ liệu test cần dọn (KHÔNG tự xoá)

| Bảng | ID | Ghi chú |
|---|---|---|
| `viewings` | `b202a1c7-9903-4976-aaee-a7d2b15f15de` | ref `VS-HZLLC` |
| `dispatch_tickets` | `e63a9d35-b346-4ede-9a6a-0dd916416c1f` | `OFFERED` cho Host `4fc12629-9bf4-4097-8f3c-5cb93c8c15b5` |
| `otp_codes` | `fee435f6-d854-4e83-ae79-3105670ac242`, `4770d2ce-935d-41b2-9af5-14468cb8459f` | `CONSUMED` |
| `auth_audit_logs` | `bd8b11ac-72f7-4620-b978-f1c7729735e7`, `26c20b29-f9c6-477a-9d21-12b97de29d74`, `9ac53565-0909-447d-80d2-912a1cc4eb7a`, `b0701d16-2378-4e9e-8ff6-1a25032e0c3d`, `b6043ee2-d650-4b9a-a2ed-7c065d215d88`, `9a4ff387-28cb-432d-bae3-05416c8d1a7f`, `1aac25d7-db6e-401f-b369-ad2ea4e00fd8`, `36608fbd-e33e-4ea6-8f78-d41cbf775484` | login / otp_sent / otp_verified |
| `profiles` (sửa) | `ccfc8556-d877-490b-aa55-3ac106679422` | Đã gắn SĐT `0900000101` (`phoneEnc`, `phoneHash`), `isPhoneVerified=true` — cần hoàn lại |

## Bằng chứng

Lưu tạm trong scratchpad phiên Claude Code (có thể mất khi phiên kết thúc): `tc03/snapshot_before.txt`, `tc03/step1-2.log`, `tc03/step1-2_attempt1_429.log`, `tc03/step1_booking.json`, `tc03/step2_get.json`, `tc03/step2_me.json`, `tc03/step2_db.txt`, `tc03/step3.log`, `tc03/step3_dispatch_sla.json`, `tc03/step4.log`, `tc03/step5_after.txt`.
