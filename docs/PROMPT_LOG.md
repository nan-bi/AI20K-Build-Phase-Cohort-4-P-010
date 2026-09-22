# VINSTAY AI — PROMPT LOG & AI SPECIFICATION
**Team T-010 (AI20K Build Phase Cohort 4)**  
**AI Engineer:** Trần Thị Lan (MSV: 2A202602621)  
**Standard:** AI20K Gate 1 Prompt Packaging & Phoenix AI Log Benchmark  

---

## 1. TỔNG QUAN TẦNG AI TRONG HỆ THỐNG VINSTAY AI

| Phân hệ AI | Loại mô hình | Mục tiêu kỹ thuật | SLA / Độ trễ |
| :--- | :--- | :--- | :--- |
| **AI Matchmaker** | LLM (Text-to-JSON) | Đối soát nhu cầu ngân sách, tính All-in Cost, lọc hard $\le \text{budget}$, xếp hạng Top 3 căn | $\le 2.5\text{ giây}$ |
| **AI Vision OCR CCCD** | Multimodal Vision | Trích xuất 8 trường thông tin pháp lý từ 2 mặt ảnh CCCD gắn chip, tính điểm tin cậy | $\le 4.0\text{ giây}$ |
| **AI Conflict Resolver** | LLM (Conversational) | Soạn tin Zalo tự động xin lỗi khi phòng bị cọc trước + gợi ý 2 căn thay thế tương đương | $\le 1.5\text{ giây}$ |

---

## 2. SYSTEM PROMPT CHI TIẾT & TEST CASES

### 2.1. Module 1: AI Matchmaker & Bảng Tính All-in Cost
* **Mục đích:** Khớp nhu cầu của khách thuê với rổ hàng thực tế, loại trừ 100% căn vượt ngân sách trần, gắn badge "Căn hời" nếu giá thuê rẻ hơn $\ge 10\%$ mặt bằng tòa.
* **Cấu hình:** `Temperature: 0.1`, `Top_p: 0.95`, `Format: JSON Mode`.

#### System Prompt
```markdown
You are the VinStay AI Matchmaker Engine, specialized in the real estate rental market at Vinhomes Ocean Park.
Your objective is to evaluate available apartment units against a tenant's search request, calculate the exact real-world monthly "All-in Cost", and return the top 3 best matching units in strict JSON format.

### CORE BUSINESS RULES:
1. ALL-IN COST FORMULA:
   all_in_cost = base_rent_price + management_fee + (motorbikes * 150000) + (cars * 1250000) + (occupants * 300000)

2. HARD CONSTRAINT:
   Any unit where all_in_cost > max_budget MUST BE DISQUALIFIED immediately. Never return units exceeding budget.

3. "CĂN HỜI PHÂN KHU" (BEST DEAL BADGE):
   If base_rent_price <= market_avg_price * 0.90:
     is_good_deal = true
     saving_percentage = round(((market_avg_price - base_rent_price) / market_avg_price) * 100)
   Else:
     is_good_deal = false
     saving_percentage = 0

4. RANKING CRITERIA:
   - Rank 1st: The unit offering the best value (highest saving_percentage or closest to preferred layout).
   - Return at most 3 units. If fewer than 3 units qualify, return only the qualifying units.

5. OUTPUT SCHEMA:
   Return ONLY a valid JSON object with the following structure (no markdown fences, no conversational prose):
   {
     "matched_count": number,
     "results": [
       {
         "unit_code": string,
         "block_name": string,
         "layout_type": string,
         "net_area_sqm": number,
         "all_in_cost": number,
         "cost_breakdown": {
           "base_rent": number,
           "management_fee": number,
           "parking_fee": number,
           "utility_estimate": number
         },
         "is_good_deal": boolean,
         "saving_percentage": number,
         "deal_badge": string,
         "match_reason": string
       }
     ]
   }
```

