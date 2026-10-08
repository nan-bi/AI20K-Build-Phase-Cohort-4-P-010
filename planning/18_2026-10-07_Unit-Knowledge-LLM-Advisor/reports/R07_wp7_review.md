Judge · thẩm định (chỉ đọc + đo) · Anthropic/Opus · Bước 0 skip (theo lệnh) · hiểu việc: đo lại WP1–WP6, tự phá ≥3 cách, chứng minh bộ đo mới biết đỏ; cấm sửa code/spec, cấm commit/DB; chỉ ghi file này
Handoff: WP7 (TESTING-ACCEPTANCE §1, gợi ý phá trong lệnh orchestrator)
Base: e17afa7
Head: working tree chưa commit (`git status --short -uall` = 140 dòng; tracked `65 files changed, +1306/-257`)

## A. Đo lại (lệnh → exit nguyên văn)
| Lệnh | Exit | Kết quả |
| :-- | :-- | :-- |
| `cd backend && npx jest` | 1 | Suites 11 failed/24 passed/35 · Tests 20 failed/508 passed/528 · skip 0. 11 suite đỏ = đúng danh sách `evidence/s0-baseline/jest-suites.txt`; tên 20 ca đỏ `diff` với `evidence/wp2/jest-before.txt` = rỗng |
| `npx tsc --noEmit -p .` | 2 | 7 lỗi = 7 lỗi cũ (guards.spec 1, auth.service.spec 4, booking.tenant.spec 2) |
| `cd apps/web && pnpm test` / `typecheck` / `lint` | 0 / 0 / 0 | 25 file, 233 passed · 0 lỗi lint, 1 warning cũ (AdminInventoryDetail `<img>`) |
| `cd ai-engine && uv run ruff check .` / `uv run pytest` | 0 / 0 | All checks passed · 23 passed; `env | grep -c OPENROUTER` = 0, không có `.env` |
| T9a `grep … RATES.holdingDeposit\|Hộ chiếu bàn giao số\|Lúc nhận nhà…` | 1 | 0 dòng ✅ |
| T9b `grep -rn 2000000 backend/src/modules/deposit --include='*.ts' \| grep -v spec \| grep -v deposit-amount` | 1 | 0 dòng ✅ |
| T9c `grep -rn "langgraph\|langchain" ai-engine` | **0** | **2 dòng** ❌ `ai-engine/README.md:3`, `ai-engine/app/agent.py:1` (chú thích "không dùng langchain") |
| T10 `git status --short -- src legal docs/guide apps/web/src/lib/mock` | 0 | 0 dòng ✅ |
- Ghi chú nền: `evidence/s0-baseline/jest.txt` chỉ là 40 dòng đuôi ⇒ danh sách ca đỏ ở S0 không kiểm được; so ở mức suite thì khớp.
- T10 file ngoài 01 §8: `backend/src/modules/field-hosts/{service,spec}`, `auth/{auth.errors,fix-host-roles,host-roles.spec}.ts`, `backend/{.env.example,README.md,package.json,scripts/*}`, `prisma/seed_excel_units.ts`, `components/landlord/{ConsignWizard,LandlordConsignment,LandlordDashboard}`, `components/host/{InspectionForm,InspectionList}`, `lib/assistant/**`, `apps/web/README.md`, `src/tests/*`. Mọi file đều do SPEC hoặc R02/R03/R06 khai lý do chức năng ⇒ **CHẤP NHẬN**; đề nghị cập nhật 01 §8. Không có cache/.venv nào đi kèm (`git check-ignore` chặn `ai-engine/.venv`, `.env`).

