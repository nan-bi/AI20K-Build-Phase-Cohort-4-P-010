"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Query } from "@/lib/landlord/useLandlordQuery";

type SkeletonLayout = "table" | "detail" | "cards" | "form";

interface QueryViewProps<T> {
  query: Query<T>;
  /** Hình dạng khung chờ — gần với nội dung thật để trang không giật khi dữ liệu về. */
  skeleton?: SkeletonLayout;
  children: (data: T) => ReactNode;
}

const bar = (height: number, width: string | number = "100%", extra?: React.CSSProperties): React.ReactElement => (
  <div className="skeleton" style={{ height, width, borderRadius: 12, ...extra }} />
);

/** Khung chờ theo bố cục thật của từng loại màn (thay cho một khối xám lớn). */
export function PageSkeleton({ layout = "table" }: { layout?: SkeletonLayout }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-busy="true" aria-label="Đang tải">
      {layout === "detail" && (
        <>
          {bar(28, 240)}
          {bar(176)}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {bar(180)}
            {bar(180)}
          </div>
          {bar(140)}
        </>
      )}
      {layout === "cards" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {bar(96)}
            {bar(96)}
            {bar(96)}
            {bar(96)}
          </div>
          {bar(250)}
          {bar(180)}
        </>
      )}
      {layout === "form" && (
        <>
          {bar(24, 200)}
          {bar(320)}
        </>
      )}
      {layout === "table" && (
        <>
          {bar(36, "100%", { borderRadius: 8 })}
          {bar(52)}
          {bar(52)}
          {bar(52)}
          {bar(52)}
        </>
      )}
    </div>
  );
}

/** Khung chung cho màn dùng API: chờ → lỗi (có nút thử lại) → nội dung. Có dữ liệu cache thì vào thẳng nội dung. */
export function QueryView<T>({ query, skeleton = "table", children }: QueryViewProps<T>) {
  const { state, reload } = query;
  if (state.status === "loading") return <PageSkeleton layout={skeleton} />;
  if (state.status === "error") {
    return (
      <EmptyState
        title={state.httpStatus === 404 ? "Không tìm thấy" : "Không tải được dữ liệu"}
        description={state.message}
        action={
          state.httpStatus === 404 ? undefined : (
            <button type="button" className="btn btn-primary" onClick={reload}>
              Thử lại
            </button>
          )
        }
      />
    );
  }
  return <>{children(state.data)}</>;
}
