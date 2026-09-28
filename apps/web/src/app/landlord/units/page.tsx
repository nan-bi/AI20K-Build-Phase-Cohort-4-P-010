import type { Metadata } from "next";
import { LandlordUnits } from "@/components/landlord/LandlordUnits";

export const metadata: Metadata = { title: "Căn hộ — Chủ nhà" };

export default function LandlordUnitsPage() {
  return <LandlordUnits />;
}
