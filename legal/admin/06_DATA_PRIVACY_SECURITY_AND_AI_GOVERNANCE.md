# QUY CHUẨN AN TOÀN THÔNG TIN, BẢO VỆ DỮ LIỆU CÁ NHÂN NGHỊ ĐỊNH 13 & GIÁM SÁT TRÍ TUỆ NHÂN TẠO
### (SYSTEM SECURITY, PDPA DECREE 13 COMPLIANCE & MULTI-AGENT OBSERVABILITY PROTOCOL)
*Mã văn bản: VINSTAY-LEGAL-ADM-06*  
*Căn cứ áp dụng: Luật An ninh Mạng 2018, Luật An toàn Thông tin Mạng 2015, Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân, Luật Giao dịch Điện tử 2023 và Khung Quản trị Trí tuệ Nhân tạo An toàn (AI Safety & Observability Framework) của Đề án VinStay AI.*

---

## LỜI MỞ ĐẦU & TÔN CHỈ BẢO MẬT TỐI THƯỢNG
Văn bản này quy định quy chuẩn kiến trúc an toàn thông tin, chính sách bảo vệ dữ liệu cá nhân tuân thủ Nghị định 13/2023/NĐ-CP, cơ chế cô lập dữ liệu cấp cơ sở dữ liệu (Row-Level Security - RLS) và khung giám sát, quản trị trí tuệ nhân tạo (Multi-Agent Observability & Governance) trên nền tảng **VinStay AI** tại **Vinhomes Ocean Park (Gia Lâm, Hà Nội)**.

Tôn chỉ bảo mật & quản trị công nghệ:
1. **Bảo vệ quyền riêng tư cá nhân theo chuẩn quốc tế:** 100% dữ liệu nhạy cảm (ảnh CCCD gắn chip, số điện thoại, mã khóa căn hộ) được mã hóa AES-256; che mờ tự động trên giao diện người dùng.
2. **Chiến lược chống ảo giác AI (Anti-Hallucination Guardrails):** Phân tách tuyệt đối giữa **Logic Tất Định (Deterministic Logic - Tiền tệ, cọc, trạng thái phòng dùng SQL 100%)** và **Logic Xác Suất (Probabilistic Logic - Matchmaker, OCR)**; không bao giờ để mô hình ngôn ngữ lớn (LLM) tự quyết định số tiền thanh toán hay giải tỏa ký quỹ.
3. **Giám sát Agent toàn diện (Full Observability):** Truy vết 100% luồng thực thi của các tác tử AI qua StateGraph Tracing; thiết lập giới hạn đệ quy, trần thời gian timeout và Công tắc Khẩn cấp (Kill Switch) độc lập cho từng module.

---

## ĐIỀU 1. KIẾN TRÚC AN TOÀN THÔNG TIN & MÃ HÓA DỮ LIỆU (AES-256 & TLS 1.3)
Hệ thống áp dụng chuẩn bảo mật cấp ngân hàng (Bank-grade Security) trên toàn bộ hạ tầng:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   MÔ HÌNH BẢO MẬT & MÃ HÓA DỮ LIỆU ĐA TẦNG VINSTAY AI                            │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [TRUYỀN DẪN MẠNG (IN-TRANSIT)] ──► 100% kết nối qua giao thức TLS 1.3 / HTTPS với HSTS.        │
│                                     Chứng chỉ SSL mã hóa 2048-bit; chặn tuyệt đối bắt gói tin.   │
│                                                                                                  │
│   [LƯU TRỮ CƠ SỞ DỮ LIỆU (AT-REST)] ──► PostgreSQL mã hóa toàn bộ ổ cứng với chuẩn AES-256.    │
│   • Bảng CCCD & Ảnh Bàn Giao: Mã hóa cấp cột (Column-level Encryption) bằng pgcrypto.            │
│   • Khóa giải mã Master Key được lưu trữ độc lập tại AWS KMS / HashiCorp Vault.                  │
│                                                                                                  │
│   [MÃ KHÓA CỬA JIT]: Không lưu trữ mã PIN thô dạng Text; chỉ lưu chuỗi băm kèm Salt              │
│                      và tự động vô hiệu hóa sau 45 phút kể từ khi cấp.                           │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 2. TUÂN THỦ TOÀN DIỆN NGHỊ ĐỊNH 13/2023/NĐ-CP VỀ BẢO VỆ DỮ LIỆU CÁ NHÂN
VinStay AI thực hiện đầy đủ trách nhiệm của Bên Kiểm soát và Xử lý Dữ liệu Cá nhân theo luật định:

1. **Nguyên tắc Thu Thập Tối Thiểu (Data Minimization):**
   - Nền tảng chỉ thu thập đúng các trường dữ liệu cần thiết phục vụ cho việc xác lập giao dịch thuê nhà hợp pháp (Họ tên, SĐT, số CCCD gắn chip theo Luật Nhà ở).
   - Tuyệt đối không thu thập dữ liệu sinh trắc học mống mắt, tôn giáo, quan điểm chính trị hoặc lịch sử duyệt web ngoài phạm vi ứng dụng.
