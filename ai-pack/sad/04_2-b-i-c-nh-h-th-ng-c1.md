<!-- nguồn: docs/SAD_v2.md, dòng 75–115 -->
## 2. BỐI CẢNH HỆ THỐNG (C1)

```mermaid
flowchart TB
    subgraph Actors["Người dùng"]
        Landlord["🏠 Chủ nhà"]
        Tenant["👤 Khách thuê"]
        Host["🚶 Field Host"]
        Lead["🧭 Area Lead"]
        Ops["⚙️ Ops Admin"]
        Comp["🛡️ Compliance Officer"]
    end

    subgraph Core["VinStay AI Platform"]
        System["Web App · Mobile Host PWA · Admin Portal · API Backend"]
    end

    subgraph External["Đối tác & dịch vụ ngoài"]
        Zalo["Zalo OA / ZNS"]
        SMS["SMS Gateway (dự phòng OTP) 🟡"]
        Bank["Ngân hàng / VietQR 🟡"]
        eKYC["FPT.AI eKYC (FPT Smart Cloud) ✅"]
        C06["C06 — CSDL Quốc gia về Dân cư"]
        TSA["Dịch vụ dấu thời gian / chứng thư máy chủ 🟡 ⚖️"]
        Store["Object Storage 🟡"]
    end

    Landlord & Tenant & Host & Lead & Ops & Comp <--> System
    System <--> Zalo
    System <--> SMS
    System <--> Bank
    System <--> eKYC
    eKYC <--> C06
    System --> TSA
    System --> Store
```

**Nguyên tắc biên hệ thống (✅):** VinStay **không kết nối trực tiếp C06**. Mọi xác thực danh tính đi qua đối tác eKYC được cấp phép; vendor chịu trách nhiệm kết nối C06 và trả kết quả đã đối chiếu.

---

