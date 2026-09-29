import type { Metadata } from "next";
import { InspectionList } from "@/components/host/InspectionList";
import { RoleGate } from "@/components/host/RoleGate";

export const metadata: Metadata = { title: "Thẩm định ký gửi — Field Host" };

export default function HostInspectionsPage() {
  return (
    <RoleGate role="inspector">
      <InspectionList />
    </RoleGate>
  );
}
