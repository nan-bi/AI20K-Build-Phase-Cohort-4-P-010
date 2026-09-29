import type { Metadata } from "next";
import { DispatchBoard } from "@/components/host/DispatchBoard";
import { RoleGate } from "@/components/host/RoleGate";

export const metadata: Metadata = { title: "Lịch & yêu cầu — Field Host" };

export default function HostDispatchPage() {
  return (
    <RoleGate role="sale">
      <DispatchBoard />
    </RoleGate>
  );
}
