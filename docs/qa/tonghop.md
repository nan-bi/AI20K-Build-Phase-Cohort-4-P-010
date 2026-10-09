# BÁO CÁO TỔNG HỢP QA — VinStay AI, TC-01 → TC-06

Ngày 2026-10-04 · commit `9e9ad74` (main) · backend NestJS local `:4000` + web Next.js `:3000`, DB Supabase cloud qua `backend/.env`. Chỉ dùng kết quả đã ghi trong phiên test, không thêm suy diễn.

Báo cáo chi tiết: [TC-01](TC-01_search-filter.md) · [TC-02](TC-02_ai-apartment-qa.md) · [TC-03](TC-03_booking-e2e.md) · [TC-04](TC-04_auth-rbac.md) · [TC-05](TC-05_ai-bad-input.md) · [TC-06](TC-06_admin-portal.md) · phiếu bug trong [bugs/](bugs/).

## 1. Bảng tổng

| TC | Kết quả | Số lỗi | Mức độ cao nhất |
|---|---|---|---|
| TC-01 Tìm kiếm & lọc căn hộ | **Fail** (bước 1–4 Pass, 5a Fail, 5b Pass; phần UI bước 4 Không thực thi được) | 1 | Thấp |
| TC-02 AI trả lời đúng dữ liệu | **Không áp dụng** — chưa có AI agent hỏi đáp | 0 | — |
| TC-03 Đặt lịch xem đầu-cuối | **Pass** ở mọi bước đã chạy; bước 3.2 (phía Chủ nhà / Host) Không thực thi được | 0 | — |
| TC-04 Authentication & Authorization | **Fail** — 53 ca: 49 Pass, 4 Fail (M8 🔴, M9 🔴, M10, 2/M7 do dữ liệu test) | 2 | 🔴 NGHIÊM TRỌNG |
| TC-05 Input xấu cho AI service | **Không áp dụng** — kênh người dùng chưa đi qua AI service nào | 0 | — |

## 2. Danh sách bug

| Bug-ID | TC liên quan | Mô tả | Các bước tái hiện | Expected | Actual (nguyên văn) | Mức độ | Bằng chứng |
|---|---|---|---|---|---|---|---|
| [BUG-TC01-01](bugs/BUG-TC01-01.md) | TC-01 bước 5a | `GET /properties/units` nhận `maxRent` âm, trả 200 rỗng thay vì 4xx | `GET /api/v1/properties/units?maxRent=-1` | HTTP 4xx (`invalid_request`) kèm thông báo rõ | `{"success":true,"statusCode":200,"data":[],"timestamp":"2026-10-04T15:37:40.579Z"}` | Thấp (đề xuất) | scratchpad `tc01/step5a.json` |
| [BUG-TC04-01](bugs/BUG-TC04-01.md) | TC-04 bước 1 / M8 | `GET /host/earnings` không cần đăng nhập, lộ dữ liệu thu nhập Field Host theo `hostId` | Không cookie/Authorization: `GET /api/v1/host/earnings?hostId=4fc12629-9bf4-4097-8f3c-5cb93c8c15b5` | HTTP 401; đích `field_host` (`backend/README.md:115`) | `{"success":true,"statusCode":200,"data":{"hostId":"4fc12629-9bf4-4097-8f3c-5cb93c8c15b5","fullName":"Phương Nam","rating":4.9,"walletBalance":450000,"stats":{"totalViewings":18,"totalDeals":6,"dealCommissionTotal":2400000,"viewingFeeTotal":900000,"ratingBonus":360000,"totalEarnings":3660000},"currentPeriod":"Tuần 40 / 2026","payouts":[]},"timestamp":"2026-10-04T15:50:40.898Z"}` | 🔴 NGHIÊM TRỌNG | scratchpad `tc04/step1.log`, `tc04/step1_M8.json` |
| [BUG-TC04-02](bugs/BUG-TC04-02.md) | TC-04 bước 1 / M9, M10 | `GET /handovers/contracts/:contractId` và `POST /handovers` (Hộ chiếu bàn giao số) không cần đăng nhập | M9: không xác thực `GET /api/v1/handovers/contracts/ce7dacb4-148c-4461-842a-8195c9cb0d82` · M10: không xác thực `POST /api/v1/handovers` body `{}` | HTTP 401; đích `field_host / tenant` (`backend/README.md:114`) | M9: `{"success":true,"statusCode":200,"data":[],"timestamp":"2026-10-04T15:52:02.370Z"}` · M10: `{"success":false,"statusCode":400,"timestamp":"2026-10-04T15:56:15.524Z","path":"/api/v1/handovers","code":"invalid_request","message":["contractId must be a UUID","items must be an array","utilityReadings must be an array"],"errors":null}` | 🔴 NGHIÊM TRỌNG (M9 trả 200 cho vô danh) | scratchpad `tc04/step1.log`, `tc04/rest.log` |

