import type { Metadata } from "next";
import { AdminCommission } from "@/components/admin/AdminCommission";

export const metadata: Metadata = { title: "Biến phí Host — Quản trị" };

export default function AdminCommissionPage() {
  return <AdminCommission />;
}
