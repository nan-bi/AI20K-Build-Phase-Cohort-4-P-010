import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteNav } from "@/components/nav/SiteNav";
import { UnitDetail } from "@/components/unit/UnitDetail";
import { unitAddress, zoneById } from "@/lib/mock/units";
import { backendUrl } from "@/lib/auth/session";
import { toUnit } from "@/lib/tenant/adapters";
import type { TenantUnit } from "@/lib/tenant/types";

/** null = backend trả 404 (căn không tồn tại / không công khai). Backend không với tới hoặc lỗi 5xx thì NÉM LỖI để
 *  hiện trang lỗi tải, không giả làm "không tồn tại" (lỗi cũ: gọi nhầm cổng 3001 ⇒ mọi căn đều 404). */
async function fetchUnit(codeOrId: string): Promise<TenantUnit | null> {
  const res = await fetch(`${backendUrl()}/api/v1/properties/units/${encodeURIComponent(codeOrId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Không tải được căn ${codeOrId} (backend ${res.status})`);
  const json = await res.json();
  return json.data || json;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const dto = await fetchUnit(id).catch(() => null);
  if (!dto) return {};
  const unit = toUnit(dto);
  return { title: `Căn ${unitAddress(unit)} · ${zoneById(unit.zoneId).name}`, description: unit.title };
}

export default async function UnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ book?: string }>;
}) {
  const { id } = await params;
  const { book } = await searchParams;

  // Dữ liệu căn đến thẳng từ API A2 (DB thật). Mã không có trong DB ⇒ 404, không còn rơi về danh sách mock.
  const dto = await fetchUnit(id);
  if (!dto) notFound();

  // Vào bằng UUID hoặc mã viết thường ⇒ chuyển về URL chuẩn theo mã căn.
  if (dto.code !== id) redirect(`/units/${encodeURIComponent(dto.code)}${book === "1" ? "?book=1" : ""}`);

  return (
    <>
      <SiteNav />
      <main>
        <UnitDetail unit={toUnit(dto)} autoOpenBooking={book === "1"} />
      </main>
    </>
  );
}