## 3. Dữ liệu test cần dọn (KHÔNG tự xoá)

| Bảng | ID | TC | Ghi chú |
|---|---|---|---|
| `viewings` | `b202a1c7-9903-4976-aaee-a7d2b15f15de` | TC-03 | ref `VS-HZLLC`, `PENDING_CONFIRMATION`, slot 2026-10-06T02:30:00Z; đang `WIDE_POOL`, `canClaim:true` trên `/host/board` |
| `dispatch_tickets` | `e63a9d35-b346-4ede-9a6a-0dd916416c1f` | TC-03 | `OFFERED` cho Host `4fc12629-9bf4-4097-8f3c-5cb93c8c15b5` |
| `otp_codes` | `fee435f6-d854-4e83-ae79-3105670ac242`, `4770d2ce-935d-41b2-9af5-14468cb8459f` | TC-03 | `CONSUMED` |
| `auth_audit_logs` | `bd8b11ac-72f7-4620-b978-f1c7729735e7`, `26c20b29-f9c6-477a-9d21-12b97de29d74`, `9ac53565-0909-447d-80d2-912a1cc4eb7a`, `b0701d16-2378-4e9e-8ff6-1a25032e0c3d`, `b6043ee2-d650-4b9a-a2ed-7c065d215d88`, `9a4ff387-28cb-432d-bae3-05416c8d1a7f`, `1aac25d7-db6e-401f-b369-ad2ea4e00fd8`, `36608fbd-e33e-4ea6-8f78-d41cbf775484` | TC-03 | login / otp_sent / otp_verified |
| `auth_audit_logs` | `1d2e6a17-0e01-49c6-8645-64ce3826dcca`, `d191fb51-9497-41a0-8baf-fd0d0fbef1e1`, `b2327de5-3f3a-4a8f-bde2-592c70b73553`, `0bc96610-a24e-417d-9258-d40dd6415f25`, `e4db2a5e-8362-4e27-8c97-f709a8c7aa5d` | TC-04 | 4 `login_succeeded`, 1 `login_rejected` |
| `profiles` (sửa, không tạo) | `ccfc8556-d877-490b-aa55-3ac106679422` (`khachthue.demo@vinstay.vn`) | TC-03 | Đã gắn SĐT test `0900000101` (`phoneEnc`, `phoneHash`), `isPhoneVerified=true` — cần hoàn lại |

Thay đổi ngoài DB: `node_modules` backend (`prisma generate`, `npm install`); thư mục `docs/qa/` (các báo cáo này) — chưa commit. `backend/package-lock.json` từng đổi 2+/3− sau `npm install`, nhưng lúc lưu báo cáo này đã không còn khác `HEAD` (`git diff --stat HEAD` rỗng).

## 4. Phần chưa kiểm chứng được và lý do

