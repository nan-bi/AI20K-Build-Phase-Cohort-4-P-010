import type { Metadata } from "next";
import { LandlordDashboard } from "@/components/landlord/LandlordDashboard";

export const metadata: Metadata = { title: "Tổng quan — Chủ nhà" };

export default function LandlordDashboardPage() {
  return <LandlordDashboard />;
}
