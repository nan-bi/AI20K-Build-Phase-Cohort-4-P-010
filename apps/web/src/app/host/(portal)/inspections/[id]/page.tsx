import type { Metadata } from "next";
import { InspectionForm } from "@/components/host/InspectionForm";

export const metadata: Metadata = { title: "Phiếu thẩm định — Field Host" };

export default async function HostInspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InspectionForm id={id} />;
}
