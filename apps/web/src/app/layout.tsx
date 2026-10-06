import type { Metadata, Viewport } from "next";
import { ToastHost } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VinStay AI — Thuê căn hộ Vinhomes Ocean Park", template: "%s — VinStay AI" },
  description: "Tìm căn thật, biết trước mọi chi phí hàng tháng, xem nhà có Field Host đón tại sảnh. Vinhomes Ocean Park 1, Gia Lâm, Hà Nội.",
};

export const viewport: Viewport = {
  themeColor: "#105b53",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="font-sans" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
