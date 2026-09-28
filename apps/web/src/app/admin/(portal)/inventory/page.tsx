import type { Metadata } from "next";
import { AdminInventory } from "@/components/admin/AdminInventory";

export const metadata: Metadata = { title: "Căn hộ và ký gửi — Quản trị" };

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <AdminInventory initialTab={tab === "requests" || tab === "exit" ? tab : "units"} />;
}
