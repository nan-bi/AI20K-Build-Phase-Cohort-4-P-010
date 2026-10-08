# 00 — Kiến trúc, mục tiêu, bất biến

## 1. Hiện trạng đo được (base `e17afa7`)

| # | Hiện trạng | Bằng chứng |
| :-- | :-- | :-- |
| H1 | Chatbot = regex `parseQuery` + FAQ cứng, không LLM | `apps/web/src/components/chat/ChatExperience.tsx` `onSend`; `apps/web/src/lib/tenant/matchmaker.ts:290-320` |
| H2 | FAQ CCCD sai luật: "AI tự điền Thỏa thuận đặt cọc" (AGENTS.md: không ký thỏa thuận cọc riêng, OCR lúc ký Hợp đồng thuê) | `matchmaker.ts` FAQ `hop dong|ky so|cccd` |
| H3 | Form ký gửi không thu số WC, hướng, mô tả; `suggestedDeposit`/`leaseTerm`/`furnished`/`note` chỉ nằm trong JSON `exclusive_mandates.door_access_config` | `backend/src/modules/landlord/dto/landlord.dto.ts:38`; `landlord-consignment.service.ts:120-133` |
| H4 | 32 hạng mục nội thất thẩm định chỉ lưu trong `meta.report.inventory` của mandate; không có bảng | `inspection-flow.service.ts:138-147` |
| H5 | Trang căn hiển thị `PASSPORT_ITEMS` từ mock + câu "Lúc nhận nhà…" | `apps/web/src/components/unit/UnitDetail.tsx:249-265` |
| H6 | UI ghi cứng "Tiền cọc bảo đảm tương đương 1 tháng" và cọc giữ chỗ `RATES.holdingDeposit` | `UnitDetail.tsx:286-290` |
| H7 | Backend ghi cứng cọc giữ chỗ 2.000.000 ở ≥ 8 chỗ | `backend/src/modules/deposit/deposit.service.ts:175,244,311,350,360,407`; `deposit-terms.ts:49`; schema `HoldingDeposit.amount @default(2000000)` |
| H8 | Host có thể chỉ mang `INSPECTOR` (không SALE); Admin DTO nhận `roles?: string[]` tự do | `schema.prisma` `FieldHost.roles HostRole[]`; `admin/dto/admin.dto.ts:41,68` |
| H9 | Niêm yết không đụng giá; `marketAvgPrice = askRent` | `listing-publisher.service.ts:26,43-51`; `landlord-consignment.service.ts:149` |

## 2. Mục tiêu
1. Mỗi căn niêm yết có đủ: diện tích, layout, WC, hướng, tầng, mức nội thất, danh sách nội thất thật, cọc bảo đảm, kỳ hạn tối thiểu, tiêu đề + 3 điểm nổi bật + mô tả sạch.
2. Thẩm định sửa được thông tin thực tế và đề xuất giá/cọc; đổi giá/cọc thì chủ duyệt.
3. Chatbot LLM hỏi lại nhu cầu, giải thích đánh đổi giữa các căn, trả lời quy trình đúng luật, mọi con số lấy từ API.

## 3. Non-goals (KHÔNG làm ở hồ sơ này)
| Không làm | Lý do |
| :-- | :-- |
| Tính `marketAvgPrice` từ dữ liệu cào / badge "Căn hời" thật | Cần đo chất lượng `tech data/caodata/*.xlsx` trước — hồ sơ riêng |
| Đổi quy tắc tiền cọc giữ chỗ (H7) | Đổi luật nghiệp vụ + AGENTS.md, chờ Q4 |
| Dữ liệu POI / khoảng cách theo căn | C1 — mọi căn trong OP1 |
| Vector DB / embedding | Kho tri thức < 50 trang; `lookup_policy` theo topic là đủ |
| Zalo ZNS báo chủ có đề xuất giá | Chưa có hạ tầng thông báo cho chủ; chủ thấy trong app |
| AI viết nháp mô tả căn | Sau khi chatbot chạy ổn |
| Lịch sử hội thoại lưu DB | Client gửi lại lịch sử mỗi lượt (≤ 20 tin) |
| Chatbot đặt lịch/thanh toán thay khách | Bot chỉ dẫn link sang luồng đặt lịch có sẵn |

## 4. Bất biến kiến trúc
- **B1** `units` (+ `unit_inventory_items`) là nguồn duy nhất UI/AI đọc cho thông tin căn. CẤM đọc thông tin căn công khai từ JSON meta mandate.
- **B2** Nest là nơi duy nhất đọc/ghi DB. CẤM ai-engine kết nối Postgres/Supabase.
- **B3** Mọi con số tiền/giờ trong câu trả lời bot phải đến từ kết quả tool trong cùng lượt. CẤM viết số tiền cọc, giờ giữ chỗ, phí vào prompt hoặc file tri thức (dùng biến `{…}` — SPEC-P04 §2).
- **B4** Giá thuê + cọc bảo đảm chỉ đổi khi chủ đồng ý (hoặc Inspector giữ nguyên). Thông tin thực tế không cần chủ duyệt.
- **B5** `FieldHost.roles` chứa `INSPECTOR` thì phải chứa `SALE`.
- **B6** Trang công khai CẤM lộ `compensation`, `photoIds`, ảnh bằng chứng hạng mục, SĐT chủ. `condition` công khai dạng `conditionPct` ("độ mới %", ước lượng của Host kiểm định) — đồng ý chủ tịch 2026-10-07 (thay quyết định B6 cũ "CẤM lộ condition"; fix4: căn seed Excel coi như đã kiểm định, nội thất DEMO sinh bằng `seed:unit-inventory`).
- **B7** Text do chủ nhập (tiêu đề, nổi bật, mô tả) CẤM chứa SĐT, URL, số tiền.
- **B8** ai-engine lỗi/chậm ⇒ chatbot vẫn chạy bằng bộ lọc cũ (không trang trắng).
- **B9** Test CI không cần key thật (Python: mock LLM; Nest: mock HTTP ai-engine).
- **B10** Ghi meta ký gửi đi qua `ConsignmentMetaStore` (khoá dòng) như hồ sơ 16.

## 5. Thứ tự đọc cho worker
01-CONTRACTS → SPEC của WP mình → TESTING-ACCEPTANCE §1 các dòng của WP → OPERATIONS nếu đụng schema/chạy service.
