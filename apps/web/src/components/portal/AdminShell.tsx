"use client";

import { Building2, FileSignature, Gauge, Radar, Settings, SlidersHorizontal, Users } from "lucide-react";
import { loginPathFor } from "@/lib/auth/portals";
import { useSession } from "@/lib/auth/client";
import { PortalShell } from "./PortalShell";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  return (
    <PortalShell
      portal="Quản trị nền tảng"
      userName={session.user?.fullName ?? session.user?.email ?? (session.ready ? "Tài khoản" : "Đang tải…")}
      userMeta={session.user?.portal ?? "Quản trị"}
      signOutHref={loginPathFor("admin")}
      nav={[
        { href: "/admin/dashboard", label: "Tổng quan", icon: Gauge },
        { href: "/admin/inventory", label: "Căn hộ & ký gửi", icon: Building2 },
        { href: "/admin/bookings", label: "Điều phối lịch xem", icon: Radar },
        { href: "/admin/contracts", label: "Hợp đồng", icon: FileSignature },
        { href: "/admin/hosts", label: "Field Host", icon: Users },
        { href: "/admin/commission", label: "Biến phí Host", icon: SlidersHorizontal },
        { href: "/admin/settings", label: "Cài đặt", icon: Settings },
      ]}
    >
      {children}
    </PortalShell>
  );
}
