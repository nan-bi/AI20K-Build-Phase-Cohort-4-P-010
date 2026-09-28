import type { Metadata } from "next";
import { AdminContractDetail } from "@/components/admin/AdminContractDetail";

export const metadata: Metadata = { title: "Chi tiết hợp đồng — Quản trị" };

export default async function AdminContractDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <AdminContractDetail contractKey={decodeURIComponent(key)} />;
}
