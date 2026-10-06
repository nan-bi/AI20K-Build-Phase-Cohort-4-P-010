import type { Metadata } from "next";
import { AdminContractTemplateDetail } from "@/components/admin/AdminContractTemplateDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} · Mẫu văn bản — Quản trị` };
}

export default async function AdminContractTemplateDetailPage({ params }: Props) {
  const { id } = await params;
  return <AdminContractTemplateDetail templateId={id} />;
}
