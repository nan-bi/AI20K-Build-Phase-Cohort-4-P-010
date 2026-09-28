import { AdminShell } from "@/components/portal/AdminShell";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
