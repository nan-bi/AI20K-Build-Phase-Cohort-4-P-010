import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SignOutButton } from "@/components/auth/SignOutButton";
import Link from "next/link";

export const metadata = {
  title: "Cổng Chủ Nhà — VinStay AI",
};

export default async function LandlordDashboardPage() {
  let userEmail = "chunha.oceanpark@vinstay.vn";

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) userEmail = user.email;
    } catch {
      // fallback
    }
  }

  const cookieStore = await cookies();
  const devUser = cookieStore.get("vinstay_dev_user")?.value;
  if (devUser) userEmail = devUser;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", paddingBottom: 60 }}>
      {/* Top Navigation */}
      <header
        style={{
          background: "#0e1b22",
          color: "#ffffff",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              background: "var(--accent, #d69a46)",
              color: "#fff",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            VS
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>
              VinStay AI — Cổng Chủ Nhà
            </div>
            <div style={{ fontSize: 12, color: "#95a5a6" }}>
              Vinhomes Ocean Park 1 • Quản lý Ký gửi Độc quyền (Exclusive Mandate)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right", fontSize: 13 }}>
            <span style={{ color: "#bdc3c7" }}>Chủ sở hữu: </span>
            <strong style={{ color: "#f1c40f" }}>{userEmail}</strong>
            <div style={{ fontSize: 11, color: "#2ecc71" }}>● Chủ nhà ở nhà 100% (Field Host hỗ trợ)</div>
          </div>
          <SignOutButton redirectTo="/login?tab=landlord" />
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1140, margin: "28px auto", padding: "0 20px" }}>
        {/* Banner Cam Kết 4 Nỗi Đau */}
        <div
          style={{
            background: "linear-gradient(135deg, #14303a 0%, #0e1b22 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            borderRadius: 14,
            marginBottom: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            boxShadow: "0 4px 16px rgba(14,27,34,0.1)",
          }}
        >
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.1)", paddingRight: 12 }}>
            <div style={{ fontSize: 12, color: "#d69a46", fontWeight: 700, textTransform: "uppercase" }}>
              1. Khắc phục Trống Phòng
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>6.5 ngày</div>
            <div style={{ fontSize: 12, color: "#bdc3c7", marginTop: 2 }}>
              AI Matchmaker All-in (giảm từ 30 ngày)
            </div>
          </div>

          <div style={{ borderRight: "1px solid rgba(255,255,255,0.1)", paddingRight: 12 }}>
            <div style={{ fontSize: 12, color: "#d69a46", fontWeight: 700, textTransform: "uppercase" }}>
              2. Không cần đi 25km
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>100% Ở Nhà</div>
            <div style={{ fontSize: 12, color: "#bdc3c7", marginTop: 2 }}>
              Field Host thẻ thang máy & cấp mã tức thì
            </div>
          </div>

          <div style={{ borderRight: "1px solid rgba(255,255,255,0.1)", paddingRight: 12 }}>
            <div style={{ fontSize: 12, color: "#d69a46", fontWeight: 700, textTransform: "uppercase" }}>
              3. Cọc Bảo Đảm Nội Thất
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>22.400.000 đ</div>
            <div style={{ fontSize: 12, color: "#bdc3c7", marginTop: 2 }}>
              Giữ nguyên suốt kỳ thuê (Hộ chiếu 10 mục)
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#d69a46", fontWeight: 700, textTransform: "uppercase" }}>
              4. Bảo Trì & Điện Nước EVN
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>0% Nợ Đọng</div>
            <div style={{ fontSize: 12, color: "#bdc3c7", marginTop: 2 }}>
              Danh bạ thợ tự thỏa thuận, chốt công tơ
            </div>
          </div>
        </div>

        {/* Section 1: Căn hộ quản lý */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#16232c" }}>
              Danh Sách Căn Hộ Ký Gửi Độc Quyền (2 Căn)
            </h2>
            <span
              style={{
                fontSize: 12,
                padding: "6px 12px",
                background: "#e8f5e9",
                color: "#2e7d32",
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              ✓ Hợp đồng Ký gửi Độc quyền hiệu lực
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
            {/* Unit 1: S2.18-12A08 */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 14,
                border: "1px solid #dce3e0",
                padding: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0e1b22" }}>
                      S2.18 - Tầng 12A - Căn 08
                    </h3>
                    <span
                      style={{
                        background: "rgba(214,154,70,0.15)",
                        color: "#995d12",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}
                    >
                      Căn hời phân khu (-12%)
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "#5c6b70", marginTop: 4 }}>
                    The Sapphire 2 • Layout 2PN+1 (55m²) • Hướng Đông Nam
                  </p>
                </div>
                <div
                  style={{
                    background: "#fff8e1",
                    color: "#b78103",
                    border: "1px solid #ffe082",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 20,
                  }}
                >
                  🔒 Holding 24h (VietQR)
                </div>
              </div>

              <div
                style={{
                  margin: "16px 0",
                  padding: 12,
                  background: "#f9fbfa",
                  borderRadius: 8,
                  border: "1px solid #eef2f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#5c6b70" }}>Giá All-in minh bạch:</span>
                  <strong>11.200.000 đ/tháng</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7f8c8d" }}>
                  <span>(Gồm: Tiền nhà 9.5tr + Phí BQL 600k + Xe máy 100k + Dự phòng điện nước)</span>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px dashed #dce3e0",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#27ae60", fontWeight: 600 }}>Khách đặt cọc giữ chỗ:</span>
                  <span>Nguyễn Hoàng Long (Đã nhận 2.000.000 VNĐ qua VietQR)</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "9px",
                    background: "#0e1b22",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📋 Xem Hộ Chiếu Bàn Giao
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "9px",
                    background: "#f4f7f6",
                    color: "#16232c",
                    border: "1px solid #dce3e0",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🔑 Lịch Sử Cấp Mã Cửa
                </button>
              </div>
            </div>

            {/* Unit 2: R1.02-2104 */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 14,
                border: "1px solid #dce3e0",
                padding: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0e1b22" }}>
                    R1.02 - Tầng 21 - Căn 04
                  </h3>
                  <p style={{ fontSize: 13, color: "#5c6b70", marginTop: 4 }}>
                    The Zenpark (Phân khu Ruby) • Layout Studio Cao Cấp (33m²)
                  </p>
                </div>
                <div
                  style={{
                    background: "#e8f5e9",
                    color: "#2e7d32",
                    border: "1px solid #c8e6c9",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 20,
                  }}
                >
                  ● Đang cho thuê
                </div>
              </div>

              <div
                style={{
                  margin: "16px 0",
                  padding: 12,
                  background: "#f9fbfa",
                  borderRadius: 8,
                  border: "1px solid #eef2f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#5c6b70" }}>Giá thuê trọn gói:</span>
                  <strong>7.800.000 đ/tháng</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5c6b70" }}>
                  <span>Hạn hợp đồng:</span>
                  <strong>Đến 15/12/2026 (Còn 8 tháng)</strong>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px dashed #dce3e0",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#5c6b70" }}>Tiền cọc bảo đảm:</span>
                  <span style={{ fontWeight: 600, color: "#0e1b22" }}>15.600.000 VNĐ (Nguyên vẹn)</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "9px",
                    background: "#0e1b22",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ⚡ Chỉ Số Điện Nước EVN
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "9px",
                    background: "#f4f7f6",
                    color: "#16232c",
                    border: "1px solid #dce3e0",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🔧 Danh Bạ Thợ Ngoài
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Hộ chiếu Bàn giao Số (10 Hạng Mục Nội Thất) */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 14,
            border: "1px solid #dce3e0",
            padding: 24,
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0e1b22" }}>
                Hộ Chiếu Bàn Giao Số (Digital Handover Passport) — Căn S2.18-12A08
              </h2>
              <p style={{ fontSize: 13, color: "#5c6b70", marginTop: 2 }}>
                10 hạng mục nội thất có Timestamp & Geofence bảo mật • Phân định rõ hao mòn tự nhiên vs hư hỏng bất cẩn
              </p>
            </div>
            <span
              style={{
                fontSize: 12,
                color: "#2980b9",
                background: "#ebf5fb",
                padding: "6px 12px",
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              🔒 Chuẩn hóa Security Deposit
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {[
              { name: "1. Sofa Da Phòng Khách", status: "Mới 98%", desc: "Không vết xước hay rách" },
              { name: "2. Điều Hòa Daikin Multi", status: "Lạnh sâu", desc: "Đã vệ sinh lọc gió T-03" },
              { name: "3. Bếp Từ & Hút Mùi Hafele", status: "Hoạt động tốt", desc: "Mặt kính nguyên vẹn" },
              { name: "4. Tủ Lạnh Samsung Inverter", status: "Sạch sẽ", desc: "Đầy đủ khay kệ" },
              { name: "5. Sơn Tường & Trần Thạch Cao", status: "Không ẩm mốc", desc: "Màu sơn nguyên bản" },
              { name: "6. Sàn Gỗ An Cường", status: "Bề mặt phẳng", desc: "Không phồng rộp do nước" },
              { name: "7. Giường & Nệm Cao Cấp", status: "Vỏ nệm mới", desc: "Khung gỗ chắc chắn" },
              { name: "8. Thiết Bị Vệ Sinh Toto", status: "Sáng bóng", desc: "Không rò rỉ van cấp" },
              { name: "9. Máy Giặt & Giàn Phơi", status: "Chạy êm", desc: "Ống xả thoát tốt" },
              { name: "10. Hệ Thống Khóa Điện Tử", status: "Bảo mật", desc: "Pin 100%, mã app tức thì" },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px",
                  background: "#f9fbfa",
                  borderRadius: 10,
                  border: "1px solid #eef2f0",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#16232c" }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#27ae60", fontWeight: 600, marginTop: 4 }}>
                  ● {item.status}
                </div>
                <div style={{ fontSize: 11, color: "#7f8c8d", marginTop: 2 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Chuyển đổi qua lại các vai trò */}
        <div
          style={{
            padding: "16px 20px",
            background: "#ffffff",
            borderRadius: 12,
            border: "1px dashed #dce3e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 13, color: "#5c6b70" }}>
            Khám phá các góc nhìn khác của hệ thống VinStay AI:
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#16232c",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 6,
                background: "#f4f7f6",
              }}
            >
              🤖 Cổng Khách thuê (AI Search)
            </Link>
            <Link
              href="/host/dispatch"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#16232c",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 6,
                background: "#f4f7f6",
              }}
            >
              📱 Cổng Field Host (Dispatch)
            </Link>
            <Link
              href="/admin/dashboard"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#16232c",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 6,
                background: "#f4f7f6",
              }}
            >
              🛡️ Cổng Quản Trị (Admin BI)
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
