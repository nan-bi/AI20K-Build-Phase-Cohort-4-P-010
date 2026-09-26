import type { Metadata } from "next";
import { SiteNav } from "@/components/nav/SiteNav";
import { UnitsBrowser } from "@/components/unit/UnitsBrowser";

export const metadata: Metadata = { title: "Tìm căn hộ" };

export default function UnitsPage() {
  return (
    <>
      <SiteNav />
      <main>
        <UnitsBrowser />
      </main>
    </>
  );
}
