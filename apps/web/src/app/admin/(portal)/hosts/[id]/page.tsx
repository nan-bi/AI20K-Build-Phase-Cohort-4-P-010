import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHostDetail } from "@/components/admin/AdminHostDetail";
import { hostById } from "@/lib/mock/units";

export const metadata: Metadata = { title: "Hồ sơ Field Host — Quản trị" };

export default async function AdminHostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hostById(id)) notFound();
  return <AdminHostDetail id={id} />;
}
