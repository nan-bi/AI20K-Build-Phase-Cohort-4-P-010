"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "@/lib/auth/client";
import type { HostRoleCode as HostRole } from "@/lib/auth/portals";

interface RoleGateProps {
  role: HostRole;
  children: React.ReactNode;
}

export function RoleGate({ role, children }: RoleGateProps) {
  const session = useSession();
  if (!session.ready) return <div className="skeleton" style={{ height: 320 }} />;

  const roles: HostRole[] = session.user?.hostRoles ?? [];

  if (roles.includes(role)) {
    return <>{children}</>;
  }

  const roleName = role === "sale" ? "Sale" : "Thẩm định";
  const hasInspector = roles.includes("inspector");

  return (
    <EmptyState
      title={`Tài khoản chưa được gán vai ${roleName}`}
      description="Bạn không có quyền truy cập tính năng này. Vui lòng liên hệ Admin để được phân quyền."
      action={
        role === "sale" && hasInspector ? (
          <Link href="/host/inspections" className="btn btn-primary">
            Tới Thẩm định ký gửi
          </Link>
        ) : undefined
      }
    />
  );
}
