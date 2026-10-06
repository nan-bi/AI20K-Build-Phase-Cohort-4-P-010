"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { fmtDateTime } from "@/lib/format";
import { inspectionApi, useInspectionBoard, type InspectionBoardView } from "@/lib/inspection/api";
import { doneCounts, hoursLeft } from "@/lib/inspection/logic";
import { useInspectionAction } from "@/lib/inspection/useInspectionAction";
import type { InspectionCard } from "@/lib/inspection/types";
import { useNow } from "@/lib/useNow";

const small = { padding: "4px 12px", fontSize: "var(--fs-13)" } as const;

export function InspectionList() {
  const { state, reload } = useInspectionBoard();
  if (state.status === "loading") return <div className="skeleton" style={{ height: 420 }} />;
  if (state.status === "error") {
    return <EmptyState title="Không tải được danh sách thẩm định" description={state.message} action={<button type="button" className="btn btn-primary" onClick={reload}>Thử lại</button>} />;
  }
  return <Board board={state.data} />;
}

function Board({ board }: { board: InspectionBoardView }) {
  const now = useNow(10_000);
  const { busy, run } = useInspectionAction();
  const counts = doneCounts(board.done);

  /** Giờ còn lại theo GIỜ MÁY CHỦ (đồng hồ máy Host có thể lệch). */
  const dueCell = (c: InspectionCard) => {
    if (c.overdue) return <StatusBadge tone="warn">Quá hạn</StatusBadge>;
    const serverNow = Date.parse(board.serverTime) + ((now || board.receivedAt) - board.receivedAt);
    return <span style={{ fontSize: "var(--fs-13)" }}>Còn {hoursLeft(c.inspectDueAt, serverNow)}h</span>;
  };

  async function take(c: InspectionCard, claim: boolean) {
    const res = await run(() => (claim ? inspectionApi.claim(c.id) : inspectionApi.accept(c.id)), claim ? "Đã nhận ticket. Mở phiếu khi tới căn." : "Đã nhận ca. Mở phiếu khi tới căn.");
    if (!res.ok && res.code === "inspection_not_open") toast("Ca còn dành cho Inspector được giao.", "info");
  }

  const common = [
    { key: "can", header: "Căn hộ", render: (c: InspectionCard) => <strong>{c.building} · Tầng {c.floor} · Căn {c.door ?? "—"}</strong> },
    { key: "layout", header: "Loại · Diện tích", render: (c: InspectionCard) => `${c.layoutKind} · ${c.areaM2} m² tim tường` },
    { key: "landlord", header: "Chủ nhà", render: (c: InspectionCard) => c.landlordName },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      <PageHeader title="Thẩm định ký gửi" description="Kiểm tra thực tế căn chủ nhà ký gửi. Đạt là căn lên danh sách ngay — không qua Admin." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--s-3)" }}>
        <StatTile label="Cần làm" value={`${board.mine.length} căn`} />
        <StatTile label="Ticket mở" value={`${board.open.length} căn`} />
        <StatTile label="Đã niêm yết / Không đạt" value={`${counts.approved} / ${counts.rejected}`} />
      </div>

      <Section title="Cần làm" flush>
        <DataTable<InspectionCard>
          columns={[
            ...common,
            { key: "due", header: "Hạn thẩm định", render: dueCell },
            {
              key: "action",
              header: "Hành động",
              align: "right",
              render: (c) =>
                c.stage === "awaiting_host" ? (
                  <button type="button" className="btn btn-primary" style={small} disabled={busy} onClick={() => void take(c, false)}>
                    Nhận ca
                  </button>
                ) : (
                  <Link href={`/host/inspections/${c.id}`} className="btn btn-secondary" style={small}>
                    Tiếp tục phiếu
                  </Link>
                ),
            },
          ]}
          rows={board.mine}
          empty={<EmptyState title="Không có hồ sơ cần làm" description="Hiện không có căn nào đang chờ bạn nhận hoặc thẩm định." />}
        />
      </Section>

      <Section title="Ticket mở" description="Ca chưa ai nhận sau 4 giờ — Inspector nào nhận trước làm." flush>
        <DataTable<InspectionCard>
          columns={[
            ...common,
            { key: "zone", header: "Phân khu", render: (c) => c.zone },
            { key: "due", header: "Hạn thẩm định", render: dueCell },
            {
              key: "action",
              header: "Hành động",
              align: "right",
              render: (c) => (
                <button type="button" className="btn btn-primary" style={small} disabled={busy} onClick={() => void take(c, true)}>
                  Nhận ticket
                </button>
              ),
            },
          ]}
          rows={board.open}
          empty={<EmptyState title="Không có ticket mở" description="Mọi ca đang có Inspector phụ trách." />}
        />
      </Section>

      <Section title="Đã nộp" flush>
        <DataTable<InspectionCard>
          columns={[
            ...common,
            { key: "decidedAt", header: "Thời điểm nộp", render: (c) => (c.decidedAt ? fmtDateTime(c.decidedAt) : "—") },
            {
              key: "stage",
              header: "Kết quả",
              render: (c) =>
                c.stage === "approved" ? (
                  <span style={{ display: "inline-flex", gap: "var(--s-2)", alignItems: "center" }}>
                    <StatusBadge tone="ok">Đã niêm yết</StatusBadge>
                    <Link href={`/units/${encodeURIComponent(c.unitCode)}`} className="link" style={{ fontWeight: 500 }}>
                      Xem tin
                    </Link>
                  </span>
                ) : (
                  <StatusBadge tone="danger">Không đạt</StatusBadge>
                ),
            },
          ]}
          rows={board.done}
          rowHref={(c) => `/host/inspections/${c.id}`}
          empty={<EmptyState title="Chưa có hồ sơ đã nộp" description="Các phiếu bạn đã hoàn tất sẽ hiển thị tại đây." />}
        />
      </Section>
    </div>
  );
}