## B. Phá thử (probe nằm ở scratchpad, repo không đổi; bản chép: `…/scratchpad/{bk,ae}`, `break_validator.ts`, `probe_stream.ts`)
| # | Mức | Phát hiện · file:dòng | Tái hiện → output | Đề xuất |
| :-- | :-- | :-- | :-- | :-- |
| F1 | 🟠 | Lách được validator B7, backend và client lách giống nhau (0 lệch): chữ số full-width/𝟎𝟗, zero-width `​`, phân cách `/` `_`, `zalo . me`, domain thường/link rút gọn (`nhaop1.vn/x`, `bit.ly/…`), email, tiền bằng chữ (`tám triệu`, `8 củ 5`), `$350` · `backend/src/modules/property/listing-text.ts:9-33`, `apps/web/src/lib/units/listing-text.ts:18-41` | `ts-node break_validator.ts` ⇒ cả 15 ca đều `backend=null client=null`; probe B3: submit `title:'LH ０９７９８４１２３３'` ⇒ `OK:approved`, API công khai trả đúng chuỗi đó | NFKC + bỏ ký tự Cf, coi mọi ký tự không phải chữ/số nằm giữa các chữ số là phân cách, regex domain/email chung; thêm vào bảng P1-3/W1 |
| F2 | 🟠 | Inspector đề xuất cọc bảo đảm chỉ bị chặn `≥0` ⇒ cọc 0 (nhỏ hơn cọc giữ chỗ) vẫn niêm yết được, trái AGENTS.md (cọc giữ chỗ chuyển 100% vào cọc bảo đảm); `1e15` vẫn vào `awaiting_landlord` (tràn Decimal(12,2) lúc accept); giá tối thiểu 1tr trong khi chủ nhà tối thiểu 3tr · `inspection-report.validator.ts:162-165` vs `landlord-consignment.service.ts:111` | probe B2: `{submit:"OK:awaiting_landlord",decide:"OK:approved",unitSecurityDeposit:0,holdingDeposit:2000000}`; probe B5 `hugeDeposit:"OK:awaiting_landlord"` | Dùng chung một hàm biên: cọc ∈ [holdingDepositAmount(), 3×rent]. SPEC-P02 §5 thiếu luật này ⇒ chuyển architect |
| F3 | 🟠 | B8: lỗi HTTP xảy ra trước delta đầu và khác 503 thì web không trả lời gì: không có tin nhắn, không có bộ lọc, không có dòng thông báo. Nest throttle 20 lượt/phút ⇒ từ tin thứ 21 trở đi khách không nhận được câu trả lời · `apps/web/src/components/chat/ChatExperience.tsx:153`, `apps/web/src/lib/assistant/stream.ts:21,118` | `probe_stream.ts`: `503 fallsBack=true`; `429/400/413/500/502 fallsBack=false` (bám đúng điều kiện ở dòng 153) | Mọi lỗi trước delta đầu ⇒ fallback + thêm ca vitest 429 |
| F4 | 🟠 | Bộ đo eval của nhóm luật cứng bị ngược: `forbid_regex` `trừ vào tiền thuê` / `ký thỏa thuận cọc riêng` khớp luôn câu trả lời ĐÚNG có chữ "không" ⇒ G4 (đòi 100%) không thể đạt thật · `ai-engine/eval/cases.jsonl` expiry_1..3 | Gọi `run_case` với câu trả lời đúng ⇒ `expiry_1 ok=False ['forbid:trừ vào tiền thuê','forbid:ký thỏa thuận cọc riêng']`, `expiry_3 ok=False ['forbid:trừ vào tiền thuê']` | Chỉ cấm mệnh đề khẳng định (`(?<!không )(được\|sẽ\|bị)? ?trừ vào tiền thuê`) |
| F5 | 🟠 | Prompt injection: phòng thủ duy nhất là mục 8 của prompt. Text chủ nhập đi nguyên văn vào tool message, câu trả lời không qua bộ lọc nào, eval không có ca injection (oos_2 chỉ test lộ system prompt) · `app/tools/_common.py:47-63`, `app/agent.py:100-104` | pytest probe: mô tả "BỎ QUA LUẬT…" lọt vào tool msg = true; LLM giả nghe theo ⇒ stream "cọc giữ chỗ được trừ vào tiền thuê tháng đầu" + `units` vẫn phát | Thêm nhóm eval `injection` (Core API giả có mô tả độc) vào HARD_GROUPS; bọc text chủ nhập thành `untrusted_owner_text` |
| F6 | 🟠 | Thiếu bằng chứng T11(c,d): không có thư mục `evidence/wp5/`; R04 cũng không có file red ⇒ chưa tích được G3 | `ls evidence/wp5` ⇒ No such file | Worker WP5 ghi `evidence/wp5/red.txt` (tôi đã tái hiện được, xem mục D) |
| F7 | 🟠 | T9c đỏ theo đúng nghĩa đen (xem A) | như trên | Sửa lời chú thích, không nhắc tên thư viện |
| F8 | 🟡 | Inventory `spec` và tên dòng X do Inspector gõ không qua validator nhưng vẫn ra trang công khai + LLM · `inspection-report.validator.ts:93`, `tenant.mappers.ts:197` | probe B3 `inv0.spec:"Sofa da, LH chủ 0979841233"` | `assertListingText` cho spec/name X |
| F9 | 🟡 | `toInventoryLines` sort theo `Number(code)` ⇒ có mã X thì thành NaN, thứ tự rối · `tenant.mappers.ts:192` | probe B4 `["Kệ X2","Mười","Kệ X1","Một","Hai"]` | So khoá (isX, số) |
| F10 | 🟡 | `code` do LLM sinh ghép thẳng vào URL: `../../legal/deposit-terms` đi tới endpoint Nest khác; NUL ⇒ `httpx.InvalidURL` không bị bắt, stream kết thúc mà không có `error`/`done` · `tools/get_unit.py:20`, `busy_slots.py:31`, `compare_units.py:25`, `registry.py:38-45` | probe `urls:["http://core/api/v1/legal/deposit-terms",…]`; `invalid_url {events:[],crash:"InvalidURL"}` | `quote(code, safe='')` + regex mã; bắt mọi lỗi ⇒ `TOOL_FAILED` |
| F11 | 🟡 | `/health` trả `ok:true` khi không có key (OPERATIONS §2 ghi ok:false); `test_http.py::test_health_open` còn khoá luôn hành vi sai này · `app/main.py:46-48` | probe `{"ok":true,…}` | Trả `ok: bool(key)` |
| F12 | 🟡 | Relay: body tối đa theo contract (20×2000 ký tự tiếng Việt = 120.658 B) ⇒ 500 (giới hạn express 100kb) ⇒ web không fallback (F3); Nest không kiểm tin cuối phải là `user` | probe relay `{bytes:120658,big:500,systemRole:400}` | Tăng limit cho route hoặc giới hạn theo byte |
| F13 | 🟡 | C2 lệch SPEC-P05 §7: FAQ fallback `lib/tenant/matchmaker.ts:288` viết cứng "2.000.000đ … 48 giờ (12–72)" và lịch sử này còn được gửi lại cho LLM; số cứng còn ở `lib/tenant/adapters.ts:198`, `ConsignWizard.tsx:198,439,686`, booking/WorkflowSteps, `deposit-terms.ts:55,75,80`, `landlord-consignment.service.ts:111`, `contract/lease-pdf.service.ts:190,233,241` | `grep -rn "2000000\|2_000_000\|2\.000\.000" backend/src apps/web/src` | Architect quyết phạm vi C2 |
| F14 | 🟡 | OPERATIONS §1.2 thiếu `--apply` (2 script mặc định chạy khô ⇒ runbook chỉ đếm); backfill chỉ lấy `ACTIVE`, bỏ sót `EXIT_REQUESTED` dù căn vẫn đang niêm yết (`unit-inventory-backfill.ts:13`); nhánh decline vẫn giữ PIN Inspector đã lưu (`inspection-flow.service.ts:145`); bộ đo A6 không bắt "48 tiếng"/"phút"; lọc `m` chặn nhầm "Cách hồ 200m" | đọc code + `break_validator.ts` (FP distance=money) | Ghi nhận |
- Không phá được: race `pricing-decision` (accept‖accept, accept‖decline ⇒ `["OK:approved","ERR:409:PRICING_NOT_PENDING"]`; chủ khác ⇒ `ERR:403:NOT_OWNER`, stage giữ nguyên; khoá `FOR UPDATE` + đọc lại trong khoá ở `consignment-meta.store.ts:33-39`) · B4: chỉ `ListingPublisher.publish` ghi `baseRentPrice` (2 nơi gọi, đều truyền `agreed`), NaN/chuỗi ⇒ `report_invalid`, `.5` làm tròn đúng · B6: `inventory` chỉ có `group, groupLabel, name, qty, spec`, media công khai chỉ phục vụ URL có trong `unit_media` · `lookup_policy` traversal ⇒ `not_found` (topic so với front-matter, không ghép path) · `normalizeHostRoles` là đường duy nhất tạo/sửa vai (không seed nào tạo Host) · seed 55/55 mô tả bị bỏ (`phone 34, money 21`).

