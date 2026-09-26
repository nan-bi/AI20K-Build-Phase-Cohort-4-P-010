import { HostShell } from "@/components/host/HostShell";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return <HostShell>{children}</HostShell>;
}
