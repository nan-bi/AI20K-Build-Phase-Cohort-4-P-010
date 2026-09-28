"use client";

import { BookOpenText, ClipboardCheck, Radio, UserRound, Wallet } from "lucide-react";
import { DEMO_USERS, loginUrl } from "@/lib/mock/auth";
import { useMock } from "@/lib/mock/store";
import { HostSideTools } from "@/components/host/HostSideTools";
import { PortalShell } from "./PortalShell";

export function HostShell({ children }: { children: React.ReactNode }) {
  const state = useMock();
  const u = DEMO_USERS.host;
  const pending = state.bookings.filter((b) => b.hostId === u.refId && b.status === "pending").length;
  const awaitingInspect = state.consignments.filter(
    (c) => c.hostId === u.refId && c.status === "awaiting_host",
  ).length;

  return (
    <PortalShell
      portal="Cổng Field Host"
      userName={u.name}
      userMeta="Field Host · Sapphire 1 & 2"
      signOutHref={loginUrl("host")}
      sideSlot={<HostSideTools />}
      nav={[
        {
          href: "/host/dispatch",
          label: "Lịch & yêu cầu",
          icon: Radio,
          badge: pending > 0 ? pending : undefined,
          match: ["/host/viewing"],
        },
        {
          href: "/host/inspections",
          label: "Thẩm định ký gửi",
          icon: ClipboardCheck,
          badge: awaitingInspect > 0 ? awaitingInspect : undefined,
        },
        { href: "/host/earnings", label: "Thu nhập", icon: Wallet },
        { href: "/host/handbook", label: "Sổ tay phân khu", icon: BookOpenText },
        { href: "/host/account", label: "Tài khoản", icon: UserRound },
      ]}
    >
      {children}
    </PortalShell>
  );
}
