import type { Metadata } from "next";
import { AdminContracts } from "@/components/admin/AdminContracts";

export const metadata: Metadata = { title: "Sổ hợp đồng — Quản trị" };

export default async function AdminContractsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  return <AdminContracts initialKind={kind} />;
}
