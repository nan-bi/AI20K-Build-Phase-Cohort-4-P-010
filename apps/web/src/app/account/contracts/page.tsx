import type { Metadata } from "next";
import { AccountContracts } from "@/components/account/AccountContracts";

export const metadata: Metadata = { title: "Hợp đồng & tiền cọc" };

export default function AccountContractsPage() {
  return <AccountContracts />;
}
