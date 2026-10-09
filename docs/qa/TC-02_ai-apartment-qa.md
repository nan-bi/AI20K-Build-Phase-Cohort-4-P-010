# TC-02 — AI trả lời về căn hộ đúng dữ liệu, không hallucination

| Mục | Giá trị |
|---|---|
| Kết quả | **KHÔNG ÁP DỤNG** — chưa có AI agent hỏi đáp |
| Ngày đánh giá | 2026-10-04 |
| Commit | `9e9ad74` (main) |
| Môi trường | local: backend NestJS `:4000`, web Next.js `:3000`; AI service Python `:8000` không chạy |
| Người thực thi | Claude Code (vai QA executor), chỉ đọc mã nguồn |
| Câu hỏi đã gửi | **0** — dừng ở cổng kiểm tra, không gửi câu nào |

## Khai báo

**VinStay AI hiện CHƯA có AI agent hỏi đáp về căn hộ.** Không có LLM, RAG hay tool-call nào truy vấn dữ liệu căn để trả lời người dùng. Mọi chỗ mang nhãn "AI" ở cổng Khách thuê đang là luật (rule-based) hoặc câu trả lời soạn sẵn. Vì vậy chưa thể đo hallucination; kết quả TC-02 không được hiểu là "đạt".

## Bằng chứng

| Kênh | Hiện trạng | Nguồn |
|---|---|---|
| AI service LangGraph — `POST /api/v1/chat` (`:8000`) | Khung template. `analyze_node` trả `"Phân tích: {query}"`, `respond_node` trả `"Kết quả dựa trên phân tích: …"`; không gọi LLM (`get_llm()` không được dùng), không gọi tool, không đọc DB | `src/agents/nodes/example_node.py:4-26`, `src/agents/graph.py`, `src/services/llm.py` |
| Bên gọi AI service | Không có. Grep `8000\|openai\|/api/v1/chat\|AI_SERVICE` trên `apps/web/src` và `backend/src` → 0 kết quả | — |
| Chat "VinStay AI" ở trang chủ (kênh người dùng thật) | `interpret()` chạy trong trình duyệt: regex tách tiêu chí → lọc catalog (API A1), hoặc trả FAQ soạn sẵn / câu hỏi lại cố định. Không gọi API để trả lời. Grep `fetch(\|api/v1\|axios\|useSWR` trong `components/chat/` → 0 kết quả | `apps/web/src/components/chat/ChatExperience.tsx:52`, `apps/web/src/lib/mock/matchmaker.ts:312,344` |
| `POST /api/v1/matchmaker/recommend` | Lọc ngân sách All-in + xếp hạng theo % tiết kiệm; `aiExplanation` là chuỗi template | `backend/src/modules/matchmaker/matchmaker.service.ts:18-75` |
| Kiến trúc mục tiêu | SAD v2 §6: chỉ Engine 1 (Matchmaker) có lớp ranking; không nêu hỏi đáp LLM | `docs/SAD_v2.md` §6 |

## Ghi nhận ngoài phạm vi (chưa chạy, đọc code)

