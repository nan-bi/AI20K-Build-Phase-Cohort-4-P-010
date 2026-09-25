import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import "./globals.css";

// UI/body copy — set in Vietnamese throughout the product, so the typeface
// needs real Vietnamese diacritic support (Be Vietnam Pro is designed for it).
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

// Display face for the "VinStay AI" wordmark only (ASCII, no diacritics) —
// Fraunces doesn't ship a Vietnamese subset, so it's never used for
// Vietnamese copy. See src/app/admin/login/AdminLoginForm.tsx.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "VinStay AI",
  description: "Vận hành cho thuê căn hộ tại Vinhomes Ocean Park.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
