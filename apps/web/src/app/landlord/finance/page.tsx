import type { Metadata } from "next";
import { LandlordFinance } from "@/components/landlord/LandlordFinance";

export const metadata: Metadata = { title: "Khoản thu — Chủ nhà" };

export default function LandlordFinancePage() {
  return <LandlordFinance />;
}
