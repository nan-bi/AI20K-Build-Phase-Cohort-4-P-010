"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Tabs } from "@/components/auth/Tabs";
import { PortalAuth } from "@/components/auth/PortalAuth";
import { safeNext } from "@/lib/auth/portals";

type Tab = "tenant" | "landlord";

/** Public login/signup: Tenant and Landlord. Field Host / Admin use /admin/login. */
export function LoginTabs() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "landlord" ? "landlord" : "tenant");

  return (
    <AuthShell brandFoot="Nhân viên vận hành? Đăng nhập tại /admin/login.">
      <Tabs
        tabs={[
          { id: "tenant", label: "Khách thuê" },
          { id: "landlord", label: "Chủ nhà" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {/* key: reset the form state when switching tabs */}
      <PortalAuth
        key={tab}
        portal={tab}
        next={safeNext(searchParams.get("next"))}
        label={tab === "tenant" ? "khách thuê" : "chủ nhà"}
        initialError={searchParams.get("tab") === tab ? searchParams.get("error") : null}
        initialNotice={
          searchParams.get("tab") === tab && searchParams.get("confirmed") === "1"
            ? "Email đã được xác nhận. Hãy đăng nhập."
            : null
        }
      />
    </AuthShell>
  );
}
