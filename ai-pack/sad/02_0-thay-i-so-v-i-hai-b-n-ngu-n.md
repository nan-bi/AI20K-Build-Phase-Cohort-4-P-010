<!-- nguồn: docs/SAD_v2.md, dòng 19–48 -->
## 0. THAY ĐỔI SO VỚI HAI BẢN NGUỒN

### 0.1 Sửa so với bản Enterprise

| #   | Nội dung bản Enterprise                                                                                 | Xử lý trong v2                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | AI Vision OCR tự xây, "Zero-Storage RAM"                                                                | **Thay bằng đối tác eKYC thương mại FPT.AI (FPT Smart Cloud) có Liveness Detection** — §7. Cơ chế Zero-Storage: máy chủ VinStay AI không lưu trữ file ảnh CCCD gốc (0 byte), FPT.AI chịu trách nhiệm bảo mật và đối chiếu dữ liệu |
| 2   | Giữ chỗ 24h (mandate, cọc, worker, Redis TTL)                                                           | **7 ngày** xuyên suốt                                                                                                                                                                                                             |
| 3   | Mã cửa JIT tự sinh/tự biến mất mỗi lượt                                                                 | **Mã khóa cố định theo căn**, mã hóa trong Vault, chỉ hiển thị cho Host khi có ticket active, hỗ trợ xoay mã — §8                                                                                                                 |
| 4   | RBAC 4 gạch đầu dòng (RLS)                                                                              | **7 vai trò × ma trận tài nguyên + Authorization Service tập trung**, RLS làm lớp phòng thủ thứ hai — §9                                                                                                                          |
| 5   | Dispatcher 3p → 2p → Area Lead; gọi là "AI"                                                             | **Rule engine**, SLA đã chốt **5p → 3p (≤500m) → broadcast** (ADR-01) — §6.2                                                                                                                                                      |
| 6   | Webhook VietQR ≤ 3s                                                                                     | **≤ 5s** (mâu thuẫn 5s/10s đã được giải quyết ở Charter)                                                                                                                                                                          |
| 7   | Trích dẫn điều/khoản luật cụ thể, trích nguyên văn luật, khẳng định "đầy đủ giá trị chứng cứ trước Tòa" | **Gỡ số điều/khoản và đoạn trích nguyên văn**, đánh dấu ⚖️; danh mục cần kiểm ở Phụ lục B                                                                                                                                         |
| 8   | Ngân hàng (MB/Vietinbank), Cloudflare R2, Upstash, FPT/eSMS trình bày như đã chốt                       | Đánh dấu **🟡 TBD / 🔵 đề xuất**                                                                                                                                                                                                  |
| 9   | Trình bày mọi thứ như đã chốt 100%                                                                      | Thêm bảng chốt tính năng có nhãn trạng thái (§4) và danh sách quyết định còn mở (§19)                                                                                                                                             |
| 10  | Số liệu "thị trường truyền thống" (60–70% tin ảo, 25–35% no-show…) và cột "Dữ liệu kiểm chứng"          | Gỡ số liệu không rõ nguồn; giữ KPI Charter (§17.2)                                                                                                                                                                                |
| 11  | Ví dụ API: giá 6,5tr vs thị trường 8,5tr nhưng badge "tiết kiệm 10%"                                    | **Sửa: tiết kiệm ≈ 24%** — (8,5 − 6,5)/8,5 = 23,5%                                                                                                                                                                                |
| 12  | Tự động bóc tách chỉ số công tơ EVN, tích hợp EVN                                                       | **Ngoài MVP** — Host nhập chỉ số + chụp ảnh (§3, §4)                                                                                                                                                                              |

### 0.2 Điểm phát hiện thêm khi gộp

1. **Căn cứ pháp lý về dữ liệu cá nhân đã đổi.** Cả hai bản dẫn NĐ 13/2023/NĐ-CP. Theo kết quả tra cứu ngày 24/09/2026 (nguồn thứ cấp: LuatVietnam), **Luật Bảo vệ dữ liệu cá nhân 2025 (91/2025/QH15) và NĐ 356/2025/NĐ-CP có hiệu lực từ 01/01/2026, NĐ 356 thay thế NĐ 13**. v2 dẫn theo khung mới; ⚖️ pháp chế cần xác nhận lại.
2. **Khóa căn 7 ngày bằng Redis `SETNX` là thiết kế rủi ro** (mất khóa khi Redis restart, lệch với DB). v2: **PostgreSQL là nguồn sự thật**, Redis chỉ giữ mutex ngắn hạn — §6.3.
3. **Mâu thuẫn về số điện thoại:** SAD v1 gửi tên/SĐT Host cho khách qua Zalo; Enterprise che SĐT hai chiều. v2 giữ quyết định đã chốt (Host lộ SĐT cho khách), che SĐT khách/chủ nhà với Host, proxy call là 🔵 giai đoạn sau — §15.
4. **Lỗ hổng cả hai bản chưa phủ:** xác minh **chủ nhà và quyền cho thuê căn hộ** (sổ hồng/ủy quyền). Ghi vào §19.
5. **`phone` vừa mã hóa AES vừa `@unique`** không tra cứu được — v2 dùng blind index (`phone_hash`).
6. **Cột `rfc3161_timestamp` trong `audit_logs` (Enterprise) thực chất là `now()`** — dấu thời gian RFC 3161 chỉ áp dụng cho tài liệu ký, không cho từng dòng log.

---

