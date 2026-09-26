"use client";

import { Banknote, FilePlus2, LayoutDashboard } from "lucide-react";
import { DEMO_USERS } from "@/lib/mock/auth";
import { useMock } from "@/lib/mock/store";
import { PortalShell } from "./PortalShell";

export function LandlordShell({ children }: { children: React.ReactNode }) {
  const state = useMock();
  const u = DEMO_USERS.landlord;
  const draft = state.consignments.filter((c) => c.landlordId === u.refId && c.status === "draft").length;
  return (
    <PortalShell
      portal="Cổng chủ nhà"
      userName={u.name}
      userMeta="Ký gửi độc quyền"
      nav={[
        { href: "/landlord/dashboard", label: "Tổng quan", icon: LayoutDashboard, badge: draft },
        { href: "/landlord/finance", label: "Khoản thu", icon: Banknote },
        { href: "/landlord/consign", label: "Ký gửi căn mới", icon: FilePlus2 },
      ]}
    >
      {children}
    </PortalShell>
  );
}
