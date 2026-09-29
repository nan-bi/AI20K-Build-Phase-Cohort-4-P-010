import type { Metadata } from "next";
import { BookingStatusView } from "@/components/booking/BookingStatusView";
import { SiteNav } from "@/components/nav/SiteNav";

export const metadata: Metadata = { title: "Trạng thái lịch xem phòng" };

export default async function BookingStatusPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return (
    <>
      <SiteNav />
      <main>
        <BookingStatusView refCode={ref.toUpperCase()} />
      </main>
    </>
  );
}
