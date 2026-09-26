import type { Metadata } from "next";
import { LandlordUnit } from "@/components/landlord/LandlordUnit";

export const metadata: Metadata = { title: "Chi tiết căn — Chủ nhà" };

export default async function LandlordUnitPage({ params }: { params: Promise<{ id: string }> }) {
  return <LandlordUnit id={(await params).id} />;
}
