import type { Metadata } from "next";
import { AccountSaved } from "@/components/account/AccountSaved";

export const metadata: Metadata = { title: "Căn đã lưu" };

export default function AccountSavedPage() {
  return <AccountSaved />;
}
