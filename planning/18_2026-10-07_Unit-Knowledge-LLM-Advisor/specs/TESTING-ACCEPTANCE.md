# TESTING-ACCEPTANCE — Ma trận kiểm thử & Exit Gates

## 1. Ma trận
| # | Kiểm | Cách đo | Môi trường |
| :-- | :-- | :-- | :-- |
| T0 | Nền | `cd backend && npx jest` · `cd apps/web && pnpm test` — ghi tổng/pass/fail vào `evidence/s0-baseline/` TRƯỚC khi sửa | local |
| T1 | Dữ liệu căn | SPEC-P01 §6 P1-1…P1-8 | local |
| T2 | Vai + giá/cọc | SPEC-P02 §6 P2-1…P2-10 | local |
| T3 | Backend toàn bộ | `npx jest`: tổng ≥ nền + ca mới, fail chỉ những suite đã fail ở T0 | local |
| T4 | Web | SPEC-P03 §6 W1–W6, `pnpm typecheck && pnpm lint && pnpm test && pnpm build` exit 0 | local |
| T5 | ai-engine | `cd ai-engine && uv run ruff check && uv run pytest` exit 0 (A1–A7), không có `OPENROUTER_API_KEY` trong env | local |
| T6 | Relay | A8, A9 | local |
| T7 | Tri thức | A6 + `_conflicts.md` tồn tại + chủ tịch duyệt 3 file (SPEC-P04 §3) | local |
| T8 | Eval LLM thật | SPEC-P05 §5: ≥ 85% tổng, 100% nhóm luật cứng, p95 ≤ 8s; output `evidence/wp5/eval.txt` | local + key |
| T9 | Grep bất biến | `grep -rn "RATES.holdingDeposit\|Hộ chiếu bàn giao số\|Lúc nhận nhà, Field Host" apps/web/src/components/unit apps/web/src/app` = 0 · `grep -rn "2000000" backend/src/modules/deposit --include=*.ts \| grep -v spec \| grep -v deposit-amount` = 0 · `grep -rn "langgraph\|langchain" ai-engine` = 0 | local |
| T10 | Phạm vi | `git diff --stat main...HEAD` chỉ file ở 01 §8; `src/`, `legal/`, `docs/guide/` = 0 thay đổi | local |
| T11 | Bộ đo mới phải từng ĐỎ | (a) bỏ `filter(l => l.present)` ⇒ P1-4 đỏ; (b) bỏ so sánh cọc trong diff ⇒ P2-5 đỏ; (c) cho agent trả mã căn ngoài tool ⇒ A2 đỏ; (d) thêm "2.000.000đ" vào 1 file knowledge ⇒ A6 đỏ — ghi `evidence/*/red.txt` rồi hoàn lại | local |
| T12 | Thử tay end-to-end | Chủ ký gửi (có WC, hướng, giới thiệu) → Sale+Thẩm định đổi giá → chủ thấy thẻ, Đồng ý → căn lên `/units` với giá mới + "Nội thất chi tiết" đúng → hỏi chatbot "căn đó có máy giặt không, cọc bao nhiêu" ⇒ trả đúng số API | Supabase dev |
| T13 | Fallback | Tắt ai-engine ⇒ chatbot vẫn lọc được, có dòng "Trợ lý AI tạm bận" | server dev |

## 2. Bằng chứng (không chấp nhận chỉ "test xanh")
- Số ca jest/vitest/pytest trước → sau + exit code nguyên văn.
- Eval: bảng tỉ lệ đạt theo nhóm, p50/p95, tổng token + chi phí ước tính / 100 lượt.
- Output 2 script (`fixed=`, `units= rows=`).
- `git diff --stat` + SHA.

## 3. Exit Gates
| Gate | Điều kiện | local | server (Supabase dev) |
| :-- | :-- | :-- | :-- |
| G1 | T0–T3, T11(a,b) | ⬜ | — |
| G2 | T4 | ⬜ | — |
| G3 | T5–T7, T11(c,d) | ⬜ | — |
| G4 | T8 | ⬜ | — |
| G5 | T9, T10 | ⬜ | — |
| G6 | db push + 2 script + T12 + T13 | — | ⬜ |

Kế hoạch chỉ đóng khi G6 ✅ server. Thẩm định WP7 do agent khác họ model, chỉ đọc, tự thiết kế ≥ 3 cách phá (gợi ý: text lách validator bằng chữ số Unicode/full-width; 2 tab bấm decision; prompt injection trong `description` căn khiến bot nói sai luật cọc).
