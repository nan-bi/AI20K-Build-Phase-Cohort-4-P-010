<!-- nguồn: docs/SAD_v2.md, dòng 583–712 -->
## 11. LUỒNG END-TO-END

### 11.1 Ký gửi Độc quyền & thẩm định 0đ

```mermaid
sequenceDiagram
    autonumber
    actor L as Chủ nhà
    participant PWA as Web Portal
    participant API as Backend
    participant K as KeySvc
    participant DB as DB
    actor H as Field Host
    participant Z as Zalo

    L->>PWA: Nhập thông tin căn, giá kỳ vọng, cấu hình mở cửa (PIN hoặc chìa cơ)
    PWA->>API: POST /mandates
    API->>Z: OTP ký Mandate
    L->>PWA: Ký canvas + OTP
    PWA->>API: POST /mandates/:id/sign
    API->>K: Lưu PIN mã hóa vào Vault (ghi-only)
    API->>DB: Mandate PENDING_INSPECTION
    Note over L,API: 🟡 Xác minh chủ nhà & quyền sở hữu/ủy quyền chưa được thiết kế (§19)
    API->>H: Ticket thẩm định căn mới
    H->>DB: Hộ chiếu bàn giao ban đầu (ảnh Geofence/Timestamp)
    API->>DB: Unit AVAILABLE, is_verified = true
    API->>Z: Báo chủ nhà căn đã lên sóng
```

### 11.2 Tìm căn, khớp All-in Cost & đặt lịch

```mermaid
sequenceDiagram
    autonumber
    actor T as Khách thuê
    participant API as Backend
    participant M as Matchmaker
    participant Z as Zalo ZNS

    T->>API: GET /search/matchmaker (budget, layout, nhân khẩu, xe)
    API->>M: Lọc cứng + ranking
    M-->>API: Top 3 + badge
    API-->>T: Bảng 4 khoản phí (≤3s)
    T->>API: POST /bookings/request-otp (SĐT)
    API->>Z: OTP (TTL 5 phút, tối đa 3 lần)
    T->>API: POST /bookings/confirm (slot, OTP)
    API->>API: Tạo viewing + kích hoạt Dispatcher
    API->>Z: Xác nhận lịch + vị trí sảnh + tên/SĐT Host (khi Host nhận)
```

### 11.3 Điều phối, đón sảnh, mở cửa

```mermaid
sequenceDiagram
    autonumber
    participant S as Scheduler
    actor H as Field Host
    actor T as Khách thuê
    participant API as Backend
    participant Z as Zalo
    actor L as Chủ nhà

    S->>H: T-10 phút: nhắc xuống sảnh
    S->>Z: T-10 phút: nhắc khách + nút [Tôi đã có mặt tại sảnh]
    T->>Z: Bấm nút (không QR)
    Z->>API: Webhook tương tác
    API->>H: Rung báo + đặc điểm nhận diện khách
    H->>T: Đón sảnh, quẹt thẻ RFID Host lên tầng
    H->>API: POST /door-keys/:unitId/reveal {ticket_id}
    API-->>H: Mã khóa (hiển thị, không cache) + audit
    API->>Z: (🔵) Thông báo chủ nhà: căn đang được mở cửa xem phòng
```

### 11.4 Cọc VietQR, khóa 7 ngày, xác thực eKYC, ký thỏa thuận

```mermaid
sequenceDiagram
    autonumber
    actor T as Khách thuê
    actor H as Field Host
    participant API as Backend
    participant B as Ngân hàng / VietQR
    participant C as Conflict Resolver
    participant I as Identity Service
    participant Z as Zalo

    T->>H: Đồng ý chốt
    H->>API: POST /deposits/generate-vietqr (viewing_id)
    API->>B: Tạo VietQR 2.000.000đ (host_id trong nội dung)
    T->>B: Quét & chuyển tiền
    B->>API: Webhook (HMAC, idempotency) ≤ 5s
    API->>C: Khóa căn (transaction FOR UPDATE) → HOLDING 7 ngày
    C->>Z: Hủy lịch trùng + gợi ý 2 căn thay thế
    T->>I: Consent + ảnh CCCD → eKYC (chi tiết §7.3)
    I-->>API: verified / needs_review
    API-->>T: Thỏa thuận cọc tự điền
    T->>API: Ký canvas + OTP
    API->>API: Niêm phong (SHA-256 + dấu thời gian)
    API->>Z: Gửi PDF cho khách & chủ nhà
```

### 11.5 Bàn giao, check-in & thanh lý

```mermaid
sequenceDiagram
    autonumber
    actor T as Khách thuê
    actor H as Field Host
    actor L as Chủ nhà
    participant API as Backend
    participant B as Ngân hàng

    Note over T,H: CHECK-IN
    H->>API: Ảnh 10 hạng mục + chỉ số công tơ (nhập tay + ảnh) — Geofence/Timestamp
    T->>API: Ký xác nhận hiện trạng ban đầu
    Note over T,H: CHECK-OUT
    H->>API: Ảnh đối soát + chỉ số cuối kỳ
    API->>API: Phân định hao mòn tự nhiên; tính công nợ điện nước
    alt Không hư hại, không nợ
        API->>L: Biên bản sạch qua Zalo
        L->>API: Duyệt hoàn cọc
        API->>B: Lệnh hoàn cọc (🟡 mô hình tài khoản)
    else Có hư hại/nợ
        API->>T: Bảng kê cấn trừ minh bạch
        API->>B: Hoàn phần còn lại
    end
```

---

