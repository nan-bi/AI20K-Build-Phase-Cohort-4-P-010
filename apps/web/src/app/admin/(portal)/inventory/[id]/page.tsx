import type { Metadata } from "next";
import { AdminInventoryDetail } from "@/components/admin/AdminInventoryDetail";
import { unitById } from "@/lib/mock/units";

/**
 * Id có thể là unit id (danh mục tĩnh, kiểm được ở server) hoặc consignment id (chỉ tồn tại trong
 * mock state ở localStorage của trình duyệt) — trường hợp sau phải để `AdminInventoryDetail` tự
 * kiểm và gọi `notFound()` phía client vì server không truy cập được localStorage.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const unit = unitById((await params).id);
  return { title: unit ? `${unit.building} · Tầng ${unit.floor} · Căn ${unit.door} — Quản trị` : "Hồ sơ căn ký gửi — Quản trị" };
}

export default async function AdminInventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdminInventoryDetail id={(await params).id} />;
}
