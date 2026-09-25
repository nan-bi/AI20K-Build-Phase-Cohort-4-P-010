"use client";

import React, { useState, useEffect } from "react";
import { GoogleMark } from "./GoogleMark";

export interface GoogleAccount {
  name: string;
  email: string;
  avatarColor?: string;
  lastUsed?: string;
  boundPortal?: "tenant" | "landlord" | "host" | "admin";
}

interface GoogleAccountChooserProps {
  portal: "tenant" | "landlord" | "host" | "admin";
  portalLabel: string;
  onSelect: (account: GoogleAccount) => void;
  onClose: () => void;
}

const STORAGE_KEY = "vinstay_google_saved_accounts";

const PORTAL_NAMES: Record<string, string> = {
  tenant: "Khách thuê",
  landlord: "Chủ nhà",
  host: "Field Host",
  admin: "Quản trị viên",
};

export function GoogleAccountChooser({
  portal,
  portalLabel,
  onSelect,
  onClose,
}: GoogleAccountChooserProps) {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);

  // Load saved accounts from browser localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          return;
        }
      }
    } catch {
      // fallback
    }

    // Default accounts with predefined roles for clear demonstration
    const defaultAccounts: GoogleAccount[] = [
      {
        name: "Nguyễn Tuấn Linh (Chủ Nhà Ocean Park)",
        email: "tuanlinh.chunha@gmail.com",
        avatarColor: "#EA4335",
        lastUsed: "Đã lưu trên máy",
        boundPortal: "landlord",
      },
      {
        name: "Trần Mai Phương (Khách Thuê)",
        email: "maiphuong.khachthue@gmail.com",
        avatarColor: "#4285F4",
        lastUsed: "Đã lưu trên máy",
        boundPortal: "tenant",
      },
    ];
    setAccounts(defaultAccounts);
  }, []);

  const handleAccountClick = (account: GoogleAccount) => {
    setMismatchWarning(null);

    // KIỂM TRA PHÂN QUYỀN CHẶT CHẼ:
    // Nếu tài khoản Google này đã được gán cho vai trò khác (ví dụ: Chủ nhà mà đang đăng nhập ở tab Khách thuê)
    if (account.boundPortal && account.boundPortal !== portal) {
      const boundRoleName = PORTAL_NAMES[account.boundPortal] || account.boundPortal;
      const currentRoleName = PORTAL_NAMES[portal] || portal;
      setMismatchWarning(
        `⛔ Tài khoản Google "${account.email}" đã được đăng ký với vai trò "${boundRoleName}". Không thể đăng nhập vào cổng "${currentRoleName}". Mỗi tài khoản Google chỉ được gắn với một vai trò duy nhất.`
      );
      return;
    }

    // Cập nhật vai trò cố định cho tài khoản
    const updatedAccount: GoogleAccount = {
      ...account,
      boundPortal: portal,
      lastUsed: "Vừa sử dụng",
    };

    try {
      const updatedList = [
        updatedAccount,
        ...accounts.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase()),
      ].slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }

    onSelect(updatedAccount);
  };

  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) return;

    const emailClean = newEmail.trim().toLowerCase();

    // Kiểm tra xem email này đã tồn tại với vai trò khác chưa
    const existing = accounts.find((a) => a.email.toLowerCase() === emailClean);
    if (existing && existing.boundPortal && existing.boundPortal !== portal) {
      const boundRoleName = PORTAL_NAMES[existing.boundPortal] || existing.boundPortal;
      const currentRoleName = PORTAL_NAMES[portal] || portal;
      setMismatchWarning(
        `⛔ Tài khoản Google "${emailClean}" đã được gắn với vai trò "${boundRoleName}". Không thể sử dụng để đăng nhập vào cổng "${currentRoleName}".`
      );
      return;
    }

    const name = newName.trim() || emailClean.split("@")[0];
    const newAcc: GoogleAccount = {
      name,
      email: emailClean,
      avatarColor: "#34A853",
      lastUsed: "Vừa đăng nhập",
      boundPortal: portal,
    };

    handleAccountClick(newAcc);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#ffffff",
          borderRadius: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)",
          overflow: "hidden",
          color: "#1f1f1f",
          fontFamily: "'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
          animation: "fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "26px 28px 14px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <GoogleMark />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 500, margin: "0 0 6px 0", color: "#1f1f1f" }}>
            Đăng nhập bằng Google
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#444746" }}>
            Chọn tài khoản để tiếp tục đến <strong style={{ color: "#1a73e8" }}>VinStay AI</strong>
          </p>
          <div
            style={{
              display: "inline-block",
              marginTop: 8,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "4px 12px",
              borderRadius: 14,
              fontSize: "0.8rem",
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            Đang đăng nhập cổng: {portalLabel}
          </div>
        </div>

        {/* Mismatch Warning Alert if clicked an account bound to another role */}
        {mismatchWarning && (
          <div
            style={{
              margin: "8px 24px 12px",
              padding: "12px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              color: "#991b1b",
              fontSize: "0.83rem",
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Không thể đăng nhập chéo vai trò!</div>
            <div>{mismatchWarning}</div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: "#e0e2ec", margin: "4px 0" }} />

        {/* Accounts List */}
        {!isAddingNew ? (
          <div style={{ padding: "6px 0" }}>
            {accounts.map((acc, index) => {
              const initial = (acc.name?.[0] || acc.email[0]).toUpperCase();
              const isDifferentRole = acc.boundPortal && acc.boundPortal !== portal;

              return (
                <div
                  key={index}
                  onClick={() => handleAccountClick(acc)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 24px",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    borderBottom: index < accounts.length - 1 ? "1px solid #f1f3f4" : "none",
                    opacity: isDifferentRole ? 0.75 : 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isDifferentRole ? "#fef2f2" : "#f8f9fa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: acc.avatarColor || "#4285F4",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      flexShrink: 0,
                    }}
                  >
                    {initial}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.93rem",
                        color: "#1f1f1f",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {acc.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#5f6368",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {acc.email}
                    </div>
                    {acc.boundPortal && (
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: isDifferentRole ? "#dc2626" : "#059669",
                        }}
                      >
                        {isDifferentRole
                          ? `🔒 Khóa vai trò: ${PORTAL_NAMES[acc.boundPortal]} (Không thể vào ${portalLabel})`
                          : `✓ Vai trò: ${PORTAL_NAMES[acc.boundPortal]}`}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: isDifferentRole ? "#dc2626" : "#1a73e8",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {isDifferentRole ? "Bị chặn" : "Chọn"}
                  </div>
                </div>
              );
            })}

            {/* Option: Add another account */}
            <div
              onClick={() => {
                setMismatchWarning(null);
                setIsAddingNew(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 24px",
                cursor: "pointer",
                borderTop: "1px solid #e0e2ec",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f9fa")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "1px dashed #747775",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                  color: "#444746",
                  flexShrink: 0,
                }}
              >
                +
              </div>
              <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "#1f1f1f" }}>
                Sử dụng một tài khoản Google khác...
              </div>
            </div>
          </div>
        ) : (
          /* Add Another Google Account Form */
          <form onSubmit={handleAddNewAccount} style={{ padding: "16px 26px" }}>
            <div style={{ fontSize: "0.9rem", color: "#444746", marginBottom: 14 }}>
              Nhập email Google của bạn để đăng ký vai trò <strong>{portalLabel}</strong>:
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#444746", marginBottom: 4 }}>
                Địa chỉ Gmail
              </label>
              <input
                type="email"
                required
                autoFocus
                placeholder="vidu@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #747775",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#444746", marginBottom: 4 }}>
                Họ và tên hiển thị (tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Tên của bạn"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #747775",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setMismatchWarning(null);
                  setIsAddingNew(false);
                }}
                style={{
                  background: "transparent",
                  color: "#1a73e8",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Quay lại
              </button>
              <button
                type="submit"
                style={{
                  background: "#1a73e8",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: 20,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              >
                Xác nhận & Đăng nhập
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            background: "#f8f9fa",
            borderTop: "1px solid #e0e2ec",
            fontSize: "0.76rem",
            color: "#5f6368",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Khóa vai trò 1-1 bảo vệ phân quyền</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#5f6368",
              cursor: "pointer",
              fontSize: "0.76rem",
              textDecoration: "underline",
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
