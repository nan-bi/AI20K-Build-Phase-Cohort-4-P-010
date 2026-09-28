import type { Metadata } from "next";
import { LandlordExitRequest } from "@/components/landlord/LandlordExitRequest";

export const metadata: Metadata = { title: "Thoát uỷ quyền — Chủ nhà" };

export default function LandlordExitRequestPage() {
  return <LandlordExitRequest />;
}
