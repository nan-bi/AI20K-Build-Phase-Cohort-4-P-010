# 18 — Dữ liệu căn đủ để tư vấn + LLM Advisor (ai-engine)

| Trường | Giá trị |
| :-- | :-- |
| Mã | 18_2026-10-07_Unit-Knowledge-LLM-Advisor |
| SemVer | MINOR — `backend 1.5.0 → 1.6.0` · `apps/web 0.15.0 → 0.16.0` · `ai-engine 0.1.0` (mới) |
| Trạng thái | 🟢 ĐÃ DUYỆT 2026-10-07 ("Oki làm đi") — đang thi công wave A |
| Base | `e17afa7` (merge PR #23) |
| Môi trường | Supabase dev. Đổi schema ⇒ `npx prisma db push` do 🖐 chạy (OPERATIONS §2). OpenRouter key thật chỉ ở `.env` máy người |
| Phạm vi | [01 §8](specs/01-CONTRACTS.md) |
| Chủ trì | SO (Claude) · duyệt: chủ tịch (namnp) |
| Charter | Chủ nhà #1 (khớp nhanh, Căn hời), #3 (nội thất chi tiết làm căn cứ) · Khách #1 (verified), #2 (All-in), #4 (cọc minh bạch) · Vận hành #1 (thẩm định 1 lần) |
| Nguồn | Chủ tịch 2026-10-07: "phát triển nhanh 1 LLM base cho chatbot đang hard cứng — uv, openrouter, fastAPI, gpt-4o-mini … tư vấn thật tốt chứ không chỉ bộ lọc … làm giàu data chỗ nào" + 3 lượt trả lời sau (mục 2.1) |

## 1. Bối cảnh

Chatbot trang chủ là regex + FAQ cứng (`apps/web/src/lib/tenant/matchmaker.ts`). Dữ liệu căn quá nghèo để tư vấn: hướng/WC không thu, 32 hạng mục nội thất thẩm định chỉ nằm trong JSON meta của mandate, trang căn hiện danh sách "Hộ chiếu bàn giao" cứng, cọc ghi cứng ở UI. Chi tiết H1–H9: [00 §1](specs/00-ARCHITECTURE.md).

## 2. Nhật ký quyết định

### 2.1 Chủ tịch đã chốt (2026-10-07)
- **C1** Chỉ làm căn Vinhomes Ocean Park 1 ⇒ khoảng cách POI gần như không đổi giữa các căn ⇒ KHÔNG làm dữ liệu POI theo căn; chỉ 1 file tri thức chung OP1.
- **C2** Tiền cọc KHÔNG cố định 2.000.000 — bot/UI không được viết cứng số tiền cọc.
- **C3** Thông tin cơ bản (diện tích, loại phòng, WC, hướng, tầng, nội thất) do chủ nhà khai lúc ký gửi.
- **C4** Trang căn: "Hộ chiếu bàn giao số" → **"Nội thất chi tiết"** lấy từ dữ liệu thật; bỏ câu "Lúc nhận nhà, Field Host và bạn cùng chụp ảnh…".
- **C5** Giới thiệu căn: chủ nhà điền theo mẫu khi ký gửi.
- **C6** Thẩm định được sửa giá thuê, cọc… Nếu giá/cọc **đổi** ⇒ gửi về chủ ticket, chủ chọn **Đồng ý / Không đồng ý**; **không đổi** ⇒ đăng luôn.
- **C7** Vai Field Host chỉ còn 2 dạng: **Sale** hoặc **Sale + Thẩm định** (không còn "chỉ Thẩm định").
- **C8** Tri thức quy trình (cọc hết hạn, quy trình xem nhà…) dùng text, embedding cũng được.
- **C9** Tech ai-engine: Python + uv + FastAPI + OpenRouter, model mặc định `openai/gpt-4o-mini`, thư mục service riêng.
- **C10** (Q1) Chủ nhà **Không đồng ý** giá/cọc Inspector đề xuất ⇒ **đóng hồ sơ** (`rejected`, căn không niêm yết). Duyệt Đ1–Đ9 nguyên văn; Q2–Q4 theo mặc định.

### 2.2 Đề xuất của SO (2026-10-07, chờ duyệt)
- **Đ1** `units` là nguồn chân lý DUY NHẤT cho UI + AI: thêm `securityDeposit`, `highlights`; ghi `bathrooms`, `direction`, `minLeaseMonths` thật. [01 §2](specs/01-CONTRACTS.md)
- **Đ2** Bảng mới `unit_inventory_items` ghi khi niêm yết, từ 32 dòng thẩm định; công khai chỉ `present/qty/spec`, KHÔNG công khai `condition`/`compensation`. [SPEC-P01 §3](specs/SPEC-P01-Unit-Data.md)
- **Đ3** Mô tả: mẫu = tiêu đề + 3 điểm nổi bật + đoạn tự do ≤ 600 ký tự; server chặn SĐT/link/giá trong text. [SPEC-P01 §4](specs/SPEC-P01-Unit-Data.md)
- **Đ4** Vai Host: bất biến `INSPECTOR ⇒ SALE`, Admin chỉ chọn "Sale" hoặc "Sale + Thẩm định"; dữ liệu cũ tự bổ sung SALE. [SPEC-P02 §1](specs/SPEC-P02-Inspection-Pricing.md)
- **Đ5** Stage mới `awaiting_landlord` giữa `inspecting` và `approved`; so sánh đúng số nguyên VNĐ. [SPEC-P02 §2](specs/SPEC-P02-Inspection-Pricing.md)
- **Đ6** Thông tin thực tế (diện tích, layout, WC, hướng, nội thất) Inspector sửa thẳng, KHÔNG cần chủ duyệt; chỉ giá thuê + cọc bảo đảm cần duyệt. [SPEC-P02 §3](specs/SPEC-P02-Inspection-Pricing.md)
- **Đ7** Cọc giữ chỗ: hồ sơ này CHỈ đưa số tiền ra API (`holdingDeposit` trên unit) để UI/bot đọc; quy tắc tính giữ như backend hiện tại cho tới khi Q4 được trả lời. [01 §3](specs/01-CONTRACTS.md)
- **Đ8** ai-engine = thư mục top-level `ai-engine/`, vòng tool-calling tự viết (không LangGraph), tool gọi API Nest (không đọc DB), tri thức = markdown + `lookup_policy` (chưa embedding). [SPEC-P05](specs/SPEC-P05-AI-Engine.md)
- **Đ9** Trình duyệt → Nest `POST /api/v1/assistant/chat` (relay) → ai-engine; ai-engine lỗi ⇒ web rơi về bộ lọc regex cũ. [SPEC-P05 §6](specs/SPEC-P05-AI-Engine.md)

### 2.3 Câu hỏi — Q1 ✅ chốt (b); Q2, Q3, Q4 theo mặc định (chủ tịch "Oki làm đi" 2026-10-07)
| # | Câu hỏi | Mặc định nếu không trả lời |
| :-- | :-- | :-- |
| ~~Q1~~ | ✅ Chủ tịch chốt (b): chủ Không đồng ý ⇒ đóng hồ sơ `rejected` | — |
| Q2 | Chủ không trả lời đề xuất giá bao lâu thì sao? | Chờ vô hạn, không tự đăng; hiện ở "Cần xử lý" của chủ |
| Q3 | Tiền cọc bảo đảm chủ không khai ⇒ mặc định bao nhiêu? | Bằng 1 tháng giá thuê (đúng câu UI hiện tại) |
| Q4 | Quy tắc tiền **cọc giữ chỗ**: (a) Admin cài 1 mức chung, (b) theo từng căn, (c) % giá thuê? | Giữ backend hiện tại; mở hồ sơ riêng khi chốt (đổi luật AGENTS.md) |

### 2.4 Quyết định bị thay thế
| Cũ | Thay bằng | Ngày |
| :-- | :-- | :-- |
| Hồ sơ 16 Q1: "Chỉ vai Thẩm định được thẩm định (Host có thể chỉ có INSPECTOR)" | C7/Đ4: Thẩm định luôn kèm Sale | 2026-10-07 |
| Hồ sơ 16 `listing-publisher` §5.3: "Giá KHÔNG đụng tới khi niêm yết" | C6/Đ5: giá/cọc được ghi khi niêm yết theo bản đã thống nhất | 2026-10-07 |
| Hồ sơ 16: hiển thị 10 hạng mục "Hộ chiếu bàn giao" ở trang căn | C4/Đ2: "Nội thất chi tiết" từ `unit_inventory_items` | 2026-10-07 |
| Plan thảo luận 2026-10-07 lượt 1: dữ liệu POI theo căn | C1: 1 file tri thức chung OP1 | 2026-10-07 |

## 3. Work Packages

| WP | Nội dung | SPEC | Tầng | Phụ thuộc |
| :-- | :-- | :-- | :-- | :-- |
| WP1 | Schema + backend dữ liệu căn (cột mới, bảng nội thất, form ký gửi, validator mô tả) | SPEC-P01 | 🟠 | — |
| WP2 | Vai Host + luồng giá/cọc `awaiting_landlord` | SPEC-P02 | 🟠 | WP1 |
| WP3 | Web: form ký gửi, màn thẩm định, thẻ duyệt giá của chủ, trang căn "Nội thất chi tiết", Admin chọn vai | SPEC-P03 | 🟠 | WP1, WP2 (contract) |
| WP4 | Tri thức markdown (policy + OP1) đối chiếu code thật | SPEC-P04 | 🔴 viết · 🟢 định dạng | — |
| WP5 | ai-engine (uv, FastAPI, OpenRouter, tools, eval) | SPEC-P05 §1–5 | 🟠 | WP1 (API unit mới) |
| WP6 | Relay Nest `/assistant/chat` + nối `ChatExperience` | SPEC-P05 §6–7 | 🟠 | WP5 |
| WP7 | Thẩm định đối kháng (chỉ đọc) | TESTING-ACCEPTANCE | 🔴 khác họ model | WP1–WP6 |

Song song: wave A = WP1 ‖ WP4 ‖ WP5 (khung, tool dùng contract 01 §5) · wave B = WP2 ‖ WP6 · wave C = WP3 · wave D = WP7.

## 4. Checklist
- [x] Chủ tịch duyệt Đ1–Đ9, Q1 = (b), Q2–Q4 mặc định (2026-10-07)
- [ ] 🖐 `npx prisma db push` (OPERATIONS §2) sau WP1
- [ ] WP1 · WP2 · WP3 · WP4 · WP5 · WP6 · WP7
- [ ] 🖐 `OPENROUTER_API_KEY` vào `ai-engine/.env`
- [ ] Rà `brain4agent/project-intro.md` + `brain4agent/-data-architecture.md` (thư mục top-level mới + ngôn ngữ mới — AGENTS.md "Structural Extension")
- [ ] Cập nhật `CLAUDE.md` mục Architecture (ai-engine), `apps/web/README.md`, `backend/README.md`
- [ ] Exit Gates G1–G6 ✅ local và server

## 5. Bảng trỏ SPEC
| File | Nội dung |
| :-- | :-- |
| [00-ARCHITECTURE](specs/00-ARCHITECTURE.md) | Hiện trạng H1–H9, mục tiêu, non-goals, bất biến B1–B10, thứ tự đọc |
| [01-CONTRACTS](specs/01-CONTRACTS.md) | Schema Prisma, DTO, API, kiểu dữ liệu, phạm vi file |
| [SPEC-P01-Unit-Data](specs/SPEC-P01-Unit-Data.md) | Cột căn, bảng nội thất, form ký gửi, validator mô tả |
| [SPEC-P02-Inspection-Pricing](specs/SPEC-P02-Inspection-Pricing.md) | Vai Host, diff giá/cọc, duyệt của chủ |
| [SPEC-P03-Web](specs/SPEC-P03-Web.md) | Các màn web |
| [SPEC-P04-Knowledge](specs/SPEC-P04-Knowledge.md) | Tri thức markdown cho LLM |
| [SPEC-P05-AI-Engine](specs/SPEC-P05-AI-Engine.md) | Service Python, tool, prompt, relay, eval |
| [OPERATIONS](specs/OPERATIONS.md) | db push, chạy service, rollback |
| [TESTING-ACCEPTANCE](specs/TESTING-ACCEPTANCE.md) | Ma trận test, bằng chứng, Exit Gates |

## 6. Vòng sửa sau thẩm định WP7 (2026-10-07) — phán quyết 🔁 SỬA
- **Đ10** Luật cọc bảo đảm của Inspector: `securityDeposit ∈ [holdingDepositAmount(), 3×rent]`, rent ≥ 3tr (F2). Ghi ở SPEC-P02 §5, 01 §4.2.
- **Đ11** F13 (số 2.000.000 còn cứng ở FAQ fallback, booking, ConsignWizard, deposit-terms, lease-pdf) **không** làm ở hồ sơ này — thuộc hồ sơ "cọc giữ chỗ không cố định" chờ Q4. Ghi roadmap.
- Sửa F1, F3, F4, F5, F6, F7, F8–F12, F14 (R07). Thẩm định lại sau sửa: chỉ chạy lại bộ đo + probe của R07, không cần vòng đối kháng mới.
- **Đ12** Tri thức còn 8 chỗ số viết bằng chữ ("ba ngày", "mười phút"…) ở bql-rules/move-out/security-deposit/viewing-process: ghi nhận 🟡, chủ tịch rà cùng 9 dòng `CẦN DUYỆT`; không biến hoá vì không phải số Admin cài.
- **Đ13** (F14-iii) PIN cửa Inspector đã lưu vẫn nằm trong vault (mã hoá `aes:`) sau khi chủ decline: 🟡 ghi nhận, KHÔNG xoá — `storeDoorPin` upsert đè hàng cũ, không phân biệt được PIN của chủ với PIN của Inspector; PIN đúng của căn đó nên giữ lại an toàn hơn xoá nhầm. Mở lại nếu có cờ `inspectorPinStored`.
- **Đ14** `POLICY_VIOLATION` không cần code web riêng: F3 làm MỌI lỗi trước delta đầu ⇒ fallback bộ lọc cũ.
