import type { Metadata } from "next";
import { ViewingWorkflow } from "@/components/host/ViewingWorkflow";
import { RoleGate } from "@/components/host/RoleGate";

export const metadata: Metadata = { title: "Quy trình xem phòng — Field Host" };

export default async function HostViewingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <RoleGate role="sale">
      <ViewingWorkflow id={(await params).id} />
    </RoleGate>
  );
}
