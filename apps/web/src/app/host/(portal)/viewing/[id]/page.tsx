import type { Metadata } from "next";
import { ViewingWorkflow } from "@/components/host/ViewingWorkflow";

export const metadata: Metadata = { title: "Quy trình xem phòng — Field Host" };

export default async function HostViewingPage({ params }: { params: Promise<{ id: string }> }) {
  return <ViewingWorkflow id={(await params).id} />;
}
