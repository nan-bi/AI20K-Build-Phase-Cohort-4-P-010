import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginTabs } from "./LoginTabs";

export const metadata: Metadata = {
  title: "Đăng nhập — VinStay AI",
};

// useSearchParams() (?error=... from the auth callback) needs Suspense.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginTabs />
    </Suspense>
  );
}
