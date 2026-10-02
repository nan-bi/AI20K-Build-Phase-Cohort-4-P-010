import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { ToastHost } from "@/components/ui/Toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";

// Một họ chữ duy nhất cho toàn bộ giao diện: Be Vietnam Pro được thiết kế cho dấu tiếng Việt.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "VinStay AI — Thuê căn hộ Vinhomes Ocean Park", template: "%s — VinStay AI" },
  description: "Tìm căn thật, biết trước mọi chi phí hàng tháng, xem nhà có Field Host đón tại sảnh. Vinhomes Ocean Park 1, Gia Lâm, Hà Nội.",
};

export const viewport: Viewport = {
  themeColor: "#0A3D4A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
          {children}
          <ToastHost />
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
