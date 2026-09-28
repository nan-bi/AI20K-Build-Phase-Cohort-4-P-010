import type { Metadata } from "next";
import { AccountView } from "@/components/host/AccountView";

export const metadata: Metadata = { title: "Tài khoản — Field Host" };

export default function HostAccountPage() {
  return <AccountView />;
}
