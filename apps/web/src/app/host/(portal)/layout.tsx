import { HostShell } from "@/components/portal/HostShell";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return <HostShell>{children}</HostShell>;
}
