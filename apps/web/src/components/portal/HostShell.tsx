"use client";

import { BookOpenText, ClipboardCheck, Radio, UserRound, Wallet } from "lucide-react";
import { loginPathFor } from "@/lib/auth/portals";
import { useSession } from "@/lib/auth/client";
import type { HostRoleCode } from "@/lib/auth/portals";
import { HostSideTools } from "@/components/host/HostSideTools";
import { PhoneVerifyBanner } from "@/components/host/PhoneVerifyBanner";
import { useHostBoard } from "@/lib/host/api";
import { useInspectionBoard } from "@/lib/inspection/api";
import { boardBadge } from "@/lib/inspection/logic";
import { PortalShell, type PortalNavItem } from "./PortalShell";

export function hostNavItems(
  roles: HostRoleCode[],
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
  const session = useSession();
  // Vai lấy từ phiên thật (Admin gán ở /admin/hosts); chưa tải xong phiên ⇒ chưa hiện menu theo vai.
  const roles: HostRoleCode[] = session.user?.hostRoles ?? [];

  // Badge "Lịch & yêu cầu" = số yêu cầu mới thật từ `GET /host/board` (chỉ gọi khi có vai Sale). Badge Thẩm định =
  // `mine + open` từ `GET /host/inspections` (chỉ gọi khi có vai Thẩm định; poll 30 giây ở đây, InspectionList dùng chung khoá).
  const isSale = roles.includes("sale");
  const board = useHostBoard(isSale, true); // MỘT nơi duy nhất poll bảng; DispatchBoard/HostSideTools dùng chung khoá
  const pending = isSale && board.state.status === "ready" ? board.state.data.kpis.pending : 0;
  const isInspector = roles.includes("inspector");
  const inspections = useInspectionBoard(isInspector, true);
  const awaitingInspect = isInspector && inspections.state.status === "ready" ? boardBadge(inspections.state.data) : 0;

  const roleText = roles.map((r) => (r === "sale" ? "Sale" : "Thẩm định")).join(" + ");
  const userMeta = session.ready ? `Field Host · ${roleText || "Chưa gán vai"}` : "Field Host";

  const nav = hostNavItems(roles, { pending, awaitingInspect });

  return (
    <PortalShell
      portal="Cổng Field Host"
      userName={session.user?.fullName ?? session.user?.email ?? (session.ready ? "Tài khoản" : "Đang tải…")}
      userMeta={userMeta}
      signOutHref={loginPathFor("host")}
      sideSlot={<HostSideTools sale={isSale} />}
      nav={nav}
    >
      <PhoneVerifyBanner />
      {children}
    </PortalShell>
  );
}
