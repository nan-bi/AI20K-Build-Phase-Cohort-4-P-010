<!-- nguồn: docs/SAD_v2.md, dòng 296–346 -->
## 6. BỐN ENGINE LÕI

> Chỉ Engine 1 có lớp ranking; các engine còn lại là rule/transactional hoặc vendor. Không gọi tất cả là "AI" trong tài liệu trình Hội đồng.

### 6.1 Engine 1 — Matchmaker & All-in Cost (✅)

1. **Lọc cứng:** loại mọi căn có `All-in Cost > budget_max`; lọc thêm layout, trạng thái `available`, số nhân khẩu/phương tiện.
2. **Ranking & badge:** `Saving Ratio = (market_avg − base_rent) / market_avg`; nếu ≥ 10% gắn `Căn hời phân khu – Tiết kiệm X%`. `Score = w1·Saving + w2·Amenity + w3·Freshness` (🟡 trọng số w1–w3 chưa chốt).
3. Trả **Top 3** kèm bảng bóc tách 4 khoản phí. Mục tiêu ≤ 3s tính toán, ≤ 30s trải nghiệm.

Không dùng vector search/pgvector trừ khi có yêu cầu tìm kiếm ngữ nghĩa được duyệt.

### 6.2 Engine 2 — Dispatcher Field Host (✅ rule engine, ADR-01)

| Tầng  | Điều kiện                                                              | SLA nhận   | Khi hết SLA     |
| ----- | ---------------------------------------------------------------------- | ---------- | --------------- |
| **1** | Host online gần nhất (cụm tòa; 🔵 ≤200m), xếp theo SPS                 | **5 phút** | → Tầng 2        |
| **2** | Host trong phân khu ≤ **500m**                                         | **3 phút** | → Tầng 3        |
| **3** | **Broadcast** toàn bộ Host + cảnh báo **Area Lead** chỉ định/tiếp quản | —          | Area Lead xử lý |

- 🔵 Chống ôm lead: mỗi Host tối đa 1 lịch trong khung 45 phút.
- Worker đếm ngược SLA theo từng ticket; ghi `dispatch_tickets(tier, sla_seconds, status)`.
- Hệ thống đẩy ticket cho Host trong ≤ 30 giây sau khi lịch được xác nhận (🔵 chỉ tiêu).
- Sau khi Host nhận: Zalo xác nhận lịch cho khách kèm **tên/SĐT Host**.

### 6.3 Engine 3 — Conflict Resolver & Khóa căn (✅)

**Nguyên tắc: PostgreSQL là nguồn sự thật cho trạng thái căn.**

```sql
BEGIN;
SELECT status FROM units WHERE id = $unit FOR UPDATE;      -- khóa hàng
-- nếu status <> 'AVAILABLE' → ROLLBACK, đánh dấu cọc cần hoàn/xử lý thủ công
INSERT INTO escrow_transactions(... bank_ref_number UNIQUE ...);  -- idempotency
UPDATE units SET status='HOLDING' WHERE id = $unit;
UPDATE holding_deposits SET payment_status='PAID_HOLDING', paid_at=now(),
       expires_at = now() + interval '7 days' WHERE id = $deposit;
COMMIT;
```

- Redis (nếu dùng) chỉ là **mutex ngắn hạn (≈30s)** để giảm tranh chấp khi xử lý webhook — **không** lưu khóa 7 ngày.
- Sau khi commit: quét lịch xem tương lai của căn → `CANCELLED` (`cancel_reason = AUTO_CANCELLED_DUE_TO_DEPOSIT`) → Zalo xin lỗi + gợi ý 2 căn tương đương (cùng layout, ngân sách, phân khu); khách đổi lịch 1 chạm.
- 🔵 Căn HOT: ≥ 3 lịch trong 24h tới → `is_hot`.
- Hết 7 ngày không ký → worker chuyển `available` và mở quy trình hoàn cọc (**🟡 chính sách hoàn/tịch thu chưa chốt**).

### 6.4 Engine 4 — Identity Verification (vendor, không phải AI nội bộ)

Xem §7.

---