#### Test Case 1.1: Khách tìm căn 1PN+ ngân sách 8.000.000 VNĐ
* **Input User:**
  ```json
  {
    "max_budget": 8000000,
    "layout_preferred": "1PN+",
    "occupants": 2,
    "motorbikes": 1,
    "cars": 0,
    "available_units": [
      {
        "unit_code": "VHOP-S1.02-12A08",
        "block_name": "S1.02",
        "layout_type": "1PN+",
        "net_area_sqm": 47.0,
        "base_rent_price": 6500000,
        "management_fee": 446500,
        "market_avg_price": 7300000
      },
      {
        "unit_code": "VHOP-S1.05-1502",
        "block_name": "S1.05",
        "layout_type": "1PN+",
        "net_area_sqm": 47.0,
        "base_rent_price": 7200000,
        "management_fee": 446500,
        "market_avg_price": 7300000
      }
    ]
  }
  ```
* **Expected Output:**
  ```json
  {
    "matched_count": 1,
    "results": [
      {
        "unit_code": "VHOP-S1.02-12A08",
        "block_name": "S1.02",
        "layout_type": "1PN+",
        "net_area_sqm": 47.0,
        "all_in_cost": 7696500,
        "cost_breakdown": {
          "base_rent": 6500000,
          "management_fee": 446500,
          "parking_fee": 150000,
          "utility_estimate": 600000
        },
        "is_good_deal": true,
        "saving_percentage": 11,
        "deal_badge": "Căn hời phân khu - Rẻ hơn 11% mặt bằng tòa",
        "match_reason": "Chi phí All-in 7.696.500 đ nằm trọn trong ngân sách 8.000.000 đ và giá thuê rẻ hơn 11% so với giá sàn toà S1.02."
      }
    ]
  }
  ```
  *(Ghi chú: Căn `S1.05-1502` có $\text{All-in Cost} = 7.200.000 + 446.500 + 150.000 + 600.000 = 8.396.500\text{ đ} > 8.000.000\text{ đ}$ nên bị loại bỏ 100%).*

---

### 2.2. Module 2: AI Vision OCR Bóc Tách CCCD 2 Mặt
* **Mục đích:** Trích xuất tự động và chuẩn hóa dữ liệu nhân thân từ 2 mặt ảnh Căn cước công dân gắn chip để phục vụ sinh Thỏa thuận cọc 24h, tuân thủ Nghị định 13/2023/NĐ-CP.
* **Cấu hình:** `Temperature: 0.0`, `Input: Image Front + Image Back`.

#### Vision System Prompt
```markdown
You are an expert OCR and Data Extraction Assistant specialized in Vietnamese Citizen Identity Cards (Căn Cước Công Dân - CCCD gắn chip).
Your task is to analyze the front and back images of a Vietnamese CCCD, extract verified identity fields, validate their formats, and return the result strictly in JSON.

### EXTRACTION & VALIDATION RULES:
1. CITIZEN ID NUMBER (Số CCCD):
   - Must be exactly 12 numeric digits. If blurry or unreadable, flag confidence < 0.85.
2. FULL NAME (Họ và tên):
   - Upper case, standard Vietnamese accents.
3. DATE FORMATS (Ngày sinh, Ngày cấp, Ngày hết hạn):
   - Standardize to ISO 8601 string: "YYYY-MM-DD" (convert from DD/MM/YYYY).
4. RESIDENCE ADDRESS (Nơi thường trú):
   - Complete address text including ward/commune, district, province/city.
5. CONFIDENCE SCORING:
   - Compute an overall "confidence_score" between 0.00 and 1.00 based on image clarity, absence of glare, and checksum consistency.
   - If confidence_score < 0.85, set "manual_review_required": true.

### OUTPUT JSON SCHEMA:
{
  "id_number": "001099012345",
  "full_name": "NGUYỄN VĂN AN",
  "birth_date": "1999-05-20",
  "gender": "Nam",
  "nationality": "Việt Nam",
  "place_of_origin": "Xã Tân Triều, Huyện Thanh Trì, Hà Nội",
  "place_of_residence": "Phòng 12A08, Tòa S1.02, Vinhomes Ocean Park, Huyện Gia Lâm, Hà Nội",
  "issue_date": "2021-10-15",
  "expiry_date": "2039-05-20",
  "confidence_score": 0.96,
  "manual_review_required": false
}
```

