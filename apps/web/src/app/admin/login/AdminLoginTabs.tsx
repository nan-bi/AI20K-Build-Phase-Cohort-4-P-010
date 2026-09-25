"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Tabs } from "@/components/auth/Tabs";
import { PortalAuth } from "@/components/auth/PortalAuth";
import { RfidVerifyStep } from "@/components/auth/RfidVerifyStep";

type Tab = "host" | "admin";

/**
 * Internal login: Field Host (Google or email + password) and Admin
 * (email + password, no signup). Host must verify RFID on first login.
 */
export function AdminLoginTabs() {
  const searchParams = useSearchParams();
  const rfidPending = searchParams.get("rfidPending");
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "admin" ? "admin" : "host");

  if (rfidPending) {
    return (
      <AuthShell brandFoot="Nội bộ team P-010.">
        <RfidVerifyStep hostId={rfidPending} onDone={() => {}} />
      </AuthShell>
    );
  }

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
        initialError={searchParams.get("tab") === tab ? searchParams.get("error") : null}
      />
      {tab === "host" && (
        <p style={{ marginTop: 24, fontSize: "0.82rem", color: "var(--slate)" }}>
          Chỉ email đã được Admin thêm vào danh sách Field Host mới đăng ký được.
        </p>
      )}
    </AuthShell>
  );
}
