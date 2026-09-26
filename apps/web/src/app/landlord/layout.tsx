import { LandlordShell } from "@/components/portal/LandlordShell";

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return <LandlordShell>{children}</LandlordShell>;
}
