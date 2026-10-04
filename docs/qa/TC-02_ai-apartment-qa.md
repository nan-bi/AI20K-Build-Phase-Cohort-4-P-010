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
