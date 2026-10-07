Worker · thi công · Sonnet · Bước 0 skip · hiểu việc: phạm vi ai-engine/backend assistant/web chat+lib/assistant+tests+planning 18; xong khi 3 bộ đo xanh + bộ đo mới từng đỏ; cấm chạm module khác/schema/legal, không commit/LLM thật.
Handoff: (lệnh trực tiếp từ điều phối) · Base: HEAD e17afa7 (cây làm việc bẩn sẵn) · Head: chưa commit

Lệnh (exit):
- ai-engine `uv run ruff check . && uv run pytest`: 0 / 0 ; 63 -> 70 pass, 0 fail, 0 skip
- backend `npx jest src/modules/assistant --forceExit`: 0 ; 17 -> 19 pass ; `tsc --noEmit -p .`: 7 lỗi (= nền)
- web `pnpm test` 0 (304 -> 315), `typecheck` 0, `lint` 0 (1 warning img cũ), `build` 0; next-env.d.ts đã ghi lại (git diff rỗng)
Evidence: planning/18_*/evidence/fix5/{ai-engine,backend,web-test,web-build,web-lint,web-typecheck}.txt
Bộ đo mới từng ĐỎ: red-1-no-synonyms.txt (bỏ đồng nghĩa -> 2 test has_feature đỏ); red-2-clear-on-zero.txt (nextPinned trả [] khi 0 căn -> 2 test đỏ); red-3-no-empty-units.txt (bỏ event units rỗng -> test_zero_match đỏ). Đã khôi phục code sau mỗi lần.

File đụng: ai-engine/app/{agent,main,eval,criteria(mới)}.py, app/tools/_common.py, app/prompts/system.vi.md, tests/{test_search_context(mới),test_http}.py, eval/cases.jsonl (+3 ca ctx_1..3, nhóm context; eval.py đọc search_context của ca); backend/src/modules/assistant/{dto/assistant-chat.dto,assistant.service,assistant.spec}.ts; apps/web/src/lib/assistant/{context(mới),pin,stream}.ts, components/chat/{ChatExperience.tsx,ResultsPanel.tsx,ResultsPanel.module.css}, tests/{assistant-search-context(mới),preview-state}.test.ts; planning/18_*/specs/01-CONTRACTS.md §5.

Đường từng làm preview trống (đã sửa):
1. runFilter (fallback khi AI lỗi) luôn setPinned(null): lượt sau chỉ "thích căn có bàn ghế" mà AI lỗi => parseQuery không có filter => results [] (trống). Nay: không filter / catalog lỗi-tải => không đụng pinned; filter 0 căn mà đã có pinned => giữ + note "kept".
2. previewPhase: pending=true ngay khi gửi => skeleton thay danh sách cũ. Nay truyền pending && !pinned?.length (đang có danh sách thì giữ hiển thị).
3. Event units rỗng trước bị bỏ qua và không mang criteria; nay luôn xử lý qua nextPinned (0 căn => giữ cũ).
4. Nguyên nhân gốc phía bot: hỏi lại ngân sách vì không có tiêu chí cũ (đã có searchContext + prompt); must_have "bàn ghế" không khớp "Bộ ghế Sofa" => matched 0 (đã thêm đồng nghĩa fold dấu).
Còn lại setPinned(null): đúng 3 chỗ (runFilter thành công, onCriteria/FilterTray, reset) — có test khoá số lần.

Lưu ý/quyết định: khi matched=0, ai-engine không ghim căn nearMiss (vượt ngân sách) dù bot nhắc mã. searchContext lấy cả criteria của lượt 0 căn (bot nhớ điều kiện vừa thêm; khách nói "bỏ X" thì bot bỏ). Test preview-state.test.ts sửa 1 regex nguồn (applyUnitsEvent(units,… => nextPinned(…known…)) vì đổi cấu trúc gọi, ý nghĩa giữ nguyên.
Chip tiêu chí: đọc-only (không nút xoá) trong ResultsPanel, CSS ở ResultsPanel.module.css.

KHÔNG làm: không chạy eval LLM thật (3 ca ctx_* chưa được chấm thật); không đụng module backend khác/schema/legal; không commit; chưa chạy thử UI trên trình duyệt (chỉ test đơn vị + build); tiếng Anh cho note/chip chưa có (ResultsPanel vốn chỉ tiếng Việt, ghi chú runFilter có en).
Phán quyết: chờ người duyệt đo lại.
