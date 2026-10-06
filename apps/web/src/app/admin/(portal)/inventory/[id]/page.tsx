import type { Metadata } from "next";
import { AdminInventoryDetail } from "@/components/admin/AdminInventoryDetail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Hồ sơ căn ${id} — Quản trị` };
}

export default async function AdminInventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdminInventoryDetail id={(await params).id} />;
}
