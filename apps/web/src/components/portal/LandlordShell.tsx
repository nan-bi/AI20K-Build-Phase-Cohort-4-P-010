"use client";

import { useEffect } from "react";
import { Banknote, Building2, DoorOpen, FilePlus2, LayoutDashboard, UserCircle2 } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { queries } from "@/lib/landlord/queries";
import { setLandlordCacheOwner, useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import { LandlordPhoneBanner } from "@/components/landlord/LandlordPhoneBanner";
import { PortalShell } from "./PortalShell";

export function LandlordShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const consignments = useLandlordQuery(queries.consignments);
  // Cache dữ liệu chủ nhà gắn với người đang đăng nhập; đổi tài khoản thì bỏ cache cũ.
  const userId = session.user?.id;
  useEffect(() => setLandlordCacheOwner(userId), [userId]);
  // Số hồ sơ ký gửi còn nháp (chưa ký) hiện trên mục "Tổng quan"; chưa tải xong thì không hiện số.
  const draft = consignments.state.status === "ready" ? consignments.state.data.filter((c) => c.status === "draft").length : 0;
  return (
    <PortalShell
      portal="Cổng chủ nhà"
      userName={session.user?.fullName ?? session.user?.email ?? "Chủ nhà"}
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
      <LandlordPhoneBanner />
      {children}
    </PortalShell>
  );
}