- FAQ soạn sẵn tại `apps/web/src/lib/mock/matchmaker.ts:299` ghi "AI … tự điền **Thỏa thuận đặt cọc**; bạn ký bằng mã OTP Zalo" — mâu thuẫn `AGENTS.md` (Chủ nhà #3: khách tick đồng ý điều khoản cọc, không ký thỏa thuận cọc riêng). Đây là nội dung viết tay, không phải hallucination; đề xuất tách TC riêng về nội dung FAQ.

## Điều kiện để chạy lại TC-02

1. Có endpoint hỏi đáp thật, nối vào kênh người dùng (chat trang chủ).
2. Agent truy vấn dữ liệu căn từ DB/API (tool-call hoặc truy vấn), có log xem được.
3. Khi đó chạy đủ 5 câu: (a) 2 câu có đáp án trong dữ liệu, (b) 1 câu về thông tin không có, (c) 1 câu về căn không tồn tại, (d) 1 câu ngoài phạm vi — đáp án chuẩn lấy trực tiếp từ DB/API và ghi nguồn.

---

## Đánh giá lại 2026-10-09 (commit `4b00d24`)

**Kết quả: BỊ CHẶN** (không còn là "chưa có AI"). Repo đã có AI Engine (`ai-engine/`, FastAPI + OpenRouter `gpt-4o-mini`) nối qua relay Nest `POST /api/v1/assistant/chat`, nhưng **không môi trường nào đang chạy LLM**:

| Môi trường | Bằng chứng |
|---|---|
| Local | Không có `ai-engine/.env` (thiếu `OPENROUTER_API_KEY`); `backend/.env` không có `AI_ENGINE_URL` ⇒ relay trả `503 AI_UPSTREAM_DOWN` |
| Deploy Vercel | `POST https://ai-20-k-build-phase-cohort-4-p-010.vercel.app/api/v1/assistant/chat` ⇒ `{"success":false,"statusCode":503,…,"code":"AI_UPSTREAM_DOWN","message":"Trợ lý AI tạm thời không khả dụng","errors":null}` |

Đã gửi đủ 5 câu qua **kênh người dùng thật** (ô chat trang chủ, tài khoản khách thuê demo). Mọi lượt relay đều 503, nên web chuyển sang bộ lọc nhanh (regex). Đây là đo **nhánh dự phòng**, không phải đo LLM. Bằng chứng: [ui-tc02/](evidence/TC-01-05_2026-10-09/ui-tc02/).

| # | Loại câu | Câu hỏi | Đáp án chuẩn (DB/API) | Câu trả lời nhận được | Đánh giá |
|---|---|---|---|---|---|
| a1 | Có trong dữ liệu | "Căn VHOP-S2.18-1602 giá thuê bao nhiêu một tháng?" | Có giá trong `GET /properties/units` | Lọc theo tòa S2.18: "tìm thấy 2 căn phù hợp", không nêu giá căn được hỏi | Không bịa; **không trả lời đúng câu hỏi** |
| a2 | Có trong dữ liệu | "Có căn 2 phòng ngủ nào ở Sapphire 2 không?" | 1 căn (`VHOP-S2.18-1602`, TC-01 bước 3) | "tìm thấy 1 căn phù hợp" → `S2.18 · Tầng 16 · Căn 02` | **Đúng** |
| b | Thông tin không có | "Căn VHOP-S2.18-1602 có cho nuôi chó không?" | Không có dữ liệu chính sách thú cưng theo căn | "Đã lọc 52 căn trống nhưng hiện không có kết quả khớp" (lọc S2.18 + thú cưng) | Không bịa; dễ hiểu nhầm thành "không cho nuôi" |
| c | Căn không tồn tại | "Căn VHOP-ZZ.99-9999 giá thuê bao nhiêu?" | Không tồn tại (`404 unit_not_found`, TC-03 4c) | "Mình chỉ có thể lọc căn theo dữ liệu hiện có. Hãy nhập ngân sách…" | Không bịa |
| d | Ngoài phạm vi | "Thủ đô của nước Pháp là gì?" | Ngoài phạm vi | Như câu c | Không bịa, có từ chối ngầm |

Kết luận: nhánh dự phòng **không hallucinate**, nhưng chỉ lọc, không trả lời câu hỏi cụ thể. Hành vi của LLM (bịa số liệu, tool-call) **chưa đo được**. Bộ test có sẵn của AI Engine (`ai-engine/tests`, chạy với LLM giả) cũng chưa chạy được vì máy hết dung lượng ổ C: khi cài phụ thuộc.

Điều kiện chạy lại: cấp `OPENROUTER_API_KEY` + `INTERNAL_KEY` cho `ai-engine/.env`, đặt `AI_ENGINE_URL`/`AI_ENGINE_INTERNAL_KEY` trong `backend/.env` (hoặc bật AI Engine trên deploy), rồi chạy lại 5 câu trên.
