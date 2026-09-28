import type { Metadata } from "next";
import { AccountBookings } from "@/components/account/AccountBookings";

export const metadata: Metadata = { title: "Lịch xem của tôi" };

export default function AccountBookingsPage() {
  return <AccountBookings />;
}
