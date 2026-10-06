import type { Metadata } from "next";
import { AdminContracts } from "@/components/admin/AdminContracts";

export const metadata: Metadata = { title: "Sổ hợp đồng — Quản trị" };

export default function AdminContractsPage() {
  return <AdminContracts />;
}