2. **Quyền của Chủ Thể Dữ Liệu (Data Subject Rights):**
   - *Quyền Được Biết & Đồng Thuận:* Khách thuê và Chủ nhà tích chọn đồng thuận rõ ràng tại màn hình đăng ký trước khi hệ thống kích hoạt OCR hoặc lưu trữ thông tin.
   - *Quyền Chỉnh Sửa & Xóa Bỏ Dữ Liệu (Right to Erasure):* Khi hợp đồng thuê kết thúc và đã thanh lý dứt điểm công nợ cọc/điện nước EVN, người dùng có quyền gửi yêu cầu xóa dữ liệu cá nhân trên ứng dụng. Hệ thống tự động xóa sạch dữ liệu CCCD trong vòng **72 giờ** (chỉ lưu lại mã băm hóa đơn thuế theo quy định của Luật Kế toán).
3. **Báo cáo sự cố rò rỉ dữ liệu trong 72 giờ:**
   - Trong trường hợp xảy ra sự cố tấn công mạng làm lộ lọt dữ liệu, Ban Quản Trị có nghĩa vụ thông báo bằng văn bản tới Cục An ninh Mạng và Phòng chống Tội phạm Công nghệ Cao (A05 - Bộ Công an) trong vòng **72 giờ** kể từ khi phát hiện.

---

## ĐIỀU 3. PHÂN TÁCH DỮ LIỆU CẤP CSDL BẰNG ROW-LEVEL SECURITY (RLS) & CHE MỜ DỮ LIỆU
Nhằm loại trừ triệt để nguy cơ lộ lọt dữ liệu chéo giữa các bên:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│              CƠ CHẾ CÔ LẬP DỮ LIỆU THEO VAI TRÒ (ROW-LEVEL SECURITY - RLS)                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [NGƯỜI DÙNG: KHÁCH THUÊ]                                                                      │
│   • RLS Policy: 'tenant_select_public_units'                                                     │
│   • CHỈ XEM ĐƯỢC: Căn hộ Available, giá All-in Cost, ảnh mặt bằng.                              │
│   • BỊ CHẶN TUYỆT ĐỐI: Không xem được SĐT Chủ nhà, số phòng chính xác, mã khóa cửa JIT.          │
│                                                                                                  │
│   [NGƯỜI DÙNG: CHỦ NHÀ]                                                                         │
│   • RLS Policy: 'landlord_manage_own_units'                                                      │
│   • CHỈ XEM ĐƯỢC: Các căn hộ thuộc quyền sở hữu của chính mình (`owner_id = auth.uid()`).       │
│   • BỊ CHẶN TUYỆT ĐỐI: Không xem được giỏ hàng của chủ nhà khác hoặc dữ liệu cá nhân của Host.  │
│                                                                                                  │
│   [ĐỐI TÁC: FIELD HOST]                                                                         │
│   • RLS Policy: 'host_active_session_only'                                                       │
│   • CHỈ XEM ĐƯỢC: Ticket đang được giao cho mình trong khung giờ dẫn khách.                     │
│   • BỊ CHẶN: Hết ca dẫn 45 phút, quyền truy cập mã cửa JIT tự động biến mất hoàn toàn.          │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Quy chuẩn Che mờ Dữ liệu (Data Masking):**
  * Số CCCD hiển thị: `00109500****`.
  * Số điện thoại trên nhật ký hiển thị: `0982***345`.
  * Địa chỉ căn hộ hiển thị công khai: `Sapphire 1 - Tầng Trung - Căn 1PN+` (chỉ khi Host nhận ticket và tới trước cửa mới hiện mã phòng chính xác).

---