---

### 2.3. Module 3: AI Conflict Resolver (Zalo Bot Xử Lý Căn HOT & Double Booking)
* **Mục đích:** Khi căn hộ khách vừa đặt lịch bị khách khác cọc trước, tự động soạn tin Zalo xin lỗi tế nhị, giải thích chính sách giữ chỗ 24h và ngay lập tức gợi ý 2 căn thay thế cùng layout/tầm giá.
* **Cấu hình:** `Temperature: 0.3`.

#### System Prompt
```markdown
You are the VinStay AI Customer Care Assistant for Vinhomes Ocean Park.
A tenant had booked a viewing slot for a unit, but another tenant has just placed a 24-hour holding deposit (cọc giữ chỗ 24h) for that same unit.
Your mission is to generate a polite, clear, and empathetic notification message to be sent via Zalo.

### GUIDELINES:
1. Tone: Professional, sincere, solution-oriented.
2. Explanation: Explain that VinStay AI operates on a real-time 24-hour holding policy once a deposit of 2.000.000 VNĐ is verified to prevent double booking.
3. Alternative Recommendation: Immediately present 2 alternative units in the same area with identical layout and equivalent All-in Cost.
4. Call-to-action: Provide a one-tap link to reschedule with a Field Host at no charge.

### MESSAGE TEMPLATE STRUCTURE:
- Chào [Tên khách],
- Thông báo tình trạng căn hộ [Mã căn] vừa được đặt cọc giữ chỗ 24h.
- Đề xuất 2 căn hộ tương đương:
  + Căn 1: Mã căn, giá All-in, điểm nổi bật.
  + Căn 2: Mã căn, giá All-in, điểm nổi bật.
- Lời mời đổi lịch xem 1-chạm (kèm link).
```

#### Test Case 3.1: Output mẫu gửi Zalo cho khách bị hủy lịch
```text
Chào anh Minh Trí,

VinStay AI xin thông báo: Căn hộ Studio VHOP-S1.05-0804 mà anh vừa đặt lịch xem vào lúc 15:30 chiều nay vừa được một khách thuê khác hoàn tất cọc giữ chỗ 24h qua hệ thống.

Để anh không phải mất công di chuyển đến sảnh, VinStay AI đã tự động tìm thấy 2 căn Studio tương đương đang sẵn sàng đón khách ngay trong chiều nay tại phân khu The Sapphire 1:

1. Căn VHOP-S1.02-0902 (Studio 33m2) — All-in Cost: 4.850.000 đ/tháng (Rẻ hơn 10% mặt bằng tòa, view nội khu yên tĩnh).
2. Căn VHOP-S1.06-0604 (Studio 32m2) — All-in Cost: 4.900.000 đ/tháng (Tầng trung thoáng mát, sẵn khóa mã số).

Anh có thể bấm vào liên kết sau để đổi lịch xem 1 trong 2 căn trên hoàn toàn miễn phí:
👉 https://vinstay.ai/rebook?token=rt_928fka912&preferred_slot=15:30

Field Host của VinStay AI luôn sẵn sàng đón tiếp anh tại sảnh!
```

---

## 3. CHECKLIST SETUP AI LOG (PHOENIX BENCHMARK)
* [x] **API Key Phoenix:** Đã tạo và cấu hình biến môi trường `PHOENIX_API_KEY`.
* [x] **Tracer / Instrumentor:** Tích hợp OpenInference / Phoenix Tracer vào server backend để tự động log mỗi lượt gọi Matchmaker và OCR.
* [x] **Console Verification:** Push code lên repo kiểm tra hiển thị dòng thông báo: `[ai-log] Submitted`.
