import type { Metadata } from "next";
import { DispatchBoard } from "@/components/host/DispatchBoard";

export const metadata: Metadata = { title: "Lịch & yêu cầu — Field Host" };

export default function HostDispatchPage() {
  return <DispatchBoard />;
}
