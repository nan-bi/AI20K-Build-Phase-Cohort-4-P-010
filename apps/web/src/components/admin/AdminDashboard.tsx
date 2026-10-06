"use client";

import Link from "next/link";
import { AlertTriangle, Clock3, RefreshCw, Timer } from "lucide-react";
import { AdminBiSlaPanel } from "./AdminBiSlaPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { api } from "@/lib/apiClient";
import { useNow } from "@/lib/useNow";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { Button } from "@/components/ui/button";

interface InventoryRow {
  id: string;
  mandateStatus: string;
  exitCountdownDays: number | null;
  canTerminate: boolean;
}

interface ContractRow {
  id: string;
  status: string;
  endDate: string;
}

function needsRenewal(contract: ContractRow, now: number): boolean {
  if (contract.status !== "ACTIVE") return false;
  const end = Date.parse(contract.endDate);
  if (!Number.isFinite(end)) return false;
  const remaining = end - now;
  return remaining >= 0 && remaining <= 30 * 24 * 60 * 60 * 1000;
}

export function AdminDashboard() {
  const inventory = useApiQuery({ key: "admin-exclusive-inventory", fetch: () => api.get<InventoryRow[]>("/admin/exclusive-inventory") });
  const contracts = useApiQuery({ key: "admin-contracts", fetch: () => api.get<ContractRow[]>("/admin/contracts") });
  const loading = inventory.state.status === "loading" || contracts.state.status === "loading";
  const failure = [inventory.state, contracts.state].find((state) => state.status === "error");
  const error = failure?.status === "error" ? failure.message : null;
  const refreshing = (inventory.state.status === "ready" && inventory.state.refreshing)
    || (contracts.state.status === "ready" && contracts.state.refreshing);
  const inventoryRows = inventory.state.status === "ready" ? inventory.state.data : [];
  const contractRows = contracts.state.status === "ready" ? contracts.state.data : [];

  function refresh() {
    inventory.reload();
    contracts.reload();
  }

  const now = useNow(60_000);
  const exiting = inventoryRows.filter((unit) => unit.mandateStatus === "EXIT_REQUESTED");
  const exitDue = exiting.filter((unit) => unit.canTerminate || unit.exitCountdownDays === 0).length;
  const expiring = contractRows.filter((contract) => needsRenewal(contract, now));

  const workItems = [
    exiting.length > 0 && {
      key: "exit",
      icon: Timer,
      title: `${exiting.length} căn đang trong thời hạn thoát uỷ quyền`,
      body: exitDue > 0 ? `${exitDue} căn đã đủ điều kiện xử lý.` : "Thời hạn kết thúc được lấy từ hồ sơ uỷ quyền trong hệ thống.",
      href: "/admin/inventory?tab=exit",
      cta: "Xem rổ hàng",
    },
    expiring.length > 0 && {
      key: "contracts",
      icon: Clock3,
      title: `${expiring.length} hợp đồng sắp hết hạn`,
      body: "Kiểm tra hồ sơ và liên hệ các bên qua kênh đã cấu hình.",
      href: "/admin/contracts",
      cta: "Mở sổ hợp đồng",
    },
  ].filter(Boolean) as { key: string; icon: typeof AlertTriangle; title: string; body: string; href: string; cta: string }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tổng quan vận hành"
        description="Số liệu rổ hàng và hợp đồng được tải trực tiếp từ backend."
        actions={
              <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={15} className={`mr-2 ${refreshing ? "animate-spin" : ""}`} /> Cập nhật
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          {error && (
            <div role="alert" className="flex flex-col gap-3 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
              <b className="font-semibold">Không tải được dữ liệu vận hành</b>
              <p className="text-sm opacity-90">{error}</p>
              <Button variant="outline" size="sm" className="w-fit mt-1 border-destructive/30 hover:bg-destructive/10 text-destructive" onClick={refresh}>
                Thử lại
              </Button>
            </div>
          )}

          {loading ? (
            <div className="animate-pulse bg-muted/50 h-[140px] rounded-2xl border border-border/50" />
          ) : (
            <Section title="Công việc ưu tiên" flush>
              {workItems.length ? (
                <ul className="flex flex-col border border-border/50 rounded-2xl bg-card overflow-hidden" aria-label="Cần xử lý">
                  {workItems.map((item, i) => (
                    <li key={item.key} className={`flex flex-col sm:flex-row gap-4 p-5 items-start sm:items-center ${i > 0 ? "border-t border-border/50" : ""}`}>
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <item.icon size={20} />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <b className="text-foreground font-semibold">{item.title}</b>
                        <p className="text-sm text-muted-foreground">{item.body}</p>
                      </div>
                      <Button render={<Link href={item.href} />} size="sm">
                        {item.cta}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-center p-8 rounded-2xl border border-dashed border-border bg-muted/10 text-center">
                  <p className="text-sm text-muted-foreground font-medium">
                    {error ? "Chưa có dữ liệu để tổng hợp." : "Tất cả công việc đã hoàn thành. Hệ thống đang hoạt động tốt."}
                  </p>
                </div>
              )}
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-6">
           <Section title="Khái quát" flush>
              <div className="flex items-center justify-center p-8 rounded-2xl border border-dashed border-border bg-muted/10 text-center">
                 <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                   <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                   </span>
                   VinStay AI Copilot đang trực
                 </p>
              </div>
           </Section>
        </div>
      </div>

      <AdminBiSlaPanel />
    </div>
  );
}
