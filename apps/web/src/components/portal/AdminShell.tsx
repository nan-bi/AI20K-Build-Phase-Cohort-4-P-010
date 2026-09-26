"use client";

import { Building2, Gauge, Radar, SlidersHorizontal, Users } from "lucide-react";
import { DEMO_USERS } from "@/lib/mock/auth";
import { useMock } from "@/lib/mock/store";
import { PortalShell } from "./PortalShell";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const state = useMock();
  const pendingCs = state.consignments.filter((c) => c.status === "pending").length;
  const pendingBk = state.bookings.filter((b) => b.status === "pending").length;
  const u = DEMO_USERS.admin;
  return (
    <PortalShell
      portal="Quản trị nền tảng"
      userName={u.name}
      userMeta="Operations Lead"
      nav={[
        { href: "/admin/dashboard", label: "Tổng quan", icon: Gauge },
        { href: "/admin/hosts", label: "Field Host", icon: Users },
        { href: "/admin/inventory", label: "Căn hộ & ký gửi", icon: Building2, badge: pendingCs },
        { href: "/admin/bookings", label: "Điều phối lịch xem", icon: Radar, badge: pendingBk },
        { href: "/admin/commission", label: "Biến phí Host", icon: SlidersHorizontal },
      ]}
    >
      {children}
    </PortalShell>
  );
}