## ĐIỀU 4. KHUNG GIÁM SÁT TRÍ TUỆ NHÂN TẠO ĐA TÁC TỬ (MULTI-AGENT OBSERVABILITY)
Toàn bộ các tác tử AI hoạt động trên nền tảng (AI Matchmaker, AI OCR, AI Dispatcher) được quản trị theo mô hình **LangGraph StateGraph Tracing**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   5 TẦNG QUẢN TRỊ & GIÁM SÁT TÁC TỬ AI (5-LAYER OBSERVABILITY)                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. EXECUTION TRACING: Ghi nhận vết thực thi từng Node trong StateGraph; đo lường độ trễ (Latency) │
│    và lượng Token tiêu thụ theo thời gian thực trên Admin Portal.                                │
│                                                                                                  │
│ 2. RECURSION LIMIT: Cài đặt trần vòng lặp tối đa: MAX_STEPS = 5. Nếu Agent chạy quá 5 bước mà    │
│    chưa có kết quả, hệ thống tự động ngắt chuỗi và chuyển trạng thái Fallback an toàn.           │
│                                                                                                  │
│ 3. TIMEOUT GUARDRAIL:                                                                            │
│    • AI Matchmaker: Timeout tối đa <= 3.0 giây (quá 3s tự động trả về bộ lọc SQL thuần).         │
│    • AI OCR CCCD: Timeout tối đa <= 5.0 giây (quá 5s chuyển chuyên viên CSKH kiểm tra thủ công). │
│                                                                                                  │
│ 4. SANDBOXED READ-ONLY TOOLS: Các công cụ cấp cho AI chỉ có quyền ĐỌC (SELECT); TUYỆT ĐỐI KHÔNG   │
│    cấp quyền GHI (INSERT/UPDATE/DELETE) vào các bảng tài chính, tiền cọc hoặc giải tỏa cọc.      │
│                                                                                                  │
│ 5. INDEPENDENT KILL SWITCH: Nút bấm ngắt khẩn cấp riêng cho từng Agent trên Admin Portal khi     │
│    phát hiện hành vi bất thường, không làm gián đoạn các module vận hành khác.                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ĐIỀU 5. CHIẾN LƯỢC CHỐNG ẢO GIÁC AI & CỔNG KIỂM SOÁT NGƯỠNG TIN CẬY
Nhằm bảo đảm tính chính xác tuyệt đối trong giao dịch bất động sản:

1. **Nguyên tắc Tách Bạch Tất Định vs Xác Suất:**
   - **Tác vụ Tài chính & Trạng thái Căn hộ (Deterministic):** 100% sử dụng câu lệnh SQL thuần túy (PostgreSQL Stored Procedures / ACID Transactions). Tuyệt đối KHÔNG dùng Prompt LLM để tính toán tiền cọc, trừ tiền điện nước hay chuyển trạng thái phòng.
   - **Tác vụ Đọc hiểu & Khớp nhu cầu (Probabilistic):** Sử dụng LLM để phân tích ngôn ngữ tự nhiên từ nhu cầu của khách thuê và bóc tách chữ từ ảnh chụp CCCD.
2. **Cổng Kiểm Soát Ngưỡng Tin Cậy (Confidence Gate $\ge 85\%$):**
   - Khi quét ảnh CCCD gắn chip: Nếu điểm tự tin bóc tách họ tên, số định danh cá nhân và ngày cấp đạt $\ge 85\%$, hệ thống tự động điền vào Hợp đồng số.
   - Nếu điểm tự tin $< 85\%$ (ảnh mờ, chói lóa, góc chụp nghiêng): Hệ thống kích hoạt quy trình **Human-in-the-Loop**, chuyển giao diện cho Chuyên viên CSKH kiểm tra đối chiếu bằng mắt thường trước khi cho phép ký số.

---

## ĐIỀU 6. KẾ HOẠCH KHÔI PHỤC THẢM HỌA (DISASTER RECOVERY PLAN)
Nhằm bảo đảm tính liên tục của hệ thống vận hành tại Vinhomes Ocean Park:

| Chỉ Tiêu Khôi Phục | Cam Kết Kỹ Thuật (SLA) | Cơ Chế Thực Hiện |
| :--- | :---: | :--- |
| **Mất mát Dữ liệu Tối đa (RPO)** | **$\le 05$ phút** | Sao lưu gia tăng (Continuous WAL Archiving) tự động đẩy về cụm lưu trữ thứ cấp độc lập tại Singapore / Hà Nội. |
| **Thời gian Khôi phục Tối đa (RTO)** | **$\le 30$ phút** | Tự động chuyển đổi dự phòng (Automatic Failover) sang máy chủ dự phòng Multi-Region trong vòng 30 phút. |
| **Chế độ Ngoại Tuyến (Offline Fallback)** | **Tức thì (0 giây)** | Nếu hệ thống đám mây mất kết nối, Field Host chuyển sang dùng danh bạ số nội bộ và chìa khóa cơ tại Văn phòng Phân khu. |

---

## ĐIỀU 7. HIỆU LỰC THỰC THI
1. Quy chuẩn này có hiệu lực bắt buộc áp dụng đối với toàn bộ các hệ thống máy chủ, cơ sở dữ liệu, giao diện lập trình ứng dụng (API) và quy trình vận hành của VinStay AI kể từ ngày công bố.
2. Định kỳ hàng quý, Ban Giám Đốc chỉ định đơn vị kiểm toán an ninh mạng độc lập thực hiện rà soát lỗ hổng (Penetration Testing) để bảo đảm hệ thống luôn đạt mức độ an toàn cao nhất.

---
*Văn bản thuộc Hệ thống Quản Trị & Vận Hành Nền tảng VinStay AI — Bản quyền thuộc Đề án T-010 / AI20K Build Phase Cohort 4.*
