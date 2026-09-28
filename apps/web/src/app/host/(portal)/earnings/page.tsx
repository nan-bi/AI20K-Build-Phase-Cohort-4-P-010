import type { Metadata } from "next";
import { EarningsView } from "@/components/host/EarningsView";

export const metadata: Metadata = { title: "Thu nhập — Field Host" };

export default function HostEarningsPage() {
  return <EarningsView />;
}
