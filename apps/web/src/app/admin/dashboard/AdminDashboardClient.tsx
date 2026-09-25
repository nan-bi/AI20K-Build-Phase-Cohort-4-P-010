"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

interface AdminDashboardClientProps {
  userEmail: string;
}

export function AdminDashboardClient({ userEmail }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "holding" | "dispatch" | "commissions">("overview");

  // Dynamic Commission state editable by Admin
  const [tourFee, setTourFee] = useState<number>(80000);
  const [closingBonus, setClosingBonus] = useState<number>(500000);
  const [weekendSurge, setWeekendSurge] = useState<number>(100000);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Đã lưu cấu hình Dynamic Commission & Incentive Engine thành công!");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1d", color: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: "#10b981",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            fontWeight: 700,
            fontSize: "0.95rem",
          }}
        >
          ✓ {toastMsg}
        </div>
      )}

      {/* Top Header */}
      <header
        style={{
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          padding: "16px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.1rem",
              color: "#ffffff",
            }}
          >
            VS
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#ffffff" }}>
                VinStay AI — Quản Trị Hệ Điều Hành (Admin Portal)
              </h1>
              <span
                style={{
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#a5b4fc",
                  border: "1px solid #6366f1",
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Vinhomes Ocean Park
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 2 }}>
              Đăng nhập: <strong>{userEmail}</strong> | Toàn quyền kiểm soát rổ hàng, dispatch & đối soát cọc
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            style={{
              background: "#1e293b",
              color: "#cbd5e1",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            ← Về Chatbot Khách Thuê
          </Link>
          <SignOutButton redirectTo="/admin/login" />
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: 1280, margin: "24px auto", padding: "0 24px" }}>
        {/* KPI Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: "#111827",
              borderRadius: 14,
              padding: "20px",
              border: "1px solid #1f2937",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Tổng căn Ký gửi Độc quyền
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#38bdf8", marginTop: 6 }}>
              142 <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 500 }}>căn</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#10b981", marginTop: 6, fontWeight: 600 }}>
              ↑ 100% Exclusive Mandate (Chi phí kiểm định = 0)
            </div>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: "#111827",
              borderRadius: 14,
              padding: "20px",
              border: "1px solid #1f2937",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Đang Holding Cọc 24h (VietQR)
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#f59e0b", marginTop: 6 }}>
              8 <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 500 }}>giao dịch</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#facc15", marginTop: 6 }}>
              16.000.000 VNĐ tiền cọc giữ chỗ định danh
            </div>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: "#111827",
              borderRadius: 14,
              padding: "20px",
              border: "1px solid #1f2937",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Auto-Dispatch SLA (Chuẩn &lt; 3m)
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#10b981", marginTop: 6 }}>
              1m 42s
            </div>
            <div style={{ fontSize: "0.8rem", color: "#34d399", marginTop: 6 }}>
              98.6% ticket tiếp nhận tầng 1 (Field Host gần nhất)
            </div>
          </div>

          {/* Card 4 */}
          <div
            style={{
              background: "#111827",
              borderRadius: 14,
              padding: "20px",
              border: "1px solid #1f2937",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Tỷ lệ Cắt cầu ngoài (Leakage)
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#a855f7", marginTop: 6 }}>
              0%
            </div>
            <div style={{ fontSize: "0.8rem", color: "#c084fc", marginTop: 6 }}>
              Triệt tiêu nhờ độc quyền + bảo vệ cọc 10 mục
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            borderBottom: "1px solid #1f2937",
            paddingBottom: 12,
            overflowX: "auto",
          }}
        >
          <button
            onClick={() => setActiveTab("overview")}
            style={{
              background: activeTab === "overview" ? "#4f46e5" : "transparent",
              color: activeTab === "overview" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            📊 Tổng Quan & Cảnh Báo
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            style={{
              background: activeTab === "inventory" ? "#4f46e5" : "transparent",
              color: activeTab === "inventory" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            🏢 Giỏ Hàng Độc Quyền (142 Căn)
          </button>

          <button
            onClick={() => setActiveTab("holding")}
            style={{
              background: activeTab === "holding" ? "#4f46e5" : "transparent",
              color: activeTab === "holding" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            💳 Khóa Căn Giữ Chỗ 24h (VietQR)
          </button>

          <button
            onClick={() => setActiveTab("dispatch")}
            style={{
              background: activeTab === "dispatch" ? "#4f46e5" : "transparent",
              color: activeTab === "dispatch" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            📡 Giám Sát Dispatch 3 Tầng
          </button>

          <button
            onClick={() => setActiveTab("commissions")}
            style={{
              background: activeTab === "commissions" ? "#4f46e5" : "transparent",
              color: activeTab === "commissions" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            ⚙️ Cấu Hình Thù Lao (Dynamic OpEx)
          </button>
        </div>

        {/* Tab 1: Overview & Strategic Solved Problems */}
        {activeTab === "overview" && (
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            {/* Banner: 4 Pain Points Solved */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e1b4b, #0f172a)",
                border: "1px solid #3730a3",
                borderRadius: 14,
                padding: "24px",
              }}
            >
              <h2 style={{ margin: "0 0 12px 0", fontSize: "1.2rem", fontWeight: 800, color: "#a5b4fc" }}>
                🎯 VINSTAY AI — HỆ THỐNG ĐÁP ỨNG TRỌN VẸN 4 NỖI ĐAU CHỦ NHÀ & 5 NỖI ĐAU KHÁCH THUÊ
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <div style={{ background: "rgba(255,255,255,0.04)", padding: 14, borderRadius: 10 }}>
                  <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.85rem" }}>
                    1. TRỐNG PHÒNG KÉO DÀI
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 4 }}>
                    AI Matchmaker theo All-in Cost + Badge Căn Hời phân khu giúp thời gian tìm khách giảm từ 30 ngày xuống dưới 7 ngày.
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.04)", padding: 14, borderRadius: 10 }}>
                  <div style={{ color: "#34d399", fontWeight: 700, fontSize: "0.85rem" }}>
                    2. CỰC HÌNH ĐI XA 20-30KM
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 4 }}>
                    Field Host nội khu có thẻ RFID thang máy đón khách tại sảnh. Cấp mã khóa tức thì trên App khi tới cửa. Chủ nhà ở nhà 100%.
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.04)", padding: 14, borderRadius: 10 }}>
                  <div style={{ color: "#facc15", fontWeight: 700, fontSize: "0.85rem" }}>
                    3. TRANH CHẤP HƯ HAO NỘI THẤT
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 4 }}>
                    Hộ chiếu bàn giao số 10 mục nhúng Timestamp & Geofence GPS. Cọc 2TR ban đầu giữ nguyên suốt kỳ làm cọc bảo đảm tài sản.
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.04)", padding: 14, borderRadius: 10 }}>
                  <div style={{ color: "#f43f5e", fontWeight: 700, fontSize: "0.85rem" }}>
                    4. BẢO TRÌ & NỢ ĐIỆN NƯỚC EVN
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 4 }}>
                    Mô hình Asset-light giới thiệu danh bạ thợ ngoài uy tín; số hóa nội quy BQL tự động trừ cọc vi phạm; chốt công tơ EVN 0% nợ đọng.
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Platform Logs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
              {/* Box 1: Recent Auto-Dispatch Logs */}
              <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "20px" }}>
                <h3 style={{ margin: "0 0 14px 0", fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>
                  📡 Nhật Ký Dispatch Tự Động Gần Nhất
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { time: "11:42", text: "Khách Đỗ Văn Nam đặt lịch xem S2.05-1808. Đã gửi Zalo OTP xác thực thành công.", status: "OK" },
                    { time: "11:43", text: "Auto-Dispatch tầng 1 điều phối Field Host FH-OCP-09 (cách 180m). Host chấp nhận trong 48 giây.", status: "SUCCESS" },
                    { time: "11:30", text: "Giao dịch cọc giữ chỗ 2TR căn S1.02-0810 qua VietQR động. Hệ thống tự động khóa status 'holding'.", status: "HOLDING" },
                    { time: "10:15", text: "Căn hộ S2.18-1205 được thuật toán Dynamic Deal gắn huy hiệu 'Căn hời phân khu' (rẻ hơn 12%).", status: "DEAL" },
                  ].map((log, i) => (
                    <div key={i} style={{ fontSize: "0.85rem", display: "flex", gap: 12, alignItems: "flex-start", borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>{log.time}</span>
                      <span style={{ color: "#cbd5e1", flex: 1 }}>{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 2: System Health */}
              <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "20px" }}>
                <h3 style={{ margin: "0 0 14px 0", fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>
                  🛡️ Trạng Thái Hạ Tầng & Bảo Mật
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "#94a3b8" }}>Hợp đồng độc quyền (Exclusive Mandate)</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>142/142 Căn (100%)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "#94a3b8" }}>Bảo mật số điện thoại Chủ nhà</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>Mã hóa 100% (Anti-Bait)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "#94a3b8" }}>Ký số OCR CCCD theo NĐ 13/2023/NĐ-CP</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>AES-256 Kích hoạt</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "#94a3b8" }}>Cổng gạch nợ VietQR động 2TR</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>Sẵn sàng (24h Auto-Release)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Inventory */}
        {activeTab === "inventory" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#ffffff" }}>
                    Danh Sách Căn Hộ Ký Gửi Độc Quyền (Exclusive Mandate)
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
                    Định danh chuẩn [Tòa - Tầng - Căn], mã hóa SĐT chống môi giới ăn cắp ảnh và dìm giá.
                  </div>
                </div>
                <div style={{ background: "#1f2937", padding: "6px 14px", borderRadius: 8, fontSize: "0.85rem" }}>
                  Tổng: <strong>142 căn</strong>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "#1e293b", color: "#94a3b8", textAlign: "left" }}>
                      <th style={{ padding: "12px 14px" }}>Căn hộ</th>
                      <th style={{ padding: "12px 14px" }}>Phân khu</th>
                      <th style={{ padding: "12px 14px" }}>Layout</th>
                      <th style={{ padding: "12px 14px" }}>Giá All-in (Dự kiến)</th>
                      <th style={{ padding: "12px 14px" }}>Chủ nhà</th>
                      <th style={{ padding: "12px 14px" }}>Huy hiệu AI</th>
                      <th style={{ padding: "12px 14px" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { unit: "S2.05-1808", zone: "The Sapphire 2", layout: "1PN+1 (48m²)", allIn: "8.200.000đ", owner: "0912***482", badge: "CĂN HỜI (-11%)", status: "HOLDING (24h)", statusColor: "#f59e0b" },
                      { unit: "S1.08-1204", zone: "The Sapphire 1", layout: "Studio (33m²)", allIn: "5.800.000đ", owner: "0988***912", badge: "GIÁ CHUẨN", status: "SẴN SÀNG", statusColor: "#10b981" },
                      { unit: "S2.03-0915", zone: "The Sapphire 2", layout: "2PN+1 (64m²)", allIn: "11.500.000đ", owner: "0904***115", badge: "VIEW ĐẸP", status: "SẴN SÀNG", statusColor: "#10b981" },
                      { unit: "R1.02-2104", zone: "The Zenpark (Ruby)", layout: "2PN (72m²)", allIn: "14.200.000đ", owner: "0977***389", badge: "CAO CẤP", status: "ĐANG THUÊ", statusColor: "#64748b" },
                      { unit: "M1-0812", zone: "Masteri Waterfront", layout: "1PN (46m²)", allIn: "12.000.000đ", owner: "0934***661", badge: "VIEW BIỂN HỒ", status: "HOLDING (24h)", statusColor: "#f59e0b" },
                    ].map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #1f2937" }}>
                        <td style={{ padding: "14px", fontWeight: 700, color: "#ffffff" }}>{row.unit}</td>
                        <td style={{ padding: "14px", color: "#cbd5e1" }}>{row.zone}</td>
                        <td style={{ padding: "14px", color: "#cbd5e1" }}>{row.layout}</td>
                        <td style={{ padding: "14px", color: "#38bdf8", fontWeight: 700 }}>{row.allIn}</td>
                        <td style={{ padding: "14px", color: "#94a3b8" }}>{row.owner} (Đã mã hóa)</td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#facc15", padding: "3px 8px", borderRadius: 4, fontWeight: 700, fontSize: "0.75rem" }}>
                            {row.badge}
                          </span>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ color: row.statusColor, fontWeight: 700 }}>● {row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Holding Deposits 24h */}
        {activeTab === "holding" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", fontWeight: 800, color: "#ffffff" }}>
                Giao Dịch Cọc Giữ Chỗ 24h Qua VietQR Động (2.000.000 VNĐ)
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                Khi khách chuyển cọc, căn tự động chuyển trạng thái Holding khóa 24h toàn mạng lưới. Khi ký Hợp đồng chính thức, số tiền này chuyển 100% thành <strong>Tiền Cọc Bảo Đảm Tài Sản (Security Deposit)</strong>.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                {[
                  { code: "HOLD-VHOP-901", unit: "S2.05-1808", guest: "Nguyễn Tuấn Linh", amount: "2.000.000 VNĐ", timeLeft: "18 giờ 24 phút", vietqrRef: "VS901S2051808", status: "ĐÃ GẠCH NỢ" },
                  { code: "HOLD-VHOP-902", unit: "M1-0812", guest: "Lê Thu Hằng", amount: "2.000.000 VNĐ", timeLeft: "06 giờ 10 phút", vietqrRef: "VS902M10812", status: "ĐÃ GẠCH NỢ" },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.85rem" }}>{item.code}</span>
                      <span style={{ background: "rgba(16,185,129,0.2)", color: "#34d399", padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: "0.75rem" }}>
                        ✓ {item.status}
                      </span>
                    </div>

                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff", marginTop: 10 }}>
                      Căn {item.unit}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 4 }}>
                      Khách đặt: <strong>{item.guest}</strong>
                    </div>

                    <div style={{ marginTop: 12, background: "#1e293b", padding: "10px", borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "#94a3b8" }}>Số tiền cọc:</span>
                        <strong style={{ color: "#facc15" }}>{item.amount}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: 4 }}>
                        <span style={{ color: "#94a3b8" }}>Thời gian giữ còn:</span>
                        <strong style={{ color: "#38bdf8" }}>{item.timeLeft}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Dispatch Monitor */}
        {activeTab === "dispatch" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", fontWeight: 800, color: "#ffffff" }}>
                Giám Sát SLA Điều Phối Auto-Dispatch 3 Tầng
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                Thuật toán tự động phân bổ: Field Host gần nhất (0-3 phút) → Open Pool phân khu (sau 3 phút) → Area Lead can thiệp.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                <div style={{ background: "#0f172a", padding: "16px", borderRadius: 10, border: "1px solid #1e293b" }}>
                  <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.85rem" }}>TẦNG 1: HOST GẦN NHẤT</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", margin: "8px 0" }}>98.6%</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Tiếp nhận trong vòng 180 giây</div>
                </div>

                <div style={{ background: "#0f172a", padding: "16px", borderRadius: 10, border: "1px solid #1e293b" }}>
                  <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.85rem" }}>TẦNG 2: OPEN POOL</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", margin: "8px 0" }}>1.4%</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Các Host khác trong bán kính 500m</div>
                </div>

                <div style={{ background: "#0f172a", padding: "16px", borderRadius: 10, border: "1px solid #1e293b" }}>
                  <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.85rem" }}>TẦNG 3: AREA LEAD</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff", margin: "8px 0" }}>0%</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Trưởng khu vực phải can thiệp thủ công</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Dynamic Commission Engine */}
        {activeTab === "commissions" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "24px", maxWidth: 640 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
                ⚙️ Dynamic Commission & Incentive Engine
              </h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                Điều chỉnh trực tiếp mức thù lao biến phí (OpEx) theo từng giai đoạn thị trường/mùa vụ cao điểm và thấp điểm tại Ocean Park.
              </p>

              <form onSubmit={handleSaveCommission} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                    Thù lao dẫn phòng chuẩn (VNĐ / lượt)
                  </label>
                  <input
                    type="number"
                    value={tourFee}
                    onChange={(e) => setTourFee(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                    Mặc định: 80.000 VNĐ/lượt dẫn thành công.
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                    Hoa hồng chốt cọc giữ chỗ 24h (VNĐ / deal)
                  </label>
                  <input
                    type="number"
                    value={closingBonus}
                    onChange={(e) => setClosingBonus(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                    Mặc định: 500.000 VNĐ khi khách chuyển cọc 2TR VietQR.
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                    Thưởng nóng cuối tuần / cao điểm (VNĐ / 3 lượt)
                  </label>
                  <input
                    type="number"
                    value={weekendSurge}
                    onChange={(e) => setWeekendSurge(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      fontSize: "1rem",
                      fontWeight: 700,
                    }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                    Kích cầu CTV Field Host trực tại sảnh thứ 7 và chủ nhật.
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                    color: "#ffffff",
                    border: "none",
                    padding: "14px",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: "1rem",
                    cursor: "pointer",
                    marginTop: 8,
                    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  Lưu & Áp Dụng Ngay Toàn Hệ Thống
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
