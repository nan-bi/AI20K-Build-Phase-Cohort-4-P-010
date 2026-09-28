import type { Metadata } from "next";
import { AdminContractParties } from "@/components/admin/AdminContractParties";

export const metadata: Metadata = {
  title: "Theo bên ký — Quản trị",
  description: "Xem hợp đồng theo chủ nhà, khách thuê và Field Host",
};

interface Props {
  searchParams: Promise<{ role?: string }>;
}

export default async function AdminContractPartiesPage({ searchParams }: Props) {
  const { role } = await searchParams;
  return <AdminContractParties initialRole={role} />;
}
