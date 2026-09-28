import type { Metadata } from "next";
import { InspectionList } from "@/components/host/InspectionList";

export const metadata: Metadata = { title: "Thẩm định ký gửi — Field Host" };

export default function HostInspectionsPage() {
  return <InspectionList />;
}
