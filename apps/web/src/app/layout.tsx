import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";
import { DemoDock } from "@/components/demo/DemoDock";
import { ToastHost } from "@/components/ui/Toast";
import "./globals.css";

// Thân chữ và giao diện: Be Vietnam Pro được thiết kế cho dấu tiếng Việt.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Tiêu đề & con số tiền: Bricolage Grotesque (có bộ dấu tiếng Việt), trục opsz cho chữ lớn sắc nét.
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "VinStay AI — Thuê căn hộ Vinhomes Ocean Park", template: "%s — VinStay AI" },
  description: "Tìm căn thật, biết trước mọi chi phí hàng tháng, xem nhà có Field Host đón tại sảnh. Vinhomes Ocean Park 1, Gia Lâm, Hà Nội.",
};

export const viewport: Viewport = {
  themeColor: "#0b2530",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${bricolage.variable}`}>
      <body>
        {children}
        <ToastHost />
        <DemoDock />
      </body>
    </html>
  );
}
