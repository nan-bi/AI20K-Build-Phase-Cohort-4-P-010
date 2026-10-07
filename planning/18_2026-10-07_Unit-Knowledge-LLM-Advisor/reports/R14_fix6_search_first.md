Worker · thi công · Sonnet · Bước 0 skip · hiểu việc: phạm vi matchmaker+assistant backend, ai-engine, web chat/lib/assistant/tests, planning 18; xong khi 3 bộ đo xanh + bộ đo mới từng đỏ; cấm module khác/schema/legal, không commit/LLM thật.
Handoff: lệnh trực tiếp điều phối · Base: HEAD e17afa7 (cây bẩn sẵn) · Head: chưa commit

Lệnh (exit) và số ca:
- backend `npx jest src/modules/matchmaker src/modules/assistant --forceExit`: 0 ; 19 -> 30 pass (matchmaker.spec mới 11; assistant 19, fixture SSE units thêm matchedCodes/assumed); `tsc --noEmit -p .`: 7 lỗi (= nền)
- ai-engine `uv run ruff check . && uv run pytest`: 0 / 0 ; 70 -> 78 pass, 0 fail, 0 skip (test_progressive.py mới 8)
- web `pnpm typecheck` 0, `lint` 0 (1 warning img cũ), `test` 0 (315 -> 324; assistant-progressive.test.ts mới 9), `build` 0; next-env.d.ts khôi phục đúng bản HEAD (git status sạch)
- eval/cases.jsonl: +3 ca nhóm progressive (prog_1 "thích có bàn ghế", prog_2 "studio", prog_3 "dưới 6 triệu", đều expect search_units) — CHƯA chạy LLM thật.
Evidence: planning/18_*/evidence/fix6/{backend-jest,backend-tsc,ai-engine,web-test,web-build,web-lint,web-typecheck,live-matchmaker}.txt

Bộ đo mới từng ĐỎ: red-1-no-limit.txt (slice(0,3) cố định -> 2 test backend đỏ: limit=20, totalMatched/rank); red-2-no-matchedcodes-ai.txt (bỏ matchedCodes khỏi event -> 2 test ai đỏ); red-3-no-matchedcodes-web.txt (parse bỏ matchedCodes -> 1 test web đỏ). Đã khôi phục sau mỗi lần (xanh lại 11/78/324).

Kiểm live (không LLM): backend :4000 ĐÃ nạp code mới. POST /matchmaker/recommend {maxAllInBudget:30000000, limit:20} -> totalMatched 53, trả 20; bỏ limit -> totalMatched 53, trả 3; limit=0 -> HTTP 400.

File đụng: backend/src/modules/matchmaker/{dto/matchmaker-request.dto,matchmaker.service}.ts + matchmaker.spec.ts (mới), assistant/assistant.spec.ts; ai-engine/app/{agent,criteria}.py, app/tools/search_units.py, app/prompts/system.vi.md, tests/test_progressive.py (mới), eval/cases.jsonl; web lib/assistant/{pin,stream,context}.ts, components/chat/{ChatExperience,ResultsPanel}.tsx + ResultsPanel.module.css, tests/{assistant-progressive(mới),assistant-guest-pin}.test.ts; specs/01-CONTRACTS.md §5.
Sửa test cũ 1 chỗ: assistant-guest-pin.test.ts toEqual của applyUnitsEvent thêm field `suggested` (thêm trường mới, ý nghĩa giữ).

Quyết định: search_units không còn bắt buộc budget (trần 30tr, `budgetAssumed`); `assumed` chỉ gồm khoá khách chưa nói; khoá nội bộ `_matchedCodes` bị agent rút khỏi kết quả trước khi đưa LLM (LLM không thấy mã ngoài 5 căn chi tiết); events units phát cả khi bot không nhắc mã nào (unitCodes [] + matchedCodes); thứ tự gộp nhiều layout = (tiết kiệm % giảm, All-in tăng) = thứ tự matchmaker (trước là chỉ All-in); web: căn bot nhắc (≤3) lên đầu "Gợi ý #n", phân trang PAGE_SIZE 12 + "Xem thêm", chip "Tạm tính 2 người · 1 xe máy".
Giới hạn đã biết: khi có lọc thêm phía engine (must_have/furnishing/pet/tầng) `totalMatched` chỉ đếm trong ≤20 ứng viên matchmaker (matchmaker chưa có các bộ lọc này); must_have buộc tải chi tiết tới 20 căn (20 GET).

KHÔNG làm: không chạy eval LLM thật (3 ca progressive + hành vi prompt mới chưa chấm thật); không thử UI trên trình duyệt; không đụng module backend khác/schema/legal; relay Nest không đổi (chỉ thêm fixture test); không commit; không ghi Supabase.
Phán quyết: chờ người duyệt đo lại.