| Phần | Lý do |
|---|---|
| Môi trường DB có phải production hay không | DB là Supabase cloud dùng chung; chưa có xác nhận tường minh |
| TC-01 bước 4 — thông báo "không có kết quả" trên UI | Không có công cụ điều khiển trình duyệt |
| TC-01 — thiếu `@Min` ở `maxAllInCost`/`motorbikes`/`cars`/`occupants`; `maxAllInCost` không được áp trong `getUnits` | Chỉ đọc code, chưa test |
| TC-02, TC-05 — hành vi AI (hallucination, prompt injection, lộ dữ liệu) | Chưa có AI agent / AI service nhận input người dùng |
| TC-03 bước 3.2 — phía Chủ nhà (`minh.landlord@vinstay.ai`) và Host "Phương Nam" | Không có mật khẩu hai tài khoản này |
| TC-03 — đối chiếu SĐT lưu trong DB | Lưu mã hoá; chỉ đối chiếu được đuôi `101` qua `phoneMasked` |
| TC-03 — cùng khách đặt cùng căn ở slot khác | Ngoài kịch bản đã chạy |
| TC-04 — Host chỉ có một vai con | Không có tài khoản như vậy với mật khẩu đã biết |
| TC-04 2/M7 — admin đọc evidence-package với ID hợp lệ | ID truyền vào là của bảng `contract`, endpoint tìm `signedDocument`; chưa chạy lại |
| TC-04 M10 với body hợp lệ | Cố ý không thử để tránh tạo dữ liệu |
| TC-04 M8 khi bỏ `hostId` | [GIẢ ĐỊNH] từ code, chưa chạy |
| TC-04 M9 khi có biên bản bàn giao thật | DB có 0 biên bản |

Sự cố trong quá trình test: giá trị `VIETQR_WEBHOOK_SECRET` (`backend/.env:18`) đã bị in ra output công cụ khi kiểm tra `.env` — nên đổi nếu secret này dùng chung ở môi trường khác. Bằng chứng thô (log, JSON) hiện chỉ nằm trong scratchpad phiên Claude Code và có thể mất khi phiên kết thúc.