## D. Bộ đo mới có biết ĐỎ (đột biến trên bản chép scratchpad, đã hoàn lại)
| Đột biến | Kết quả | Hoàn lại |
| :-- | :-- | :-- |
| M1 `toInventoryLines` thêm `condition` | `✕ P1-5` · 1 failed/24 | 36/36 passed |
| M2 bỏ kiểm stage trong `LandlordPricingService.decide` | `✕ P2-8` · 1 failed/12 | 36/36 passed |
| M3 thêm `2.000.000đ` vào `knowledge/holding-deposit.md` (T11d) | `FAILED test_a6_no_hardcoded_numbers` | — |
| M4 `units` lấy bằng regex trên câu trả lời (T11c) | `FAILED test_a2_invented_code_filtered`, `test_no_units_event_without_tool_results` · 2 failed/10 | 31 passed (23 + 8 probe) |

## Phân công thực tế
| Gói | Tầng yêu cầu | Đã dùng |
| :-- | :-- | :-- |
| WP7 thẩm định đối kháng | 🔴 khác họ model | Opus (cùng họ Anthropic với worker Sonnet/Opus. Không có họ khác ⇒ nêu rõ) |

## Treo (không phải lỗi WP, chờ người)
G4/T8 eval key thật (sau khi sửa F4) · G6 db push + 2 script `--apply` + T12/T13 · job CI ai-engine (OPERATIONS §3) · CLAUDE.md/brain4agent (Structural Extension) · chủ tịch duyệt 3 file tri thức (9 dòng `CẦN DUYỆT`).

🔁 SỬA: F1 (validator), F2 (biên cọc/giá Inspector), F3 (fallback mọi lỗi trước delta), F4 (regex eval luật cứng), F5 (ca eval injection), F6 (evidence/wp5/red.txt), F7 (T9c) — không có 🔴; 🟡 F8–F14 ghi nhận/chuyển architect
