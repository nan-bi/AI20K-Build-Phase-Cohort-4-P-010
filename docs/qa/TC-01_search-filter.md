# TC-01 — Tìm kiếm và lọc căn hộ

| Mục | Giá trị |
|---|---|
| Kết quả | **FAIL** — bước 1–4 Pass, 5a Fail, 5b Pass; phần UI của bước 4 không thực thi được |
| Ngày chạy | 2026-10-04 |
| Commit | `9e9ad74` (main) |
| Môi trường | local: backend NestJS `http://localhost:4000` (`backend/.env`, `NODE_ENV=development`), DB Supabase cloud |
| Kiểu thao tác | DB chỉ `findMany`; API chỉ `GET` — không ghi dữ liệu |
| Bug | [BUG-TC01-01](bugs/BUG-TC01-01.md) |

## Sự cố môi trường trước khi chạy

1. Lần khởi động đầu: `Found 131 errors` — Prisma client trong `node_modules` cũ hơn `prisma/schema.prisma` (thiếu `FavoriteUnit`, `holdHoursOverride`, các trạng thái `ViewingStatus` mới). Đã chạy `npx prisma generate` theo yêu cầu → exit 0.
2. Lần khởi động thứ hai: `Found 1 error` — `Cannot find module 'pdfkit'` (có trong `package.json` nhưng chưa cài). Đã chạy `npm install` theo yêu cầu → exit 0, `backend/package-lock.json` đổi 2+/3−.
3. Lần thứ ba: `Found 0 errors`, backend chạy.

## Chuẩn bị

Bộ lọc (có trong DTO `backend/src/modules/property/dto/property-query.dto.ts:7-21`): `zone`, `layout`, `maxRent`. Map phân khu → toà: `backend/src/modules/tenant/tenant.mappers.ts:4-10`. Điều kiện catalog: `backend/src/modules/property/property.service.ts:74-82` (đã kiểm định, có ảnh nội bộ, mặc định `status=AVAILABLE`).

Số kỳ vọng đếm trực tiếp từ DB ngay trước khi gọi API:

```
[DB expected] all=54 zone=3 layout=17 rent=34 combo=1 empty=0
```

## Kết quả

| Bước | Request | Expected | Actual (nguyên văn) | Pass/Fail |
|---|---|---|---|---|
| 1 | `GET /api/v1/properties/units` | 200; 54 căn, đều `status=available` | `HTTP 200 1222ms bytes=34790 \| count=54 expected=54 predicateViolations=[] missing=[] extra=[]` | Pass |
| 2a | `?zone=sapphire2` | 3 căn thuộc toà Sapphire 2 | `HTTP 200 668ms bytes=2323 \| count=3 expected=3 predicateViolations=[] missing=[] extra=[]` | Pass |
| 2b | `?layout=2PN` | 17 căn `layout=2PN` | `HTTP 200 791ms bytes=10984 \| count=17 expected=17 predicateViolations=[] missing=[] extra=[]` | Pass |
| 2c | `?maxRent=8000000` | 34 căn `rent ≤ 8.000.000` | `HTTP 200 802ms bytes=21893 \| count=34 expected=34 predicateViolations=[] missing=[] extra=[]` | Pass |
| 3 | `?zone=sapphire2&layout=2PN` | 1 căn | `HTTP 200 639ms bytes=738 \| count=1 expected=1 predicateViolations=[] missing=[] extra=[]` (căn `VHOP-S2.18-1602`) | Pass |
| 4 | `?maxRent=1000` | 0 căn, không 5xx, thông báo hợp lý | `{"success":true,"statusCode":200,"data":[],"timestamp":"2026-10-04T15:37:40.420Z"}` | Pass (API). UI: KHÔNG THỰC THI ĐƯỢC — không có công cụ trình duyệt |
| 5a | `?maxRent=-1` | 4xx hoặc thông báo lỗi rõ | `{"success":true,"statusCode":200,"data":[],"timestamp":"2026-10-04T15:37:40.579Z"}` | **FAIL** → BUG-TC01-01 |
| 5b | `?maxRent=abc` | 4xx | `{"success":false,"statusCode":400,"timestamp":"2026-10-04T15:38:31.115Z","path":"/api/v1/properties/units?maxRent=abc","code":"invalid_request","message":["maxRent must be a number conforming to the specified constraints"],"errors":null}` · `[HTTP 400 0.005968s]` | Pass |

## Ghi nhận (ngoài tiêu chí PASS)

