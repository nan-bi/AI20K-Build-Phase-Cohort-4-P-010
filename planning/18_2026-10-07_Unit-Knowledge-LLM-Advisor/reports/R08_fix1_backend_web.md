Vai worker · thi công · Sonnet · Bước 0 skip(orchestrator) · hiểu việc: sửa F1,F2,F3,F8,F9,F12,F14 sau R07 trong backend/web/OPERATIONS; mỗi mục có test đỏ trước; cấm ai-engine/schema/legal/commit; xong khi jest không thêm đỏ, web 4 lệnh exit 0
Handoff: lệnh orchestrator vòng sửa R07 · Base: e17afa7 · Head: working tree chưa commit

## Lệnh -> exit (evidence/fix1/)
| Lệnh | Exit | Kết quả |
| :-- | :-- | :-- |
| `cd backend && npx jest` | 1 | Suites 11 failed/24 passed; Tests 20 failed/555 passed/575 (nền 20 đỏ/508 pass); tên 20 ca đỏ `diff` với evidence/wp2/jest-before.txt = SAME (jest-full.txt) |
| `npx tsc --noEmit -p .` | 2 | 7 lỗi = 7 lỗi cũ (guards.spec 1, auth.service.spec 4, booking.tenant.spec 2) (tsc.txt) |
| `pnpm test` / `typecheck` / `lint` / `build` (web) | 0/0/0/0 | 25 file, 288 passed (nền 233); lint 0 lỗi, 1 warning cũ `<img>` |
| grep `[\x08\x0c\x0b]` trên mọi file sửa/mới | - | 0 |
next-env.d.ts đã ghi lại 2 dòng import `./.next/dev/types/...`.

## Số ca đỏ -> xanh (file before/after trong evidence/fix1/)
| Mục | Trước | Sau |
| :-- | :-- | :-- |
| F1 backend (unit-data.spec, bảng 26 mẫu lách + 15 mẫu hợp lệ) | 28 đỏ/65 | 0/65 |
| F1 web (unit-listing-text.test, so khớp client=server cùng bảng) | 28 đỏ/64 | 0/64 |
| F2 backend (inspection-pricing.spec, 10 assertion biên) | 1 ca đỏ | 0 |
| F2 web (inspection-pricing.test) | 1 ca đỏ | 0 |
| F3 web (assistant-stream.test: HTTP 400/413/429/500/502/503 + 6 mã/event lỗi) | 9 đỏ/20 | 0/20 |
| F8 backend (spec SĐT, tên X link) + F9 sắp xếp | 3 đỏ | 0 |
| F8 web (validateDraft spec/tên X, listingForbiddenField) | 1 đỏ | 0 |
| F12 (assistant.spec: body 20x2000 ký tự ~120KB => 200; 300KB => 413 `payload_too_large`) | 1 đỏ (đo bằng giới hạn 100kb) | 0 |
| F14(ii) backfill ACTIVE+EXIT_REQUESTED | 1 đỏ | 0 |

