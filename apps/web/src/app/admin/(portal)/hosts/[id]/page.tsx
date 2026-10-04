import type { Metadata } from "next";
import { AdminHostDetail } from "@/components/admin/AdminHostDetail";

export const metadata: Metadata = { title: "Hồ sơ Field Host — Quản trị" };

export default async function AdminHostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminHostDetail id={id} />;
}