- `VHOP-BE3-0805` (bước 2b) và `VHOP-S2.18-1602` (bước 3): `"layout":"2PN"` nhưng `"bedrooms":1` — dữ liệu có thể lệch.
- `maxAllInCost` có trong DTO nhưng không được áp trong `getUnits` (`property.service.ts:72`) — chưa test.
- `maxAllInCost`, `motorbikes`, `cars`, `occupants` cũng thiếu `@Min` (`property-query.dto.ts:39-61`) — chưa test.

## Bằng chứng

Lưu tạm trong scratchpad phiên Claude Code (có thể mất khi phiên kết thúc): `tc01/step1.json` … `tc01/step5b.json`, script `tc01_run.js`, `tc01_expected.js`, log khởi động `backend.log`, `backend2.log`, `backend3.log`.

---

## Chạy lại 2026-10-09 (commit `4b00d24`)

**Kết quả: FAIL**: bước 1–4 Pass (cả API và UI), 5a vẫn Fail ([BUG-TC01-01](bugs/BUG-TC01-01.md)), phát hiện mới [BUG-TC01-02](bugs/BUG-TC01-02.md). Môi trường: local backend `:4000` + web `:3000`, DB Supabase cloud; API chỉ GET, DB chỉ đọc. Bằng chứng: [evidence/TC-01-05_2026-10-09/tc01.txt](evidence/TC-01-05_2026-10-09/tc01.txt), ảnh UI ở [ui-tc01/](evidence/TC-01-05_2026-10-09/ui-tc01/).

Số kỳ vọng đếm từ DB ngay trước khi gọi API (dữ liệu đã đổi so với 2026-10-04):

```
[DB expected] all=52 zone=2 layout=17 rent=32 combo=1 empty=0
```

| Bước | Request | Actual (nguyên văn) | Pass/Fail |
|---|---|---|---|
| 1 | `GET /properties/units` | `HTTP 200 1095ms \| count=52 expected=52 predicateViolations=[] missing=[] extra=[]` | Pass |
| 2a | `?zone=sapphire2` | `HTTP 200 538ms \| count=2 expected=2 … missing=[] extra=[]` | Pass |
| 2b | `?layout=2PN` | `HTTP 200 476ms \| count=17 expected=17 … missing=[] extra=[]` | Pass |
| 2c | `?maxRent=8000000` | `HTTP 200 485ms \| count=32 expected=32 … missing=[] extra=[]` | Pass |
| 3 | `?zone=sapphire2&layout=2PN` | `HTTP 200 473ms \| count=1 expected=1` (căn `VHOP-S2.18-1602`) | Pass |
| 4 (API) | `?maxRent=1000` | `{"success":true,"statusCode":200,"data":[],…}` | Pass |
| 4 (UI) | Chat trang chủ, tài khoản khách thuê: "Ngân sách 3 triệu" | "Đã lọc 52 căn trống nhưng hiện không có kết quả khớp…" + "Không có căn nào vừa với bộ lọc này" + gợi ý căn rẻ nhất `BE3 · Tầng 13 · Căn 01`, All-in 5.758.750đ | **Pass** (lần trước không chạy được) |
| 5a | `?maxRent=-1` | `HTTP 200 · {"success":true,"statusCode":200,"data":[],…}` | **FAIL**: BUG-TC01-01 vẫn còn |
| 5b | `?maxRent=abc` | `HTTP 400 · {…"code":"invalid_request","message":["maxRent must be a number conforming to the specified constraints"]…}` | Pass |
| 5c (mới) | `?maxAllInCost=-5` | `HTTP 200`, trả **toàn bộ 52 căn** | **FAIL** → BUG-TC01-02 |
| 5d (mới) | `?occupants=-3` | `HTTP 200`, trả danh sách đầy đủ | **FAIL** → BUG-TC01-02 |

Ghi nhận UI (chưa tính là bug):
- Câu "Tìm căn hộ giá thuê dưới 1 triệu" / "Ngân sách tối đa 1 triệu/tháng": bộ lọc nhanh **bỏ qua mọi ngân sách < 3 triệu** (`apps/web/src/lib/tenant/matchmaker.ts:58`) nên trả lời "Hãy nhập ngân sách tối đa…" dù khách vừa nhập ngân sách.
- Khách chưa đăng nhập chỉ có 2 lượt chat thử; 2 lượt bị tính dù cả hai đều lỗi 503 (AI không chạy), lượt 3 nhận "Bạn đã dùng 2 lượt tư vấn thử. Đăng nhập…" (`summary_khach_het-luot.json`).
- "Ngân sách 8 triệu" trên UI ra 17 căn (lọc theo **All-in**), API `maxRent=8000000` ra 32 căn (lọc theo **giá thuê**). Hai số khác nhau là đúng thiết kế.