ĐÃ DÙNG: AGENTS.md, CLAUDE.md, backend/README.md, apps/web/README.md, docs/SAD_v2.md (mục lục, §6), backend/package.json, backend/prisma/schema.prisma (grep), backend/prisma/seed.ts, backend/prisma/seed-web-catalog.ts, backend/scripts/seed-auth.ts, backend/src/{main.ts, app.module.ts}, backend/src/common/{guards/supabase-auth.guard.ts, guards/roles.guard.ts, filters/http-exception.filter.ts, interceptors/transform.interceptor.ts}, backend/src/modules/property/{property.controller.ts, property.service.ts, dto/property-query.dto.ts}, backend/src/modules/tenant/{tenant.mappers.ts, slots.helper.ts}, backend/src/modules/matchmaker/{matchmaker.controller.ts, matchmaker.service.ts, dto/matchmaker-request.dto.ts}, backend/src/modules/booking/{booking.controller.ts, booking.service.ts, dto/booking.dto.ts}, backend/src/modules/auth/{demo-accounts.ts, secrets.ts, auth.module.ts, auth.service.ts (grep), session/session-token.service.ts, otp/otp.controller.ts, otp/otp.service.ts, otp/senders/*.ts}, backend/src/modules/deposit/deposit.controller.ts, backend/src/modules/demo/demo.guard.ts, backend/src/modules/identity/{identity.service.ts (grep), ekyc.simulator.ts}, backend/src/modules/host/{host.controller.ts, host.service.ts}, backend/src/modules/handover/handover.controller.ts, backend/src/modules/contract/contract.service.ts, mọi `*.controller.ts` (grep decorator), backend/.env · .env · apps/web/.env · apps/web/.env.example (tên khoá và giá trị không nhạy cảm), apps/web/{next.config.ts, src/proxy.ts (grep), src/components/chat/ChatExperience.tsx, src/components/chat/* (grep), src/lib/mock/matchmaker.ts}, src/{main.py, config.py, api/routes.py, agents/graph.py, agents/state.py, agents/nodes/example_node.py, agents/tools/example_tool.py, models/schemas.py, services/llm.py}, tests/{conftest.py, test_api/test_routes.py}, docs/qa/TC-02_ai-apartment-qa.md, docs/qa/TC-05_ai-bad-input.md, scratchpad tc01/tc03/tc04 (log, JSON, phiếu bug), truy vấn chỉ đọc DB Supabase qua Prisma, response API thật từ localhost:4000

## 5. Sửa các phát hiện review — 2026-10-06

Đây là cập nhật mã sau báo cáo kiểm thử ngày 2026-10-04; các actual và dữ liệu test ở trên được giữ nguyên làm lịch sử.

| Phát hiện | Thay đổi trong mã |
|---|---|
| Thu nhập Field Host lộ công khai và dùng số mẫu | Chỉ vai `field_host` đọc thu nhập gắn với hồ sơ trong phiên; thống kê tính từ `HostPayout`. |
| Ký gửi không xác thực chủ căn | Kiểm tra `landlordId`; mã cửa đã mã hóa và mandate được ghi trong cùng transaction. |
| Hộ chiếu bàn giao công khai và ảnh giả | Yêu cầu inspector được phân công, giới hạn quyền đọc theo hợp đồng, lưu ảnh trong kho private và băm SHA-256 từ bytes thật. |
| Nút đặt lịch bỏ qua đăng nhập; mô tả eKYC sai thực tế | Mọi nút đặt lịch dùng cùng kiểm tra phiên; giao diện nêu rõ tài khoản tenant và eKYC thật chưa khả dụng. |
| Hai khách có thể nhận cùng slot | Tạo/đổi lịch dùng transaction `Serializable`; lỗi serialization trả 409 `slot_taken`. |
| Matchmaker dùng dữ liệu All-in / số lượng quét giả | Matchmaker tính chi phí và đối chiếu từ catalog trước khi lọc, trả số căn đã quét thực tế. |
| Simulator eKYC có thể tạo hợp đồng | Từ chối scan khi chưa có nhà cung cấp thật trong production và chặn submit token mô phỏng ngoài test. |
| UNC chưa lưu/không khóa căn nhất quán | Lưu chứng từ, ghi audit, giữ căn 30 phút; admin duyệt/từ chối có kiểm tra xung đột và chỉ giải phóng căn khi không còn khoản giữ hiệu lực. |
| Nút duyệt ký gửi báo thành công giả | API thủ công trả 501 vì luồng đã thay bằng thẩm định; UI demo không còn nút duyệt/từ chối giả. |

Kiểm tra lại ngày 2026-10-06: `npm run build` thành công; toàn bộ backend pass **38/38 suite, 587/587 tests** với `npm test -- --watchman=false --runInBand` khi cho phép Supertest mở cổng loopback. Sáu suite HTTP không có lỗi Nest: sandbox chặn bind loopback khiến Supertest báo địa chỉ null; chạy ngoài sandbox thì cả 211 test pass. `admin-flows.spec.ts` đã thay test Prisma giả và chữ ký BookingService cũ bằng bốn kiểm tra HTTP chỉ đọc qua Nest/Prisma thật trên Supabase.

Đối chiếu `Prisma.dmmf` với `information_schema.columns` trên Supabase cho thấy 27/27 bảng có mặt; chỉ model `Unit.bedrooms` không tồn tại trong DB. Đã bỏ field khỏi Prisma schema và seed, tính số phòng từ `layoutType`, rồi chạy lại API thật: 21 tòa nhà và 54 căn công khai; unit detail, busy-slots và Matchmaker đều trả thành công (Matchmaker tìm 3 căn). Không chạy migration và không ghi/xóa dữ liệu Supabase.

Frontend typecheck, build và 26 suite vẫn pass (267 tests) theo lần chạy trước; frontend không đổi trong vòng kiểm tra này. Các test-double/Jest mock ở những suite backend khác vẫn còn; yêu cầu thay toàn bộ test mock bằng kiểm thử API thật chưa hoàn tất. `npm audit` cũng chưa được xác minh lại vì truy cập registry bị chặn trong lần chạy gần nhất.

## 6. TC-06 Cổng Admin — 2026-10-09

Commit `4b00d24` (main). Chi tiết: [TC-06](TC-06_admin-portal.md) · biên bản chức năng: [ADMIN_PORTAL_FUNCTIONAL_RECORD.md](../ADMIN_PORTAL_FUNCTIONAL_RECORD.md).

| TC | Kết quả | Số lỗi | Mức độ cao nhất |
|---|---|---|---|
| TC-06 Cổng Admin | **Pass có điều kiện**: backend `admin` + `field-hosts` 208 test (pass hết khi không timeout; bộ test chập chờn); web typecheck, lint, build exit 0; trình duyệt 14/14 trang `/admin/*` tải được ở cả local và deploy | 1 ([BUG-TC06-01](bugs/BUG-TC06-01.md)) | Cao |

| Chỉ số | Lần trước | 2026-10-09 |
|---|---|---|
| Web test | 26 suite, 267 test pass | 34 file, 347 test: **345 pass, 2 fail** (`landing-anchors.test.ts`, trang Landing, ngoài phạm vi Admin) |
| Backend Admin | (nằm trong 587/587) | 208/208 pass sau `npx prisma generate`; trước đó `admin-flows.spec.ts` không biên dịch được do Prisma client local cũ |

| Bug-ID | TC liên quan | Mô tả | Mức độ |
|---|---|---|---|
| [BUG-TC06-01](bugs/BUG-TC06-01.md) | TC-06 / F15 | `POST /admin/door-keys/:id/rotate` lưu mã mới thiếu tiền tố `aes:` ⇒ Host nhận `door_code_missing` sau khi Admin xoay mã (đọc code, chưa tái hiện trên DB) | Cao |

Phát hiện cần chốt (xem biên bản mục 6): API Admin trả SĐT/CCCD đã giải mã; F14 nhắc gia hạn luôn 503; F10 hủy cọc chỉ ghi audit; F4 duyệt ký gửi trả 501 có chủ đích; F7, F9, F10, F15 chưa có màn; UI Biến phí chỉ sửa 5/10 tham số; xuất CSV không ghi audit; **bản deploy Vercel khác `main`** và `/auth/session` trả 429 khi chuyển trang nhanh; `docs/UI_FLOW_SPEC.md` còn ghi khóa căn 7 ngày; dấu vết RFID còn trong schema.

Rà soát lần 1 (Trần Thu Phương, dùng agent thẩm định độc lập): 🔁 SỬA ⇒ biên bản v2. Rà soát lần 2 (Trần Thu Phương): duyệt trình duyệt local + deploy. Rà soát lần 3 (Trần Thị Lan, Nguyễn Phương Nam, Nguyễn Khánh Duy): đang chờ. Bằng chứng ảnh chụp: [evidence/TC-06/](evidence/TC-06/).

## 7. Chạy lại TC-01 → TC-05 — 2026-10-09

Commit `4b00d24` (main) · backend local `:4000` + web local `:3000`, DB Supabase cloud · trình duyệt Edge headless cho phần UI. Lịch sử lần chạy 2026-10-04 ở mục 1–4 được giữ nguyên. Bằng chứng (log, script, ảnh): [evidence/TC-01-05_2026-10-09/](evidence/TC-01-05_2026-10-09/).

| TC | 2026-10-04 | 2026-10-09 | Thay đổi chính |
|---|---|---|---|
| [TC-01](TC-01_search-filter.md) Tìm kiếm & lọc | Fail (5a) | **Fail** (5a, 5c, 5d) | Bước 4 trên UI nay đã chạy và Pass. BUG-TC01-01 vẫn còn; thêm [BUG-TC01-02](bugs/BUG-TC01-02.md) (`maxAllInCost` bị bỏ qua, nhận số âm) |
| [TC-02](TC-02_ai-apartment-qa.md) AI trả lời đúng dữ liệu | Không áp dụng | **Bị chặn** | Đã có AI Engine + relay nhưng không môi trường nào chạy LLM (local thiếu khóa, deploy `503 AI_UPSTREAM_DOWN`). 5 câu qua UI rơi vào bộ lọc nhanh: không bịa, nhưng không trả lời câu hỏi cụ thể |
| [TC-03](TC-03_booking-e2e.md) Đặt lịch đầu-cuối | Pass (3.2 không chạy được) | **Pass** (3.2 không chạy được) | Lịch `VS-WUKVH` tạo thành công, ticket giao Host demo. 3.2: mật khẩu Host demo sai (401), chủ nhà demo không có căn |
| [TC-04](TC-04_auth-rbac.md) Authentication & Authorization | Fail (2 bug 🔴) | **Pass 66/66** | [BUG-TC04-01](bugs/BUG-TC04-01.md), [BUG-TC04-02](bugs/BUG-TC04-02.md) **đã sửa** |
| [TC-05](TC-05_ai-bad-input.md) Input xấu cho AI | Không áp dụng | **Pass ở lớp relay + UI; nhóm 4–5 bị chặn** | Validation, rate limit, chống XSS, không lộ lỗi nội bộ: đạt. Chuỗi chỉ có khoảng trắng lọt qua validation. Lượt thử của khách bị trừ cả khi AI lỗi |

### Bug — trạng thái mới

| Bug-ID | Mức độ | Trạng thái 2026-10-09 |
|---|---|---|
| [BUG-TC01-01](bugs/BUG-TC01-01.md) | Thấp | Vẫn còn |
| [BUG-TC01-02](bugs/BUG-TC01-02.md) | Trung bình | Mới |
| [BUG-TC04-01](bugs/BUG-TC04-01.md) | 🔴 | Đã sửa (xác nhận lại) |
| [BUG-TC04-02](bugs/BUG-TC04-02.md) | 🔴 | Đã sửa (xác nhận lại) |
| [BUG-TC06-01](bugs/BUG-TC06-01.md) | Cao | Mới (TC-06) |

### Dữ liệu test cần dọn (KHÔNG tự xoá)

Chỉ TC-03 tạo dữ liệu nghiệp vụ: viewing `c5a68b99-62a2-4386-824f-1606d6fa241e` (`VS-WUKVH`), dispatch ticket `ba5b754b-ddd9-4e1f-92d2-b857a8eb670f`, OTP `9ab6541a-2e9a-43a1-9998-3b543455b0be`. Danh sách log đăng nhập ở [TC-03](TC-03_booking-e2e.md). Lịch `VS-WUKVH` đang mời Host demo, nên dọn trước khi demo.

### Chưa kiểm được và lý do

| Phần | Lý do |
|---|---|
| Hành vi LLM (TC-02 hallucination, TC-05 nhóm 4–5) | Chưa có môi trường chạy AI Engine thật |
| Bộ test `ai-engine/tests` (LLM giả) | Ổ C: đầy 100%, `uv sync` lỗi `os error 112` |
| TC-03 bước 3.2 | Mật khẩu `host.oceanpark@vinstay.vn` trong bảng tài khoản demo không đúng; `chunha.oceanpark@vinstay.vn` không sở hữu căn |

Phát hiện môi trường: `ai-engine/.venv` không nằm trong `.gitignore` (chạy `uv sync` theo README sẽ sinh thư mục chưa theo dõi trong repo).
