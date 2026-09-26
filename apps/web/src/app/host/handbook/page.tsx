import type { Metadata } from "next";
import { Handbook } from "@/components/host/Handbook";

export const metadata: Metadata = { title: "Sổ tay phân khu — Field Host" };

export default function HostHandbookPage() {
  return <Handbook />;
}
