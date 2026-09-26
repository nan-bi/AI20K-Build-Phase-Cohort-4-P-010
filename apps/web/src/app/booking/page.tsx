import type { Metadata } from "next";
import { BookingLookup } from "@/components/booking/BookingLookup";
import { SiteNav } from "@/components/nav/SiteNav";

export const metadata: Metadata = { title: "Kiểm tra lịch xem phòng" };

export default function BookingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <BookingLookup />
      </main>
    </>
  );
}
