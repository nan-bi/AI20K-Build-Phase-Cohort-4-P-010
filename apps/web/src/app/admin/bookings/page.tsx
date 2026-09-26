import type { Metadata } from "next";
import { AdminBookings } from "@/components/admin/AdminBookings";

export const metadata: Metadata = { title: "Điều phối lịch xem — Quản trị" };

export default function AdminBookingsPage() {
  return <AdminBookings />;
}
