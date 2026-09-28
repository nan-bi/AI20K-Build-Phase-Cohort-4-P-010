import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminContractTemplateDetail } from "@/components/admin/AdminContractTemplateDetail";
import { CONTRACT_TEMPLATES, templateById } from "@/lib/mock/contract-templates";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return CONTRACT_TEMPLATES.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const template = templateById(id);
  if (!template) {
    return { title: "Không tìm thấy mẫu — Quản trị" };
  }
  return {
    title: `${template.id} · ${template.title} — Quản trị`,
    description: template.summary,
  };
}

export default async function AdminContractTemplateDetailPage({ params }: Props) {
  const { id } = await params;
  const template = templateById(id);
  if (!template) {
    notFound();
  }

  return <AdminContractTemplateDetail templateId={id} />;
}
