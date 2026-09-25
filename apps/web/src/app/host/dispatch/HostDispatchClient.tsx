"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface HostDispatchClientProps {
  userEmail: string;
}

interface DispatchTicket {
  id: string;
  code: string;
  building: string;
  unit: string;
  layout: string;
  guestName: string;
  guestPhoneMasked: string;
  scheduledTime: string;
  distanceMeters: number;
  slaSecondsLeft: number;
  status: "pending" | "accepted" | "at_lobby" | "in_unit" | "completed";
  doorPin?: string;
  tMinus10Triggered: boolean;
  guestAtLobby: boolean;
}

export function HostDispatchClient({ userEmail }: HostDispatchClientProps) {
  const [activeTab, setActiveTab] = useState<"dispatch" | "tours" | "handover" | "handyman" | "earnings">("dispatch");
  const [tickets, setTickets] = useState<DispatchTicket[]>([
    {
      id: "tk-101",
      code: "DISPATCH-VHOP-8821",
      building: "S2.05",
      unit: "Tầng 18 — Căn 1808",
      layout: "1PN+1 (48m²) Full nội thất",
      guestName: "Nguyễn Tuấn Linh",
      guestPhoneMasked: "0912***482 (Đã xác thực Zalo OTP)",
      scheduledTime: "14:30 (Còn 25 phút)",
      distanceMeters: 180,
      slaSecondsLeft: 142,
      status: "pending",
      tMinus10Triggered: true,
      guestAtLobby: false,
    },
    {
      id: "tk-102",
      code: "DISPATCH-VHOP-8822",
      building: "S1.08",
      unit: "Tầng 12 — Căn 1204",
      layout: "Studio (33m²) Đồ cơ bản BQL",
      guestName: "Trần Mai Phương",
      guestPhoneMasked: "0983***719 (Đã xác thực Zalo OTP)",
      scheduledTime: "16:00 Hôm nay",
      distanceMeters: 420,
      slaSecondsLeft: 180,
      status: "pending",
      tMinus10Triggered: false,
      guestAtLobby: false,
    },
    {
      id: "tk-103",
      code: "ACTIVE-VHOP-8819",
      building: "S2.03",
      unit: "Tầng 09 — Căn 0915",
      layout: "2PN+1 (64m²) View hồ San Hô",
      guestName: "Phạm Quốc Hưng",
      guestPhoneMasked: "0904***333 (Đã cọc 2TR VietQR)",
      scheduledTime: "Đang diễn ra",
      distanceMeters: 0,
      slaSecondsLeft: 0,
      status: "at_lobby",
      doorPin: "847291# (Hạn dùng 45 phút)",
      tMinus10Triggered: true,
      guestAtLobby: true,
    },
  ]);

  const [simulatedDoorUnlock, setSimulatedDoorUnlock] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Timer countdown for SLA
  useEffect(() => {
    const timer = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.status === "pending" && t.slaSecondsLeft > 0) {
            return { ...t, slaSecondsLeft: t.slaSecondsLeft - 1 };
          }
          return t;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAcceptTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "accepted" } : t))
    );
    showToast("Đã tiếp nhận Ticket thành công! SLA đạt chuẩn < 3 phút.");
  };

  const handleGuestArrived = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, guestAtLobby: true, status: "at_lobby" } : t))
    );
    showToast("Khách bấm Zalo 1-chạm xác nhận đã có mặt tại sảnh! Chuẩn bị đón.");
  };

  const handleRequestDoorCode = (ticketId: string) => {
    const generatedPin = `${Math.floor(100000 + Math.random() * 900000)}#`;
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status: "in_unit", doorPin: `${generatedPin} (Hết hạn sau 60 phút)` }
          : t
      )
    );
    setSimulatedDoorUnlock(generatedPin);
    showToast(`Mã cửa điện tử đã cấp tức thì qua App: ${generatedPin}. Chủ nhà không cần đến!`);
  };

  const pendingTickets = tickets.filter((t) => t.status === "pending");
  const activeTours = tickets.filter((t) => t.status !== "pending");

  return (
    <div style={{ minHeight: "100vh", background: "#0b131a", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      {/* Toast Alert */}
      {toastMessage && (
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
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            fontWeight: 600,
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Top Bar */}
      <header
        style={{
          background: "#131e29",
          borderBottom: "1px solid #1e2e3e",
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
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.2rem",
              color: "#0f172a",
            }}
          >
            FH
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>
                Field Host Dispatch Portal
              </h1>
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  border: "1px solid #059669",
                  padding: "2px 10px",
                  borderRadius: 20,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                ● ĐANG TRỰC NỘI KHU
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 2 }}>
              Phân khu S1 - S2 (VHOP1) | Host ID: <strong>FH-OCP-09</strong> ({userEmail})
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Elevator Card RFID Status */}
          <div
            style={{
              background: "#1c2a38",
              border: "1px solid #2d4257",
              padding: "8px 16px",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>🪪</span>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Thẻ cư dân thang máy RFID</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>
                S1.01 → S2.19 (Sẵn sàng)
              </div>
            </div>
          </div>

          <SignOutButton redirectTo="/admin/login" />
        </div>
      </header>

      {/* Hero Stats */}
      <div style={{ maxWidth: 1240, margin: "24px auto 0", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {/* Stat 1 */}
          <div
            style={{
              background: "#13212d",
              borderRadius: 14,
              padding: "18px 20px",
              border: "1px solid #1f3346",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Thu nhập tích lũy hôm nay
            </div>
            <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#34d399", marginTop: 6 }}>
              760.000 <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>VNĐ</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
              3 lượt dẫn (240k) + 1 cọc giữ chỗ 24h (500k) + bonus (20k)
            </div>
          </div>

          {/* Stat 2 */}
          <div
            style={{
              background: "#13212d",
              borderRadius: 14,
              padding: "18px 20px",
              border: "1px solid #1f3346",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              SLA Tiếp nhận Ticket
            </div>
            <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#38bdf8", marginTop: 6 }}>
              1 phút 48 giây
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
              Chuẩn Auto-Dispatch 3 tầng &lt; 3:00 phút
            </div>
          </div>

          {/* Stat 3 */}
          <div
            style={{
              background: "#13212d",
              borderRadius: 14,
              padding: "18px 20px",
              border: "1px solid #1f3346",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Tỷ lệ No-Show (Bỏ bom)
            </div>
            <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#a78bfa", marginTop: 6 }}>
              0%
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
              Nhờ xác thực Zalo OTP + thông báo nhắc kép T-10m
            </div>
          </div>

          {/* Stat 4 */}
          <div
            style={{
              background: "#13212d",
              borderRadius: 14,
              padding: "18px 20px",
              border: "1px solid #1f3346",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Chủ nhà mở cửa từ xa
            </div>
            <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#f59e0b", marginTop: 6 }}>
              100%
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
              Cấp PIN tức thì trên App khi Host tới cửa (Không lockbox)
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 24,
            borderBottom: "1px solid #1e2e3e",
            paddingBottom: 12,
            overflowX: "auto",
          }}
        >
          <button
            onClick={() => setActiveTab("dispatch")}
            style={{
              background: activeTab === "dispatch" ? "#0284c7" : "transparent",
              color: activeTab === "dispatch" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⚡ Radar Dispatch ({pendingTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tours")}
            style={{
              background: activeTab === "tours" ? "#0284c7" : "transparent",
              color: activeTab === "tours" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🚶 Lượt Dẫn & Mở Cửa ({activeTours.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("handover")}
            style={{
              background: activeTab === "handover" ? "#0284c7" : "transparent",
              color: activeTab === "handover" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            📋 Hộ Chiếu Bàn Giao Số (10 Mục)
          </button>

          <button
            onClick={() => setActiveTab("handyman")}
            style={{
              background: activeTab === "handyman" ? "#0284c7" : "transparent",
              color: activeTab === "handyman" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            🔧 Danh Bạ Thợ Ngoài (Asset-Light)
          </button>

          <button
            onClick={() => setActiveTab("earnings")}
            style={{
              background: activeTab === "earnings" ? "#0284c7" : "transparent",
              color: activeTab === "earnings" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            💰 Thù Lao & Thưởng Nóng
          </button>
        </div>

        {/* Tab 1: Dispatch Radar */}
        {activeTab === "dispatch" && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                background: "linear-gradient(90deg, rgba(2,132,199,0.1), rgba(16,185,129,0.05))",
                border: "1px solid #0369a1",
                padding: "16px 20px",
                borderRadius: 12,
                marginBottom: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: "1rem" }}>
                  📡 Thuật toán Auto-Dispatch 3 tầng đang quét trong bán kính 300m
                </div>
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 4 }}>
                  Tầng 1: Field Host gần nhất (3 phút) → Tầng 2: Open Pool phân khu (sau 3 phút) → Tầng 3: Area Lead can thiệp.
                </div>
              </div>
              <div
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                TỰ ĐỘNG LỌC NO-SHOW: 100% SĐT ĐÃ XÁC THỰC OTP
              </div>
            </div>

            {pendingTickets.length === 0 ? (
              <div
                style={{
                  background: "#13212d",
                  padding: 40,
                  borderRadius: 14,
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                Đang không có ticket chờ mới. Bạn đã tiếp nhận toàn bộ lịch hẹn.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                {pendingTickets.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: "#13212d",
                      border: "1px solid #23384c",
                      borderRadius: 14,
                      padding: "20px 24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 20,
                    }}
                  >
                    <div style={{ flex: "1 1 340px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span
                          style={{
                            background: "#dc2626",
                            color: "#ffffff",
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          SLA CÒN {Math.floor(t.slaSecondsLeft / 60)}:
                          {(t.slaSecondsLeft % 60).toString().padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>
                          Mã: {t.code}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "#38bdf8" }}>
                          📍 Cách bạn {t.distanceMeters}m
                        </span>
                      </div>

                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff" }}>
                        Tòa {t.building} — {t.unit}
                      </div>
                      <div style={{ fontSize: "0.95rem", color: "#cbd5e1", marginTop: 4 }}>
                        {t.layout} | Hẹn: <strong style={{ color: "#facc15" }}>{t.scheduledTime}</strong>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          background: "#0c1720",
                          padding: "10px 14px",
                          borderRadius: 8,
                          fontSize: "0.85rem",
                          display: "inline-block",
                        }}
                      >
                        👤 Khách thuê: <strong>{t.guestName}</strong> — {t.guestPhoneMasked}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
                      <button
                        onClick={() => handleAcceptTicket(t.id)}
                        style={{
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#ffffff",
                          border: "none",
                          padding: "14px 24px",
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: "1rem",
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                        }}
                      >
                        ✓ Tiếp Nhận Ticket (80k)
                      </button>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center" }}>
                        +500k nếu khách chốt cọc giữ chỗ 24h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Active Tours & Door Unlock */}
        {activeTab === "tours" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
              {activeTours.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "#13212d",
                    border: "1px solid #23384c",
                    borderRadius: 14,
                    padding: "24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid #1e2e3e",
                      paddingBottom: 16,
                      marginBottom: 16,
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: "0.8rem",
                          fontWeight: 700,
                        }}
                      >
                        {t.status === "in_unit"
                          ? "ĐANG TRONG PHÒNG"
                          : t.guestAtLobby
                          ? "KHÁCH ĐÃ ĐẾN SẢNH"
                          : "ĐÃ NHẬN LỊCH — CHUẨN BỊ"}
                      </span>
                      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "10px 0 4px 0", color: "#ffffff" }}>
                        Tòa {t.building} — {t.unit}
                      </h2>
                      <div style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                        Khách: <strong>{t.guestName}</strong> ({t.guestPhoneMasked})
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Lịch hẹn xem phòng</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#facc15" }}>
                        {t.scheduledTime}
                      </div>
                    </div>
                  </div>

                  {/* Flow 4 bước thực địa */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 14,
                      marginBottom: 20,
                    }}
                  >
                    {/* Bước 1: Zalo T-10m */}
                    <div
                      style={{
                        background: "#0d1822",
                        padding: 14,
                        borderRadius: 10,
                        border: "1px solid #1f3346",
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 700 }}>
                        BƯỚC 1: NHẮC HẸN KÉP T-10M
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 6 }}>
                        Hệ thống tự gửi tin Zalo kèm nút 1-chạm & thông báo Host xuống sảnh.
                      </div>
                      <div style={{ marginTop: 10 }}>
                        {t.guestAtLobby ? (
                          <span style={{ color: "#34d399", fontWeight: 700, fontSize: "0.85rem" }}>
                            ✓ Khách đã bấm xác nhận có mặt
                          </span>
                        ) : (
                          <button
                            onClick={() => handleGuestArrived(t.id)}
                            style={{
                              background: "#0284c7",
                              color: "#ffffff",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                          >
                            Mô phỏng khách bấm "Đã tới sảnh"
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bước 2: Thẻ RFID thang máy */}
                    <div
                      style={{
                        background: "#0d1822",
                        padding: 14,
                        borderRadius: 10,
                        border: "1px solid #1f3346",
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 700 }}>
                        BƯỚC 2: QUẸT THẺ THANG MÁY
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 6 }}>
                        Host có sẵn thẻ cư dân nội khu, quẹt đưa khách lên tầng trong 60s.
                      </div>
                      <div style={{ marginTop: 10, color: "#34d399", fontSize: "0.85rem", fontWeight: 600 }}>
                        ✓ Không cần "đi ké", không dán QR sảnh
                      </div>
                    </div>

                    {/* Bước 3: Cấp mã cửa điện tử tức thì */}
                    <div
                      style={{
                        background: "#0d1822",
                        padding: 14,
                        borderRadius: 10,
                        border: "1px solid #1f3346",
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", color: "#f59e0b", fontWeight: 700 }}>
                        BƯỚC 3: MÃ CỬA TỨC THÌ
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 6 }}>
                        Chủ nhà ở nhà 100%. Khi tới trước cửa, Host bấm cấp mã trên App.
                      </div>
                      <div style={{ marginTop: 10 }}>
                        {t.doorPin ? (
                          <div
                            style={{
                              background: "#1e293b",
                              padding: "6px 10px",
                              borderRadius: 6,
                              color: "#38bdf8",
                              fontWeight: 800,
                              fontSize: "0.95rem",
                              letterSpacing: 1,
                            }}
                          >
                            🔑 PIN: {t.doorPin}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRequestDoorCode(t.id)}
                            style={{
                              background: "linear-gradient(135deg, #f59e0b, #d97706)",
                              color: "#ffffff",
                              border: "none",
                              padding: "8px 14px",
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                          >
                            🚪 Đã Tới Cửa → Nhận Mã PIN
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bước 4: Hướng dẫn cọc giữ chỗ */}
                    <div
                      style={{
                        background: "#0d1822",
                        padding: 14,
                        borderRadius: 10,
                        border: "1px solid #1f3346",
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 700 }}>
                        BƯỚC 4: CHỐT CỌC GIỮ CHỖ 24H
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: 6 }}>
                        Khách ưng ý quét VietQR động 2TR → Khóa holding căn trên hệ thống.
                      </div>
                      <div style={{ marginTop: 10, color: "#facc15", fontSize: "0.85rem", fontWeight: 700 }}>
                        Thưởng nóng ngay: +500.000 VNĐ
                      </div>
                    </div>
                  </div>

                  {/* Anti-Lockbox warning badge */}
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid #991b1b",
                      padding: "10px 16px",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      color: "#fca5a5",
                    }}
                  >
                    ⚠️ <strong>Nguyên tắc BQL Vinhomes:</strong> Tuyệt đối KHÔNG gắn hộp Lockbox treo ngoài cửa (vi phạm quy chế an ninh tòa nhà). Mã PIN điện tử được sinh động và cấp trực tiếp qua App khi Host xác nhận đã có mặt.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Digital Handover Passport (10 items) */}
        {activeTab === "handover" && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                background: "#13212d",
                border: "1px solid #23384c",
                borderRadius: 14,
                padding: "24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
                    Hộ Chiếu Bàn Giao Số — Digital Handover Passport
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                    Kiểm định 10 hạng mục nội thất trọng yếu kèm Timestamp + Geofence GPS. Bảo vệ trọn vẹn tiền cọc của chủ nhà & bảo vệ khách khỏi tranh chấp hao mòn tự nhiên.
                  </p>
                </div>
                <span
                  style={{
                    background: "rgba(16,185,129,0.2)",
                    color: "#34d399",
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontWeight: 700,
                    fontSize: "0.8rem",
                  }}
                >
                  ÁP DỤNG CĂN S2.05-1808
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {[
                  { id: 1, name: "1. Cửa chính & Khóa vân tay Hafele", status: "Hoàn hảo (98%)", proof: "Ảnh GPS + Timestamp 2026-09-25 09:12" },
                  { id: 2, name: "2. Sàn gỗ công nghiệp An Cường", status: "Không xước, nguyên bản", proof: "Ảnh đối soát 4 góc phòng" },
                  { id: 3, name: "3. Tường & Nước sơn Dulux", status: "Sạch sẽ, không ố mốc", proof: "Kiểm định đạt chuẩn BQL" },
                  { id: 4, name: "4. Sofa da Ý phòng khách", status: "Nguyên vẹn, không rách", proof: "Ảnh chụp macro bề mặt da" },
                  { id: 5, name: "5. Điều hòa Daikin 2 chiều Inverter (2 cái)", status: "Mát sâu, lưới lọc sạch", proof: "Video test nhiệt độ gió 18°C" },
                  { id: 6, name: "6. Tủ lạnh 2 cánh Samsung Inverter", status: "Hoạt động êm, không mùi", proof: "Ảnh khay chứa + ngăn đông" },
                  { id: 7, name: "7. Bếp từ Bosch & Hút mùi Malloca", status: "Gia nhiệt tốt, mặt kính bóng", proof: "Ảnh kiểm tra mặt bếp không nứt" },
                  { id: 8, name: "8. Bộ rèm cửa chống nắng 2 lớp", status: "Sạch sẽ, ray trượt êm", proof: "Ảnh kéo rèm kín sáng" },
                  { id: 9, name: "9. Giường + Nệm lò xo túi 1.8m", status: "Bọc ga bảo vệ chống thấm", proof: "Ảnh kiểm tra đệm không lún" },
                  { id: 10, name: "10. Thiết bị vệ sinh & Vòi sen Toto", status: "Áp lực nước mạnh, không rỉ", proof: "Video test xả nước áp lực" },
                ].map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#0c1720",
                      border: "1px solid #1e2e3e",
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.95rem" }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#34d399", marginTop: 4, fontWeight: 600 }}>
                      ● {item.status}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                      📷 {item.proof}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Asset-Light Handyman Referral */}
        {activeTab === "handyman" && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                background: "#13212d",
                border: "1px solid #23384c",
                borderRadius: 14,
                padding: "24px",
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
                  Danh Bạ Thợ Kỹ Thuật Ngoài — Tinh Gọn (Asset-Light)
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                  VinStay AI và Field Host <strong>TUYỆT ĐỐI KHÔNG làm tổng thầu sửa chữa</strong>, không ôm bộ máy bảo trì cồng kềnh. Field Host chỉ giới thiệu danh bạ thợ uy tín tại Ocean Park; khách thuê và thợ tự thỏa thuận chi phí trực tiếp.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                {[
                  { name: "Kỹ thuật Điện lạnh Ocean Park (Anh Nam)", phone: "0915.228.*** (S1.06)", skill: "Bảo dưỡng điều hòa Daikin, nạp ga, vệ sinh máy giặt", rating: "4.9/5 (142 lượt)" },
                  { name: "Sửa khóa thông minh & Thẻ từ (Anh Tuấn)", phone: "0988.314.*** (S2.12)", skill: "Khóa vân tay Kaadas, Hafele, thay pin, xử lý kẹt cửa", rating: "5.0/5 (89 lượt)" },
                  { name: "Thợ Điện nước & Vệ sinh vòi sen (Bác Hùng)", phone: "0904.719.*** (S2.03)", skill: "Sửa chập điện, thông tắc lavabo, chống thấm ban công", rating: "4.8/5 (210 lượt)" },
                  { name: "Giặt sấy Sofa da & Nệm hơi chuyên sâu", phone: "0972.109.*** (S1.10)", skill: "Làm sạch nấm mốc, dưỡng bóng da sofa, khử mùi thú cưng", rating: "4.9/5 (95 lượt)" },
                ].map((hm, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#0c1720",
                      border: "1px solid #1e2e3e",
                      borderRadius: 10,
                      padding: "16px",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "1rem" }}>{hm.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "#38bdf8", marginTop: 4 }}>📍 {hm.phone}</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 6 }}>{hm.skill}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid #1a2a3a" }}>
                      <span style={{ fontSize: "0.8rem", color: "#facc15", fontWeight: 700 }}>★ {hm.rating}</span>
                      <button
                        onClick={() => showToast(`Đã chia sẻ thông tin ${hm.name} cho khách thuê qua Zalo!`)}
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Gửi SĐT cho Khách
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Dynamic Commission & Earnings */}
        {activeTab === "earnings" && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                background: "#13212d",
                border: "1px solid #23384c",
                borderRadius: 14,
                padding: "24px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
                Chính Sách Thù Lao & Thưởng Nóng Field Host (Dynamic Incentive)
              </h3>
              <p style={{ margin: "4px 0 20px 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                Cấu hình trực tiếp từ Admin Portal theo mùa vụ. Thanh toán định kỳ mỗi thứ 6 hàng tuần qua chuyển khoản tự động.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                <div style={{ background: "#0c1720", padding: 18, borderRadius: 12, border: "1px solid #1e2e3e" }}>
                  <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.9rem" }}>THÙ LAO DẪN PHÒNG CHUẨN</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ffffff", margin: "8px 0" }}>
                    80.000 <span style={{ fontSize: "0.9rem" }}>VNĐ / lượt</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Điều kiện: Đón đúng giờ tại sảnh, quẹt thẻ thang máy, mở cửa giải thích chi phí All-in.
                  </div>
                </div>

                <div style={{ background: "#0c1720", padding: 18, borderRadius: 12, border: "1px solid #1e2e3e" }}>
                  <div style={{ color: "#34d399", fontWeight: 700, fontSize: "0.9rem" }}>HOA HỒNG CHỐT CỌC GIỮ CHỖ</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#34d399", margin: "8px 0" }}>
                    500.000 <span style={{ fontSize: "0.9rem" }}>VNĐ / deal</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Áp dụng khi khách chuyển cọc 2.000.000đ giữ chỗ 24h qua VietQR động ngay sau khi xem.
                  </div>
                </div>

                <div style={{ background: "#0c1720", padding: 18, borderRadius: 12, border: "1px solid #1e2e3e" }}>
                  <div style={{ color: "#facc15", fontWeight: 700, fontSize: "0.9rem" }}>THƯỞNG NÓNG CUỐI TUẦN</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#facc15", margin: "8px 0" }}>
                    +100.000 <span style={{ fontSize: "0.9rem" }}>VNĐ / 3 lượt</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    Kích hoạt vào Thứ 7 & Chủ Nhật khung giờ cao điểm 09:00 - 18:00.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
