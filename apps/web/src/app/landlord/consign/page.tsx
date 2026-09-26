import type { Metadata } from "next";
import { ConsignWizard } from "@/components/landlord/ConsignWizard";

export const metadata: Metadata = { title: "Ký gửi căn hộ — Chủ nhà" };

export default async function ConsignPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  return <ConsignWizard draftId={draft} />;
}
