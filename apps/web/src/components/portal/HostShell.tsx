"use client";

import { BookOpenText, ClipboardCheck, Radio, UserRound, Wallet } from "lucide-react";
import { loginPathFor } from "@/lib/auth/portals";
import { useSession } from "@/lib/auth/client";
import { DEMO_USERS } from "@/lib/mock/actors";
import { hostRoles } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { HostRole } from "@/lib/mock/units";
import { HostSideTools } from "@/components/host/HostSideTools";
import { PortalShell, type PortalNavItem } from "./PortalShell";

export function hostNavItems(
  roles: HostRole[],
  badges: { pending: number; awaitingInspect: number },
): PortalNavItem[] {
  const items: PortalNavItem[] = [];

  if (roles.includes("sale")) {
    items.push({
      href: "/host/dispatch",
      label: "Lịch & yêu cầu",
      icon: Radio,
      badge: badges.pending > 0 ? badges.pending : undefined,
      match: ["/host/viewing"],
    });
  }

  if (roles.includes("inspector")) {
    items.push({
      href: "/host/inspections",
      label: "Thẩm định ký gửi",
      icon: ClipboardCheck,
      badge: badges.awaitingInspect > 0 ? badges.awaitingInspect : undefined,
    });
  }

  items.push(
    { href: "/host/earnings", label: "Thu nhập", icon: Wallet },
    { href: "/host/handbook", label: "Sổ tay phân khu", icon: BookOpenText },
    { href: "/host/account", label: "Tài khoản", icon: UserRound },
  );

  return items;
}

export function HostShell({ children }: { children: React.ReactNode }) {
  const state = useMock();
  const session = useSession();
  const u = DEMO_USERS.host;
  const hostId = u.refId!;
  const roles = hostRoles(state, hostId);

  const pending = state.bookings.filter((b) => b.hostId === hostId && b.status === "pending").length;
  const awaitingInspect = state.consignments.filter(
    (c) => c.hostId === hostId && c.status === "awaiting_host",
  ).length;

  const roleText = roles.map((r) => (r === "sale" ? "Sale" : "Thẩm định")).join(" + ");
  const userMeta = `Field Host · ${roleText || "Chưa gán vai"}`;

  const nav = hostNavItems(roles, { pending, awaitingInspect });

  return (
    <PortalShell
      portal="Cổng Field Host"
      userName={session.user?.fullName ?? session.user?.email ?? u.name}
      userMeta={userMeta}
      signOutHref={loginPathFor("host")}
      sideSlot={<HostSideTools />}
      nav={nav}
    >
      {children}
    </PortalShell>
  );
}
