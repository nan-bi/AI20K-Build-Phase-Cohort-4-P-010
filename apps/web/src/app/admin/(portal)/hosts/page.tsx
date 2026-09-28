import type { Metadata } from "next";
import { AdminHosts } from "@/components/admin/AdminHosts";

export const metadata: Metadata = { title: "Field Host — Quản trị" };

export default function AdminHostsPage() {
  return <AdminHosts />;
}
