# BUG-TC01-02 — `GET /properties/units` bỏ qua `maxAllInCost` và nhận số âm ở `maxAllInCost`, `occupants`

- **Test case:** TC-01 chạy lại, bước 5c, 5d
- **Môi trường:** local, backend NestJS `http://localhost:4000` (`backend/.env`), DB Supabase cloud, commit `4b00d24` (main)
- **Ngày phát hiện:** 2026-10-09 (lần 2026-10-04 mới ghi nhận từ đọc code, chưa test)
- **Mức độ (đề xuất):** Trung bình. Chạm nỗi đau Khách thuê #2 "bộ lọc loại trừ 100% căn vượt ngân sách trần": API nhận tham số ngân sách All-in nhưng không lọc. Giao diện chat hiện tự tính All-in ở trình duyệt nên người dùng web chưa bị ảnh hưởng; bên gọi API trực tiếp thì bị

## Tái hiện

```
GET /api/v1/properties/units?maxAllInCost=-5
GET /api/v1/properties/units?occupants=-3
```

## Expected

- `maxAllInCost`, `occupants` âm ⇒ HTTP 400 `invalid_request`.
- `maxAllInCost` hợp lệ ⇒ chỉ trả căn có All-in ≤ ngân sách.

## Actual (nguyên văn, rút gọn)

```
5c | GET /properties/units?maxAllInCost=-5 | HTTP 200 3ms · {"success":true,"statusCode":200,"data":[{"id":"d12f5963-…","code":"VHOP-S1.02-1001",…  (trả toàn bộ danh sách)
5d | GET /properties/units?occupants=-3 | HTTP 200 9ms · {"success":true,"statusCode":200,"data":[{"id":"d12f5963-…","code":"VHOP-S1.02-1001",…
```

Bằng chứng: [evidence/TC-01-05_2026-10-09/tc01.txt](../evidence/TC-01-05_2026-10-09/tc01.txt).

## Nguyên nhân (đọc code, chưa sửa)

- `backend/src/modules/property/dto/property-query.dto.ts:40-61`: `maxAllInCost`, `motorbikes`, `cars`, `occupants` chỉ có `@IsNumber()`, không có `@Min(0)`.
- `backend/src/modules/property/property.service.ts:95`: `loadUnits` chỉ lấy `zone, layout, maxRent, q, buildingCode, layoutType, status`; `maxAllInCost` không được dùng để lọc.
