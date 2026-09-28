import type { Metadata } from "next";
import { AccountProfile } from "@/components/account/AccountProfile";

export const metadata: Metadata = { title: "Hồ sơ của bạn" };

export default function AccountPage() {
  return <AccountProfile />;
}
