# BÁO CÁO TỔNG HỢP QA — VinStay AI, TC-01 → TC-05

Ngày 2026-10-04 · commit `9e9ad74` (main) · backend NestJS local `:4000` + web Next.js `:3000`, DB Supabase cloud qua `backend/.env`. Chỉ dùng kết quả đã ghi trong phiên test, không thêm suy diễn.

Báo cáo chi tiết: [TC-01](TC-01_search-filter.md) · [TC-02](TC-02_ai-apartment-qa.md) · [TC-03](TC-03_booking-e2e.md) · [TC-04](TC-04_auth-rbac.md) · [TC-05](TC-05_ai-bad-input.md) · phiếu bug trong [bugs/](bugs/).

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
