# 19 — Form ký gửi theo bản thành viên + bỏ tiêu đề/mô tả căn

| Trường | Giá trị |
| :-- | :-- |
| Mã | 19_2026-10-08_Consign-Form-Sync |
| SemVer | PATCH (≤ 1 ngày công) — ngoại lệ 2.5 của luật khung: chỉ `plan.md`. Có đổi schema (bỏ 2 cột) nên KHÔNG `db push` khi chưa có lệnh |
| Trạng thái | 🟡 Code xong, kiểm local ✅ · ⬜ Supabase (chưa `db push`) · ⬜ chủ tịch thử tay form |
| Nguồn | Chủ chương trình 2026-10-08: lấy form ký gửi căn hộ mới của repo thành viên (`duynk-demop2-t010`), **bỏ card "Tài khoản nhận tiền thuê hàng tháng (VietQR Napas247)"**; bỏ tiêu đề + mô tả căn khỏi ký gửi và bỏ luôn cột DB; hỏi `GET /landlord/finance` đã có chưa |
| Charter | Chủ nhà #1 (Căn hời, All-in), #3 (cọc 100% thành Security Deposit), #2 (Host mở cửa, chủ ở nhà) |

## 1. Nhật ký quyết định

| # | Ngày | Quyết định | Lý do |
| :-- | :-- | :-- | :-- |
| Đ1 | 2026-10-08 | Wizard 3 bước như bản thành viên: *Thông tin căn & Định giá* → *Khoá cửa & Tài sản* → *Ký ủy quyền độc quyền*. Thêm: chọn phân khu → toà, mặt bằng giá + huy hiệu "Căn hời" (≥ 10%), thẻ dòng tiền thực nhận, quy chế (số người, thú cưng), chọn đưa mã cửa ngay / khi thẩm định, tick nội thất, lộ trình 4 bước | Yêu cầu chủ chương trình |
| Đ2 | 2026-10-08 | **KHÔNG** có card tài khoản nhận tiền thuê (ngân hàng/số TK/tên chủ TK). Ghi chú gửi kèm hồ sơ (`note` ≤ 300) chỉ chứa nội thất kê khai + quy chế | Yêu cầu chủ chương trình; tránh thu thông tin tài khoản khi chưa có luồng chi trả được duyệt |
| Đ3 | 2026-10-08 | % phí dịch vụ trong thẻ dòng tiền lấy từ `GET /landlord/finance` (`serviceFeePercent`, Admin đặt), lỗi/chưa tải thì dùng 5% | Bản thành viên hard-code 5%; hồ sơ 16 chốt tỷ lệ phí là cấu hình Admin |
| Đ4 | 2026-10-08 | Mặt bằng giá (`lib/landlord/benchmark.ts`) là bảng tham chiếu phía client, chỉ để gợi ý khi nhập giá. Huy hiệu "Căn hời" thật vẫn do backend tính (`marketAvgPrice`) | Hồ sơ 16 Đ2: chưa tính giá thị trường lúc đạt |
| Đ5 | 2026-10-08 | Bỏ `title`, `description` của căn: cột `units.title`, `units.description`; DTO ký gửi; phiếu thẩm định (`listing` chỉ còn `highlights`); API khách thuê; tìm kiếm `q` chỉ theo mã căn; ai-engine hết đọc 2 trường. Giữ `highlights` (≤ 3 điểm nổi bật), `bathrooms`, `direction` | Yêu cầu chủ chương trình. Inspector không còn bắt buộc tiêu đề nên phiếu đạt không cần văn bản tự do |
| Đ6 | 2026-10-08 | Chưa `db push`. Code mới chạy an toàn trên DB còn 2 cột cũ (Prisma không đọc/ghi chúng) | Xoá cột = mất dữ liệu `title`/`description` của các căn đã niêm yết — chờ lệnh |
| Đ7 | 2026-10-08 | Không đổi `GET /landlord/finance` | Đã có đủ ở P-010: controller + `LandlordFinanceService` trùng bản thành viên, web gọi qua `landlordApi.finance` |
| Đ8 | 2026-10-08 | Form ký gửi bỏ luôn **Điểm nổi bật** và **Số WC**. Backend: `bathrooms` thành tuỳ chọn (bỏ trống ⇒ Studio/1PN: 1, 2PN/3PN: 2; Inspector xác nhận lại ở phiếu thẩm định), DTO ký gửi bỏ `highlights`. Giữ `direction`. Inspector vẫn nhập được `highlights` ở phiếu thẩm định | Chủ chương trình 2026-10-08: "form ký gửi xóa điểm nổi bật, số WC đi" |
| Đ9 | 2026-10-08 | Form ký gửi bỏ ô **Khu đô thị / Dự án** (kèm biểu ngữ "sắp mở") và **Hướng căn hộ**. Chỉ còn Phân khu → Toà vì chỉ làm Ocean Park 1. Backend không đổi (`direction` vốn tuỳ chọn; Inspector xác nhận hướng ở phiếu thẩm định) | Chủ chương trình 2026-10-08: "mình chỉ làm ở Ocean Park 1" |
| Đ10 | 2026-10-08 | Khối "10 món tick nhanh" thay bằng **8 món lấy từ bảng kê 32 hạng mục** (Tủ lạnh, Bếp từ, Máy giặt, 2 Điều hòa, Bình nước nóng, Giường, Tủ quần áo) tick sẵn + nút **＋ Thêm món khác** (chọn từ các món còn lại, nhóm theo 8 khu vực). Mã món lưu ở `meta.form.inventoryCodes` (API `inventoryCodes`, kiểm mã thuộc catalog, bỏ trùng); `GET /landlord/inventory-catalog` trả code/group/name; `declared.inventoryCodes` sang phiếu thẩm định, `blankDraft` tick sẵn đúng các món đó + 25–29. Hồ sơ cũ (không khai) giữ quy tắc cũ. Bỏ dòng "Nội thất kê khai" khỏi `note` | Chủ chương trình 2026-10-08: "lấy 5-8 cái trong 32 cái ra trước, thêm dấu cộng… sang thẩm định thì fill cho sale" |

