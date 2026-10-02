"use client";

import { Banknote, Building2, DoorOpen, FilePlus2, LayoutDashboard, UserCircle2 } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { DEMO_USERS } from "@/lib/mock/actors";
import { landlordConsignments } from "@/lib/mock/selectors-landlord";
import { useMock } from "@/lib/mock/store";
import { PortalShell } from "./PortalShell";

export function LandlordShell({ children }: { children: React.ReactNode }) {
  const state = useMock();
  const session = useSession();
  const u = DEMO_USERS.landlord;
  const draft = landlordConsignments(state, u.refId!).filter((c) => c.status === "draft").length;
  return (
    <PortalShell
      portal="Cổng chủ nhà"
      userName={session.user?.fullName ?? session.user?.email ?? u.name}
      userMeta="Ký gửi độc quyền"
      nav={[
        { href: "/landlord/dashboard", label: "Tổng quan", icon: LayoutDashboard, badge: draft },
        { href: "/landlord/units", label: "Căn hộ", icon: Building2 },
        { href: "/landlord/finance", label: "Khoản thu", icon: Banknote },
        { href: "/landlord/consign", label: "Ký gửi căn mới", icon: FilePlus2 },
        { href: "/landlord/exit-request", label: "Thoát uỷ quyền", icon: DoorOpen },
        { href: "/landlord/account", label: "Tài khoản", icon: UserCircle2 },
      ]}
    >
      {children}
    </PortalShell>
  );
}
