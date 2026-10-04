# TC-05 — Xử lý input xấu cho AI service

| Mục | Giá trị |
|---|---|
| Kết quả | **KHÔNG ÁP DỤNG** — kênh người dùng chưa đi qua AI service nào |
| Ngày đánh giá | 2026-10-04 |
| Commit | `9e9ad74` (main) |
| Môi trường | local: backend NestJS `:4000`, web Next.js `:3000`; AI service Python `:8000` không chạy |
| Người thực thi | Claude Code (vai QA executor), chỉ đọc mã nguồn |
| Input đã gửi | **0** — không gửi input nào trong 6 nhóm |

## Khai báo

**VinStay AI hiện CHƯA có AI service nào nhận input từ người dùng.** Tin nhắn ở chat "VinStay AI" trang chủ được xử lý hoàn toàn trong trình duyệt bằng luật (regex + câu trả lời soạn sẵn), không gửi lên server. AI service Python là khung template, không có LLM, không có system prompt, và không thành phần nào gọi tới. Vì vậy chưa thể đo khả năng chống prompt injection, lộ system prompt hay lộ dữ liệu qua AI; kết quả TC-05 không được hiểu là "đạt". Xem thêm khai báo tương tự ở `docs/qa/TC-02_ai-apartment-qa.md`.

## Bằng chứng

| Thành phần | Hiện trạng | Nguồn |
|---|---|---|
| Chat "VinStay AI" trang chủ (kênh người dùng thật) | `interpret()` chạy trong trình duyệt; grep `fetch(\|api/v1\|axios\|useSWR` trong `apps/web/src/components/chat/` → 0 kết quả | `apps/web/src/components/chat/ChatExperience.tsx:52`, `apps/web/src/lib/mock/matchmaker.ts:344` |
| AI service Python — `POST /api/v1/chat` (`:8000`) | Node `analyze`/`respond` trả chuỗi lặp lại input; không gọi LLM; không có bên gọi (grep `8000\|openai\|/api/v1/chat\|AI_SERVICE` trên `apps/web/src`, `backend/src` → 0 kết quả) | `src/agents/nodes/example_node.py:4-26`, `src/api/routes.py` |

## Rủi ro đọc từ code (chưa chạy — để kiểm khi có agent thật)

| # | Nhóm input | Điểm cần kiểm | Nguồn |
|---|---|---|---|
| 1 | Rỗng / chỉ khoảng trắng | Rỗng → 422 (có test `tests/test_api/test_routes.py:13-15`). Chỉ khoảng trắng lọt qua `min_length=1` [GIẢ ĐỊNH] | `src/models/schemas.py` |
| 2 | Rất dài | `max_length=5000` → dự kiến 422 khi vượt [GIẢ ĐỊNH]. Ô nhập chat web không có `maxLength` | `src/models/schemas.py`; grep `maxLength` trong `components/chat/` → 0 |
| 3 | Ký tự đặc biệt / HTML / script | Chat web không dùng `dangerouslySetInnerHTML`; React mặc định escape [GIẢ ĐỊNH rủi ro XSS thấp] | grep `dangerouslySetInnerHTML` trong `components/chat/` → 0 |
| 4–5 | Prompt injection / đòi dữ liệu người khác | Chưa có system prompt, chưa có tool truy vấn dữ liệu → chưa có bề mặt tấn công; phải kiểm lại ngay khi nối LLM + tool | — |
| — | Xử lý lỗi | Mọi exception → HTTP 500 kèm `detail=str(e)` — nguy cơ lộ thông điệp lỗi nội bộ (vd. lỗi từ nhà cung cấp LLM) khi nối LLM thật | `src/api/routes.py:16-17` |
| 6 | 5 yêu cầu liên tiếp | Service Python không có rate limit | `src/main.py`, `src/api/routes.py` |

## Điều kiện để chạy lại TC-05

1. Chat trang chủ gửi tin nhắn tới một AI service thật (LLM + system prompt + tool truy vấn dữ liệu).
2. Môi trường test tách khỏi production, có log/tool-call xem được.
3. Khi đó chạy đủ 6 nhóm input của TC-05 qua đúng kênh người dùng.
