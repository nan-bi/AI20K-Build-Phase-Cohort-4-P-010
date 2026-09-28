import type { Metadata } from "next";
import { AdminContractTemplates } from "@/components/admin/AdminContractTemplates";

export const metadata: Metadata = {
  title: "Mẫu hợp đồng — Quản trị",
  description: "Danh mục mẫu hợp đồng và bản đồ bước nghiệp vụ",
};

export default function AdminContractTemplatesPage() {
  return <AdminContractTemplates />;
}
