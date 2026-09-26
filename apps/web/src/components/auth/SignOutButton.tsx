"use client";

import { useState } from "react";

export function SignOutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      // Full navigation (not router.push): drops the client router cache so
      // guarded pages can't be served from it after signing out.
      window.location.assign(redirectTo);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      style={{
        marginTop: 24,
        padding: "10px 16px",
        fontSize: "0.9rem",
        fontWeight: 500,
        color: "var(--ink-text)",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        cursor: loading ? "default" : "pointer",
      }}
    >
      {loading ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
  );
}
