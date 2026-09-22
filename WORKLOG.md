# Worklog — Team P-010

> Ghi lại tất cả công việc đã làm theo ngày. Ai làm gì, kết quả gì.

---

## 2026-09-19

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Nam (namnp) | Cấu hình biến môi trường `.env` và cài đặt Git pre-push hook cho AI Logging | ✅ Done | Branch `namnp/set_up_ai_log`, hook `.git/hooks/pre-push` sẵn sàng | 1h |

**Tổng kết ngày:** Hoàn thành thiết lập ban đầu và kích hoạt hệ thống AI Usage Logging cho repo.

---

## 2026-09-20

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| lan(nan-bi) | Cài đặt môi trường Python: tạo venv, cài `requirements.txt` (langchain, langchain-openai, v.v.) | ✅ Done | Các package đã được cài đặt thành công vào môi trường ảo `.venv` | 0.5h |
| lan(nan-bi) | Sao chép `.env.example` → `.env` để cấu hình biến môi trường cục bộ | ✅ Done | File `.env` sẵn sàng để điền API keys | 0.1h |
| lan(nan-bi) | Chạy lại `scripts/setup_hooks.ps1` để cài đặt/tái xác nhận Git pre-push hook AI Logging | ✅ Done | Hook `.git/hooks/pre-push` được xác nhận hoạt động | 0.2h |
| Phương (phuong) | Chuẩn bị môi trường làm việc và kiểm tra repo template của dự án | ✅ Done | Đã xác nhận cấu trúc repo và sẵn sàng triển khai công việc cá nhân | 0.3h |
| Phương (phuong) | Nghiên cứu yêu cầu và xác định nhiệm vụ của bản thân trong dự án | ✅ Done | Đã nắm rõ hướng phát triển agent và cách phối hợp với team | 0.4h |

**Tổng kết ngày:** Hoàn tất thiết lập môi trường phát triển cục bộ — venv, dependencies, `.env`, và Git hook AI Logging đều sẵn sàng hoạt động.

---

## 2026-09-22

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| phuong | Rà soát các tài liệu trong thư mục `docs/` để lọc thông tin về luồng khách thuê và luồng hệ thống | ✅ Done | Tổng hợp chuỗi end-to-end: ký gửi căn → xác minh listing → tìm và khớp căn theo All-in Cost → đặt lịch OTP → điều phối Field Host → xem phòng → cọc VietQR → khóa căn 24 giờ → OCR CCCD và ký số → bàn giao | 1h |
| phuong | Phân tích luồng chủ nhà trong `UI_FLOW_SPEC.md`, `PRD.md`, `SAD.md` và `PROTOTYPE_GUIDE.md` | ✅ Done | Đặc tả luồng đăng ký căn, ký gửi độc quyền, cấu hình mã cửa/chìa cơ, theo dõi từ xa, nhận thông báo mở cửa/cọc, Digital Handover Passport và thoát ủy quyền sau 15 ngày | 0.5h |
| phuong | Đối chiếu các trạng thái và trách nhiệm giữa người dùng và hệ thống | ✅ Done | Ghi nhận các trạng thái chính `available`, `holding`, `rented`, `unlisted`; cùng các nhánh no-show, double booking, OCR không đạt và webhook thanh toán chậm | 0.5h |

**Tổng kết ngày:** Hoàn thành việc đọc và hệ thống hóa tài liệu nghiệp vụ. Làm rõ luồng chủ nhà theo mục tiêu vận hành từ xa 100%, đồng thời phân tách được thao tác của khách thuê, Field Host, Admin và các xử lý tự động của hệ thống.

---

<!-- Format: copy block trên cho mỗi ngày làm việc -->
