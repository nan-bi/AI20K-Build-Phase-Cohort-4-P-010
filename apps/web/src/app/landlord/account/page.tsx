import type { Metadata } from "next";
import { LandlordAccount } from "@/components/landlord/LandlordAccount";

export const metadata: Metadata = { title: "Tài khoản — Chủ nhà" };

export default function LandlordAccountPage() {
  return <LandlordAccount />;
}
