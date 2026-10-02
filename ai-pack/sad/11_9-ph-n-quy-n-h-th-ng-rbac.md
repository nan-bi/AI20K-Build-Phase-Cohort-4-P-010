<!-- nguồn: docs/SAD_v2.md, dòng 486–528 -->
## 9. PHÂN QUYỀN HỆ THỐNG (RBAC) ✅

### 9.1 Vai trò

| Vai trò              | Mô tả                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| `tenant`             | Chỉ thao tác trên dữ liệu của chính mình                              |
| `field_host`         | Sale/CTV nội khu — trong phạm vi ticket được giao                     |
| `landlord`           | Thao tác trên căn hộ mình sở hữu/ủy quyền                             |
| `area_lead`          | Host cấp cao, nhận ticket Tầng 3; không có quyền admin                |
| `ops_admin`          | Cấu hình biến phí, giám sát SLA, xử lý ngoại lệ                       |
| `compliance_officer` | Quyền hẹp — truy cập dữ liệu xác thực danh tính để đối soát           |
| `system`             | Tài khoản dịch vụ nội bộ (Dispatcher, Payment Webhook, Notification…) |

### 9.2 Ma trận quyền theo tài nguyên

| Tài nguyên                        | tenant        | field_host                | landlord         | area_lead                 | ops_admin          | compliance_officer       | system |
| --------------------------------- | ------------- | ------------------------- | ---------------- | ------------------------- | ------------------ | ------------------------ | ------ |
| Xem listing công khai             | R             | R                         | R (căn của mình) | R                         | CRUD               | –                        | R      |
| Đặt lịch xem (viewings)           | C (của mình)  | RU (ticket được giao)     | R (căn của mình) | RU (ticket broadcast)     | CRUD               | –                        | CRUD   |
| Nhận/từ chối dispatch ticket      | –             | RU (ticket của mình)      | –                | RU                        | CRUD               | –                        | CRUD   |
| Xem mã khóa cửa                   | –             | R (chỉ khi ticket active) | –                | R (chỉ khi ticket active) | R (audit bắt buộc) | –                        | CRUD   |
| Cấu hình/xoay mã khóa             | –             | –                         | U (yêu cầu xoay) | –                         | CRUD               | –                        | CRUD   |
| Dữ liệu xác thực danh tính (CCCD) | R (của mình)  | –                         | –                | –                         | –                  | R (audit bắt buộc)       | CRUD   |
| Cọc giữ chỗ                       | R (của mình)  | RU (ticket của mình)      | R (căn của mình) | –                         | CRUD               | –                        | CRUD   |
| Ký thỏa thuận/hợp đồng            | CU (của mình) | –                         | R (căn của mình) | –                         | R                  | R (audit)                | CRUD   |
| Hộ chiếu bàn giao số              | R (của mình)  | CRU (ticket của mình)     | R (căn của mình) | –                         | R                  | –                        | CRUD   |
| Cấu hình biến phí Host            | –             | –                         | –                | –                         | CRUD               | –                        | R      |
| Dashboard BI / Funnel             | –             | R (số liệu cá nhân)       | R (căn của mình) | R (khu vực)               | CRUD               | –                        | R      |
| Audit log                         | –             | –                         | –                | –                         | R                  | R (liên quan compliance) | CRUD   |

_C=Create, R=Read, U=Update, D=Delete. "của mình" = ràng buộc theo `owner_id`/`tenant_id` ở tầng policy, không phải quyền toàn cục._

### 9.3 Cơ chế thực thi

1. **AuthZ Service** (policy engine dạng attribute-based: role + sở hữu tài nguyên + trạng thái ticket) được Gateway gọi **trước mọi request**. Danh mục quyền lưu ở bảng `roles / permissions / role_permissions`; điều kiện sở hữu/trạng thái nằm trong policy code.
2. **Truy cập `door_access_keys` và `identity_verifications` bắt buộc ghi `audit_log`**, kể cả truy cập hợp lệ.
3. **Least privilege:** `compliance_officer` không ghi/sửa nghiệp vụ ngoài đối soát; `ops_admin` **không tự động** xem dữ liệu định danh trừ khi được cấp riêng.
4. 🔵 **RLS PostgreSQL làm lớp phòng thủ thứ hai** (Host chỉ thấy ca được giao; chủ nhà chỉ thấy căn của mình; khách chỉ thấy dữ liệu của mình). Lưu ý kỹ thuật: Prisma kết nối bằng role có thể bypass RLS — nếu dùng RLS phải cấu hình role/`SET LOCAL` theo request; nếu không, coi AuthZ là lớp kiểm soát duy nhất và ghi rõ như vậy.
5. 🟡 Ai giữ vai trò `compliance_officer` trong đội tinh gọn (§19).

---

