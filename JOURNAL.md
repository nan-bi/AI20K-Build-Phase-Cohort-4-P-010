# Weekly Journal — Team P-010 (VinStay AI)

> Ghi lại mỗi tuần: học được gì, khó khăn gì, quyết định gì, kế hoạch tiếp.

---

## Week 1: 2026-09-15 - 2026-09-21

### Mục tiêu tuần này
- [x] Khởi tạo dự án, thiết lập repository, môi trường phát triển và Git hook AI Usage Logging.
- [x] Nghiên cứu thực địa Vinhomes Ocean Park, xác lập 4 Nỗi đau cốt lõi của Chủ nhà & 5 Nỗi đau của Khách thuê.
- [x] Hoàn thiện Project Charter, kiến trúc kỹ thuật sơ bộ và bộ quy tắc vận hành (AGENTS.md).

### Đã hoàn thành
- Thiết lập hoàn tất môi trường ảo Python, dependencies, cấu hình biến môi trường `.env` và Git hook pre-push.
- Ban hành Project Charter định nghĩa rõ sứ mệnh: Hệ điều hành cho thuê & vận hành căn hộ Ocean Park từ xa 100%.
- Thống nhất các nguyên tắc bất biến: Mô hình biến phí Field Host, không dùng Lockbox vi phạm BQL, bảo vệ tài sản bằng cọc bảo đảm.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| Quy chế BQL Vinhomes cấm treo hộp Lockbox tại cửa căn hộ | Chuyển dịch sang mô hình Field Host nội khu dùng thẻ cư dân và nhận mã số cửa qua app | Giải pháp hợp chuẩn 100% quy chế BQL, loại bỏ chi phí phần cứng |
| Nguy cơ lộ lọt dữ liệu CCCD khi làm hợp đồng thuê | Đề xuất cơ chế Zero-Storage Ephemeral OCR (tiêu hủy ảnh tức thì sau bóc tách) | Đáp ứng nghiêm ngặt Nghị định 13/2023/NĐ-CP |

### Bài học
- Cần giải quyết bài toán vận hành thực tế tại sảnh và thang máy trước khi nghĩ đến các công nghệ phức tạp.
- Kỷ luật ghi nhận log AI và chia nhỏ task theo ngày giúp nhóm kiểm soát tiến độ hiệu quả.

### Kế hoạch tuần sau
- [x] Xây dựng khung Frontend Next.js MVP và Backend NestJS/Prisma.
- [x] Soạn thảo bộ khung pháp lý chuyên sâu bảo vệ chủ nhà và nền tảng.

---

## Week 2: 2026-09-22 - 2026-09-28

### Mục tiêu tuần này
- [x] Xây dựng UI Catalog căn hộ, bộ tính toán All-in Cost thời gian thực và Mock data Sapphire.
- [x] Xây dựng Backend NestJS với Prisma ORM kết nối Supabase PostgreSQL.
- [x] Hoàn thiện bộ pháp lý 7 tài liệu nền tảng và cơ chế ký số điện tử không cần OTP lặp lại.
- [x] Xây dựng mô hình tài chính và định phí 5 nhóm chi phí ban đầu.

### Đã hoàn thành
- Frontend Next.js hoàn thiện giao diện Catalog, bộ lọc ngân sách trần và All-in Cost Calculator.
- Backend NestJS tích hợp đầy đủ module, Prisma schema và Supabase PostgreSQL sẵn sàng.
- Ban hành bộ pháp lý chuyên sâu tại thư mục `legal/`: Hợp đồng Ký gửi Độc quyền, Chính sách Ký quỹ, Bàn giao 32 hạng mục.
- Xây dựng mô hình tài chính sơ bộ (`FINANCIAL_AND_REVENUE_MODEL.md`) với 3 dòng doanh thu cốt lõi.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| Chi phí API SMS OTP và eKYC bên thứ ba quá tốn kém | Sử dụng Zalo ZNS OTP một lần duy nhất kết hợp chữ ký tay cảm ứng trên điện thoại | Giảm chi phí xác thực xuống ~1.200 VNĐ / giao dịch |
| Mâu thuẫn giữa ràng buộc độc quyền và quyền tự do của chủ nhà | Thiết kế điều khoản thoát linh hoạt (Exit Clause) báo trước 15 ngày kèm nhà trống | Tăng tỷ lệ chủ nhà chấp nhận ký gửi độc quyền lên >70% |

### Bài học
- Tích hợp pháp lý ngay từ đầu giúp thiết kế cơ sở dữ liệu và luồng UI chuẩn xác, tránh phải đập đi xây lại.
- Tự động hóa kiểm thử liên tục giúp phát hiện sớm các điểm lệch giữa giao diện và điều khoản hợp đồng.

