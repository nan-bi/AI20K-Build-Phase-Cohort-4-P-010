import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/nav/SiteNav";
import { UnitDetail } from "@/components/unit/UnitDetail";
import { UNITS, unitAddress, unitById, zoneById } from "@/lib/mock/units";

export function generateStaticParams() {
  return UNITS.map((u) => ({ id: u.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const unit = unitById((await params).id);
  if (!unit) return {};
  return { title: `Căn ${unitAddress(unit)} · ${zoneById(unit.zoneId).name}`, description: unit.title };
}

export default async function UnitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ book?: string }> }) {
  const unit = unitById((await params).id);
  if (!unit) notFound();
  const { book } = await searchParams;
  return (
    <>
      <SiteNav />
      <main>
        <UnitDetail unit={unit} autoOpenBooking={book === "1"} />
      </main>
    </>
  );
}
