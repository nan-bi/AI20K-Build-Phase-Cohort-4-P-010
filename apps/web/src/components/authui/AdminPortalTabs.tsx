"use client";

import { useState } from "react";
import { AdminLoginForm } from "./AdminLoginForm";
import { HostLoginForm } from "./HostLoginForm";
import { PortalTabs } from "./PortalTabs";

type AdminTab = "sale" | "admin";

interface AdminPortalTabsProps {
  initialTab?: AdminTab;
}

export function AdminPortalTabs({ initialTab }: AdminPortalTabsProps) {
  const [tab, setTab] = useState<AdminTab>(initialTab ?? "sale");

  return (
    <>
      <PortalTabs
        tabs={[
          { id: "sale", label: "Sale" },
          { id: "admin", label: "Quản trị" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "sale" ? <HostLoginForm /> : <AdminLoginForm />}
    </>
  );
}
