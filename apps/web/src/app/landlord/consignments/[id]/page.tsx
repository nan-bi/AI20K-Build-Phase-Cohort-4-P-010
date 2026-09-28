import type { Metadata } from "next";
import { LandlordConsignment } from "@/components/landlord/LandlordConsignment";

export const metadata: Metadata = { title: "Chi tiết hồ sơ ký gửi — Chủ nhà" };

export default async function LandlordConsignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LandlordConsignment id={id} />;
}
