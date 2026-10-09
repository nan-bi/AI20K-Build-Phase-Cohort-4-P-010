# BUG-TC01-01 — `GET /properties/units` nhận `maxRent` âm, trả 200 rỗng thay vì 4xx

> **Trạng thái 2026-10-09: VẪN CÒN.** `GET /api/v1/properties/units?maxRent=-1` ⇒ `HTTP 200 · {"success":true,"statusCode":200,"data":[],…}`. Xem [TC-01 chạy lại](../TC-01_search-filter.md) và lỗi liên quan [BUG-TC01-02](BUG-TC01-02.md).

- **Test case:** TC-01 bước 5a (giá trị biên/sai)
- **Môi trường:** local, backend NestJS `http://localhost:4000` (`backend/.env`, `NODE_ENV=development`, DB Supabase cloud), commit `9e9ad74` (main)
- **Ngày phát hiện:** 2026-10-04
- **Mức độ (đề xuất):** Thấp — không lỗi 5xx, không lộ dữ liệu; sai hợp đồng validation

## Tái hiện

```
GET /api/v1/properties/units?maxRent=-1
```

## Expected

HTTP 4xx (`invalid_request`) với thông báo rõ, tương tự `maxRent=abc`.

## Actual (nguyên văn)

```
{"success":true,"statusCode":200,"data":[],"timestamp":"2026-10-04T15:37:40.579Z"}
```

Đối chiếu — chuỗi thay số bị chặn đúng (bước 5b):

```
{"success":false,"statusCode":400,"timestamp":"2026-10-04T15:38:31.115Z","path":"/api/v1/properties/units?maxRent=abc","code":"invalid_request","message":["maxRent must be a number conforming to the specified constraints"],"errors":null}
```

## Nguyên nhân (đọc code, chưa sửa)

- `backend/src/modules/property/dto/property-query.dto.ts:17-21` — `maxRent` chỉ có `@Type(() => Number)` + `@IsNumber()`, không có `@Min`.
- `backend/src/modules/property/property.service.ts:109-111` — dùng thẳng thành `baseRentPrice <= -1` ⇒ luôn rỗng.
- Cùng mẫu thiếu `@Min` ở `maxAllInCost`, `motorbikes`, `cars`, `occupants` (cùng file, dòng 39–61) — chưa test.

## Bằng chứng

`scratchpad/tc01/step5a.json`, `scratchpad/tc01/step5b.json`, script `scratchpad/tc01_run.js`.
