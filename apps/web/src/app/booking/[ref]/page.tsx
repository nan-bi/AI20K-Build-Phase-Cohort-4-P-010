import type { Metadata } from "next";
import { BookingStatusView } from "@/components/booking/BookingStatusView";
import { SiteNav } from "@/components/nav/SiteNav";

export const metadata: Metadata = { title: "Trạng thái lịch xem phòng" };

export default async function BookingStatusPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ phone?: string }> }) {
  const [{ ref }, { phone }] = await Promise.all([params, searchParams]);
  return (
    <>
      <SiteNav />
      <main>
        <BookingStatusView refCode={ref.toUpperCase()} phoneParam={phone} />
      </main>
    </>
  );
}