## Quy tắc đã chọn
- F1 (cùng mã ở backend `listing-text.ts` và web `lib/units/listing-text.ts`; bảng mẫu ở `backend/.../listing-text.cases.ts`, web import): NFKC + bỏ ký tự Cf/Cc/variation + chữ số Unicode Nd về ASCII + bỏ dấu. SĐT: mọi ký tự không chữ/số giữa các token số là phân cách, chữ cái đơn lẻ là nhiễu, `o` đứng trong token số = 0, từ số (không/một/hai/ba/bốn/năm/lăm/sáu/bảy/tám/chín/linh) tính là chữ số, >=8 từ số liền nhau = phone. URL: `@`, `zalo` (kể cả `z a l o`), facebook/messenger/telegram/viber/whatsapp/gmail…, link rút gọn, domain `x.(com|vn|net|me|org|io|xyz|info|biz|app|link|ly|gl)` viết LIỀN (không gộp khoảng trắng, tránh dính "Mẹ"). Tiền: `$`/usd, số+(tr|t r|triệu|k|d|vnd|củ|nghìn|ngàn|tỷ), từ số+đơn vị ("tám triệu", "mười lăm triệu"), nhóm "5 000 000", `_`, >=100000.
- False-positive: `m` là TIỀN khi đứng sau số < 1000 VÀ không có từ chỉ khoảng cách/kích thước (cách, gần, xa, cao, rộng, dài, vòng, sát, bán kính, đi bộ) trong 30 ký tự trước số; `m2`/`m²` (NFKC đổi ² thành 2) và `m` sau số >= 1000 là mét. "Cách hồ 200m", "45m²", "Tầng 12", "2PN 2WC", "Năm 2024", "24/7, 1 km" qua.
- F2: rent số nguyên [3tr,200tr]; cọc số nguyên [2tr (holdingDepositAmount), 3 x rent]; web hằng `DEPOSIT_MIN=2_000_000` (không dùng RATES.holdingDeposit vì T9a).
- F8: field theo chỉ số dòng `inventory.<i>.spec|name` (cùng quy ước V3/V7 sẵn có, không phải `<code>`); `spec` đã được publisher ghi DB sau khi qua validator. F9: số theo giá trị, X<n> sau, mã lạ cuối.
- F3: mọi lỗi trước delta đầu => fallback (`isFallbackError` luôn true cho mã khác rỗng; ChatExperience dùng `if (!acc)`); notice giữ nguyên "đang dùng bộ lọc nhanh".
- F12: `NestFactory.create(..., {bodyParser:false})` + `useBodyParsers` (`modules/assistant/body-limit.ts`): json/urlencoded 256kb toàn cục + error middleware `entity.too.large` => 413.

## File đụng
backend: property/{listing-text.ts, listing-text.cases.ts(mới), unit-data.spec.ts, unit-inventory-backfill.ts}, inspection/{inspection-report.validator.ts, inspection-pricing.spec.ts}, tenant/tenant.mappers.ts, assistant/{body-limit.ts(mới), assistant.spec.ts}, main.ts. web: lib/units/listing-text.ts, lib/inspection/{facts.ts, logic.ts}, components/chat/ChatExperience.tsx, lib/assistant/stream.ts, tests/{unit-listing-text, inspection-pricing, inspection-logic, assistant-stream}.test.ts. specs/OPERATIONS.md §1.2.

## Đổi test cũ (có chủ ý)
- inspection-pricing.spec "so sánh bằng số nguyên": bỏ ca `rent 6_500_000.4 => approved` (luật mới chặn thập phân), thay bằng 6_500_000.
- assistant-stream.test: bỏ `isFallbackError("TOOL_FAILED") === false` (F3 đổi hợp đồng: mọi lỗi trước delta là fallback).

## KHÔNG làm + lý do
- F14(iii) PIN Inspector sau decline: KHÔNG xoá. `storeDoorPin` upsert đè hàng `door_access_keys` cũ (có thể là chìa/loại khác, không có cờ trước-sau) nên không xác định an toàn hàng nào được xoá; cần quyết định thiết kế (cờ `inspectorPinStored` trong meta + revoke status) -> chuyển architect. Hiện PIN đó vẫn nằm vault sau decline.
- F2 phía chủ nhà: `landlord-consignment.service.ts:111` đã chặn cọc ngoài [2tr,3 x rent] khi không phải draft; nháp (draft) không chặn có chủ ý; không đổi.
- Lọc `d`: "1 đ èn" (chữ đ sai dấu cách, R07 FP) vẫn bị coi là tiền; không sửa vì "500 đ" là vi phạm thật.
- Không chạm bộ lọc `common/filters/http-exception.filter.ts` (ngoài phạm vi): 413 xử lý ở middleware riêng. F4–F7, F10, F11, F13 (ai-engine/khác) không thuộc lệnh.
- Không sửa SPEC-P01 §4 (mô tả luật validator mở rộng); đề nghị architect ghi các quy tắc F1 ở trên vào đó.
