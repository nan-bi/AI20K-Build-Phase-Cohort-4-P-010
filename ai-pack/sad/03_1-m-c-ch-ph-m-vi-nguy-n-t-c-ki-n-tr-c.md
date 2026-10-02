<!-- nguồn: docs/SAD_v2.md, dòng 49–74 -->
## 1. MỤC ĐÍCH, PHẠM VI & NGUYÊN TẮC KIẾN TRÚC

### 1.1 Mục đích

Mô tả kiến trúc phần mềm mục tiêu cho MVP VinStay AI: thành phần, dữ liệu, luồng nghiệp vụ, bảo mật/phân quyền, quyết định đã chốt và còn mở. Kế thừa Project Charter (mục tiêu, phạm vi, KPI) và Master UI Flow Spec (hành trình người dùng).

**Đối tượng đọc:** Backend/Frontend/AI Engineer, DevOps, Pháp chế/Compliance, Hội đồng AI20K.

### 1.2 Bài toán

VinStay AI số hóa vòng đời thuê căn hộ tại đại đô thị theo mô hình **tinh gọn tài sản (Asset-Light)**: minh bạch chi phí (All-in Cost), xem phòng không ma sát nhờ Field Host nội khu, cọc và ký điện tử, bàn giao có chứng cứ số. Giải quyết: tin ảo/lệch hiện trạng, chi phí ẩn, no-show và chủ nhà phải đi lại, rủi ro cọc/hợp đồng/dữ liệu CCCD, tranh chấp cọc khi trả nhà.

### 1.3 Bảy nguyên tắc thiết kế

| #   | Nguyên tắc                       | Hàm ý kiến trúc                                                                                                                |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| P1  | **Reliability & Speed**          | SLA tại §17; webhook idempotent; khóa căn giao dịch                                                                            |
| P2  | **Privacy & Legal by design**    | Không tự xử lý CCCD; mã hóa AES-256; DPA với vendor; consent rõ ràng                                                           |
| P3  | **Operational Lean (0đ CapEx)**  | Không IoT, không Lockbox; dùng thẻ cư dân RFID của Host, khóa điện tử/chìa cơ sẵn có                                           |
| P4  | **Anti-disintermediation**       | Attribution Lock (`host_id` trong VietQR), Hợp đồng Độc quyền, che SĐT                                                         |
| P5  | **Graceful degradation**         | Mọi bước tự động có đường lui thủ công (§16)                                                                                   |
| P6  | **Immutability & Audit**         | Audit log append-only cho mọi truy cập nhạy cảm và thay đổi cấu hình                                                           |
| P7  | **Rule-first, AI khi xứng đáng** | Dispatcher/Conflict Resolver là rule engine (ADR-01). Chỉ Matchmaker có lớp ranking; không quảng bá "AI" cho thứ không phải AI |

---