### Kế hoạch tuần sau
- [x] Tinh gọn quy trình từ đặt lịch, cọc giữ chỗ đến ký hợp đồng thuê chính thức.
- [x] Nâng cấp Web lên v0.9.x, phủ kín bộ test suites tự động.
- [x] Hoàn thiện bài toán kinh doanh hoàn chỉnh (TAM-SAM-SOM, Phễu chuyển đổi, CAC) sẵn sàng bảo vệ Gate 1.

---

## Week 3: 2026-09-29 - 2026-10-05 (Hiện tại — Sprint Gate 1 & 2)

### Mục tiêu tuần này
- [x] Nâng cấp Web lên v0.9.2: Điều phối Field Host 3 tầng, Tenant Login Gate, OTP 1 lần, bỏ ký thỏa thuận cọc riêng.
- [x] Đạt độ phủ kiểm thử tự động 100% (pass toàn bộ test suites).
- [x] Nâng cấp bộ pháp lý lên 9 văn bản (bổ sung Thỏa thuận Field Host 08 và cơ chế xử lý cố ý phá hoại/tẩu thoát).
- [x] Hoàn thành bài toán kinh doanh tổ chức: TAM – SAM – SOM, Phễu chuyển đổi 2 đầu định lượng và Unit CAC Attribution.
- [ ] Chuẩn bị kịch bản Demo Live và Slide thuyết trình bảo vệ Gate 1.

### Đã hoàn thành (Tính đến 2026-09-30)
- Release Web v0.9.2 hoạt động ổn định trên port 3000; toàn bộ 15 test suites (169 tests) pass 100%.
- Hoàn thiện trọn vẹn 9 văn bản pháp lý chuyên sâu, đồng bộ tuyệt đối với logic của Web App.
- Hoàn thành phân tích Thị trường TAM ($1.16B), SAM ($58M), SOM Pilot 300 căn (Đã Duyệt).
- Hoàn thành Mô hình Phễu chuyển đổi 2 đầu (Tenant 6 tầng, Landlord 5 tầng) và CAC Attribution (~1.150k/deal).
- Khắc phục triệt để lỗi SSL logging trên macOS, đảm bảo 100% prompt được đẩy tự động lên Phoenix Server.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| Khách thuê ngại ký quá nhiều văn bản (ký cọc riêng rồi lại ký HĐ thuê) | Bỏ ký thỏa thuận cọc riêng; khách tick chấp thuận điều khoản cọc trước khi quét QR, sau đó ký thẳng HĐ thuê 3 bước | Tăng tỷ lệ chuyển đổi cọc $\rightarrow$ thuê lên 83.3% |
| Test `legal-sync.test.ts` bị fail do lệch mốc thời gian hệ thống | Áp dụng `vi.setSystemTime(FIXED_NOW)` đóng băng thời gian trong test runner | Toàn bộ 169/169 tests pass xanh 100% |
| Xung đột khi căn hộ đang có ca xem thực địa lại có khách khác cọc trực tuyến (Sight-unseen) | Chốt nguyên tắc "First-to-Pay Wins" kết hợp AI Conflict Resolver gợi ý 2 căn tương đương $\ge 90\%$, bảo vệ 100% hoa hồng cho Field Host | Tận dụng đỉnh điểm FOMO để chuyển đổi khách sang căn thứ 2, đạt mục tiêu chốt sale kép văn minh |

### Bài học
- Càng tinh gọn luồng người dùng (bỏ bớt bước ký thừa) thì tỷ lệ chốt cọc và hoàn tất hợp đồng càng cao.
- Sự đồng nhất giữa Mã nguồn - Pháp lý - Tài chính là chìa khóa để thuyết phục tuyệt đối Hội đồng Đánh giá AI20K.
- Luôn ưu tiên dòng tiền cọc thực tế (First-to-Pay) thay vì giữ chỗ bằng lời hứa, kết hợp AI xử lý tình huống linh hoạt để biến nguy thành cơ.

### Kế hoạch tiếp theo
- [x] Hoàn thiện Đặc tả Thuật toán Niêm yết & Định giá Động đa biến (`docs/DYNAMIC_PRICING_SPEC.md`).
- [x] Đồng bộ quy chuẩn FOMO Tag, Hàng chờ Waitlist F2, SLA 75m và AI Conflict Resolver vào AGENTS.md, GEMINI.md, PRD.md và Legal 08.
- [ ] Hoàn thiện nốt các kịch bản tài chính mở rộng (Bear/Base/Bull, Working Capital) trong `FINANCIAL_AND_REVENUE_MODEL.md`.
- [ ] Hoàn thành tài liệu kiến trúc kỹ thuật `ARCHITECTURE.md` và chuẩn bị hồ sơ nghiệm thu Gate 2 (Deadline 04/10/2026).
- [ ] Quay video Walkthrough và chuẩn bị tài liệu thuyết trình Demo Day.

---

<!-- Tiếp tục copy block trên cho Week 4, 5, 6 -->

