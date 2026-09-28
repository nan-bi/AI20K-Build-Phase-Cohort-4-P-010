import type { Metadata } from "next";
import { AdminContractPartyDetail } from "@/components/admin/AdminContractPartyDetail";

export const metadata: Metadata = {
  title: "Hợp đồng theo bên ký — Quản trị",
  description: "Chi tiết hợp đồng theo bên ký kết",
};

interface Props {
  params: Promise<{ key: string }>;
}

export default async function AdminContractPartyDetailPage({ params }: Props) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  return <AdminContractPartyDetail partyKey={decodedKey} />;
}