### Quyết định bị thay thế
- **Hồ sơ 18 SPEC-P01 §3–4: Inspector bắt buộc tiêu đề 1–80 ký tự, mô tả ≤ 600, chủ nhà nhập tiêu đề/mô tả khi ký gửi** → bỏ (Đ5). Chỉ `highlights` còn qua kiểm SĐT/URL/số tiền (`LISTING_TEXT_FORBIDDEN`, `field = highlights`).
- **Hồ sơ 18: ai-engine bọc `title`/`description` trong `<untrusted_listing_text>`** → chỉ còn `highlights` và `spec` nội thất; ca eval `inj_1`, `inj_3` chuyển sang `highlights`.

## 2. Checklist

- [x] Backend: `schema.prisma`, DTO ký gửi, service, mapper tenant/inspection, validator, publisher, tìm kiếm — `npx tsc` không thêm lỗi; jest cùng 9 suite / 16 test đỏ trước và sau (đỏ từ trước, không do hồ sơ này)
- [x] Web: `ConsignWizard`, `ListingFields`, `ListingTextBlock`, `lib/landlord/benchmark.ts`, UnitDetail, tests — `tsc` 0 lỗi · vitest 29 → 30 file, 328 test xanh
- [x] ai-engine: `ruff` sạch · pytest 81/81
- [ ] 🖐 Chạy tay `/landlord/consign` đủ 3 bước, ký, xem hồ sơ + màn Host thẩm định + `/units/[id]`
- [ ] 🖐 `npx prisma db push` (xoá 2 cột — cần `--accept-data-loss`) lên Supabase sau khi duyệt
- [ ] Đối chiếu `docs/UI_FLOW_SPEC.md` nếu còn mô tả ô tiêu đề/mô tả ở màn ký gửi
