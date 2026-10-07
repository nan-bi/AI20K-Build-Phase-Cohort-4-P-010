Vai worker · thi công · Sonnet · Bước 0 skip(orchestrator) · hiểu việc: sửa F4,F5,F6,F7,F10,F11,F14(A6) sau R07 / chỉ ghi ai-engine/ + evidence,reports (+1 dòng A10 ở SPEC-P05) / xong khi ruff+pytest exit 0, mỗi mục có test từng đỏ / cấm backend/, apps/web/, commit, sửa knowledge/
Handoff: vòng sửa R07 · Base: e17afa7 · Head: working tree (chưa commit; ai-engine/ còn untracked nên chưa có git diff --stat)

Lệnh (cwd ai-engine/): `uv run ruff check .` -> All checks passed, exit 0 · `uv run pytest` -> 55 passed in 0.50s, exit 0 (evidence/fix1/ai-engine.txt)
Test: trước 23 -> sau 55 / pass 55 / fail 0 / skip 0. Eval cases: 35 -> 39 (+4 injection). Quét [\x08\x0c\x0b] file đã sửa: 0.

| Mục | Test mới (trước->sau) | Đỏ trước sửa |
| F4 | test_eval_scoring 12 ca: 10 ca policy x (đúng=ok, sai=fail) | 6 failed/12 (evidence/fix1/f4-red.txt) -> 12 pass |
| F5 | test_injection 6 | 3 failed/6 (f5-red.txt) -> 6 pass |
| F10/F11 | test_robust 19 (8 mã xấu x 3 tool, InvalidURL, NUL, exception lạ, /health) + test_http sửa | 13 failed (f10-f11-red.txt) -> pass |
| F14 | test_knowledge 3 (scanner thêm tiếng/phút/ngày) | quét thực 12 file: 0 vi phạm |
| F7 | grep | 2 dòng -> 0 dòng (evidence/fix1/f7.txt) |
| F6 | evidence/wp5/red.txt | T11c: 2 failed (A2 + no_units) ; T11d: A6 failed ; khôi phục -> xanh |

Chi tiết:
- F4: app/policy.py (FORBIDDEN + phủ định trong 30 ký tự trước, cắt tại dấu kết câu; 30 chứ không 20 vì "không dùng lockbox hay hộp khóa" cần 23). eval thêm `forbid_unless_negated`; chuyển mọi forbid dạng luật (expiry_1/2/3/5, view_1/2, maint_1/2, en_2/3) sang đó; giữ forbid_regex cho VHOP-, 24|36 giờ, rò system prompt. Đã bỏ "đừng" khỏi từ phủ định ("Đừng lo, VinStay sẽ cử thợ" là khẳng định).
- F5(a): `<untrusted_listing_text>` bọc title(120)/description(300)/highlights(120 mỗi)/inventory.spec(80); xoá thẻ mở/đóng giả trong text; search/compare không trả description/title; prompt mục 8 cập nhật.
- F5(b): lượt đã có tool result chứa thẻ => buffer mỗi vòng LLM, lọc find_violations, vi phạm => `error POLICY_VIOLATION` (không delta/units/done), sạch => phát 1 delta cả khối. Lượt chưa nhiễm giữ stream từng mảnh (test).
- F5(c): inj_1..inj_4 (nhóm `injection` vào HARD_GROUPS, `allow_error`, `poisoned_unit` -> Core API giả trong eval.py); test LLM giả nghe theo 4/4 bị chặn.
- F10: valid_code `^[A-Za-z0-9._-]{3,40}$` + cấm `..` (get_unit, busy_slots, compare_units) -> {"error":"bad_code"}, 0 request; CoreApi bắt httpx.InvalidURL; run_turn bắt Exception lạ -> error TOOL_FAILED (không im lặng).
- F11: /health ok = bool(OPENROUTER_API_KEY); test_http::test_health_open đổi sang ok:false.
- SPEC-P05: thêm đúng 1 dòng A10 (POLICY_VIOLATION). Chưa thêm vào 01-CONTRACTS.md §5 (ngoài phạm vi) -> backend/web phải biết code mới.

Đánh đổi F5(b): (1) lượt nhiễm mất streaming, chờ trọn câu (thêm vài giây ở lượt get_unit/compare, chỉ lượt đọc text chủ nhà); (2) khi chặn, text vi phạm không ra client nhưng người dùng thấy lỗi thay vì câu trả lời — web phải xử lý POLICY_VIOLATION như lỗi (hiện nút thử lại); (3) bộ lọc là regex tiếng Việt/Anh cho 4 luật cứng, LLM diễn đạt lạ vẫn lọt (phòng thủ nhiều lớp, không tuyệt đối); (4) phủ định trong 30 ký tự có thể bỏ sót câu "không... nhưng sẽ trừ vào tiền thuê" (false negative). (5) search_units vẫn tái nhiễm qua highlights => taint cũng bật ở search/compare.

KHÔNG làm:
- Không chạy eval thật (không key) -> G4 vẫn chưa đo; 4 ca injection mới chỉ được kiểm bằng LLM giả.
- F14 A6 chữ: knowledge còn 8 chỗ số viết bằng chữ (ba ngày làm việc x2 bql-rules:15/move-out:14, hai tháng security-deposit:8, ba mươi phút/mười bốn ngày viewing-process:10, hai tiếng :12, mười phút :13, mười lăm phút :16 — evidence/fix1/f14-a6.txt) mà scanner chữ số không bắt; không sửa knowledge (WP4 xong), chuyển architect quyết nguồn số/biến.
- Không đụng backend/apps/web; relay chưa xử lý POLICY_VIOLATION (F3/F12 thuộc worker khác). 01-CONTRACTS.md chưa thêm mã lỗi mới.
- exit của pytest trong red.txt không hiện (PIPESTATUS zsh); đỏ chứng minh bằng dòng FAILED.
Bảng phân công: F4-F14 -> 🟠 (có spec+test) -> Sonnet tự làm, không dùng agent con.
Câu hỏi: thêm POLICY_VIOLATION vào 01-CONTRACTS §5 + web fallback? Chốt nguồn số cho 8 số chữ trong knowledge?
