"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Tabs } from "@/components/auth/Tabs";
import { PortalAuth } from "@/components/auth/PortalAuth";
import { safeNext } from "@/lib/auth/portals";

type Tab = "host" | "admin";

/**
 * Internal login: Field Host (Google or email + password, no signup — Admin creates the account) and Admin
 * (email + password, no signup).
 */
export function AdminLoginTabs() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "admin" ? "admin" : "host");

  return (
    <AuthShell brandFoot="Nội bộ team P-010.">
      <Tabs
        tabs={[
          { id: "host", label: "Field Host" },
          { id: "admin", label: "Quản trị" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <PortalAuth
        key={tab}
        portal={tab}
        label={tab === "host" ? "Field Host" : "quản trị"}
        allowSignup={false}
        next={safeNext(searchParams.get("next"))}
        initialError={searchParams.get("tab") === tab ? searchParams.get("error") : null}
        initialNotice={
          searchParams.get("tab") === tab && searchParams.get("confirmed") === "1"
            ? "Email đã được xác nhận. Hãy đăng nhập."
            : null
        }
      />
      {tab === "host" && (
        <p style={{ marginTop: 24, fontSize: "0.82rem", color: "var(--slate)" }}>
          Tài khoản Field Host do Admin tạo. Chưa có tài khoản? Liên hệ Admin.
        </p>
      )}
    </AuthShell>
  );
}
