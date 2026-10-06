"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { hostApi, refreshHost, useHostBoard } from "@/lib/host/api";
import { hostErrorText } from "@/lib/host/logic";
import { accountApi } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/query/useApiQuery";

export function HostSideTools({ sale }: { sale: boolean }) {
  const board = useHostBoard(sale);
  const notifications = useApiQuery({ key: "host-notifications", fetch: accountApi.getNotifications });
  const [bell, setBell] = useState(false);
  const [busy, setBusy] = useState(false);
  const duty = board.state.status === "ready" ? board.state.data.dutyStatus : null;
  const guiding = duty === "BUSY_VIEWING";
  const onDuty = duty === "ONLINE_AVAILABLE" || guiding;
  const noticeRows = notifications.state.status === "ready" ? notifications.state.data : [];

  async function toggle() {
    if (!duty || guiding || busy) return;
    setBusy(true);
    const res = await hostApi.setDuty(onDuty ? "OFF_DUTY" : "ONLINE_AVAILABLE");
    setBusy(false);
    if (!res.ok) toast(hostErrorText(res));
    else toast("Đã cập nhật trạng thái trực.", "success");
    refreshHost();
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {sale && (
        <button
          type="button"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all text-left w-full
            ${onDuty
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }
            ${(!duty || guiding || busy) ? "opacity-50 cursor-not-allowed" : ""}
          `}
          aria-pressed={onDuty}
          disabled={!duty || guiding || busy}
          title={guiding ? "Đang dẫn khách — chưa tắt trực được" : undefined}
          onClick={() => void toggle()}
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${onDuty ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/50"}`} />
          <span className="flex-1 truncate">{!duty ? "Đang tải…" : guiding ? "Đang dẫn khách" : onDuty ? "Đang trực" : "Nghỉ ca"}</span>
        </button>
      )}

      <button
        type="button"
        className="flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all text-left w-full text-muted-foreground hover:bg-muted/50 hover:text-foreground md:justify-start md:gap-3"
        aria-label="Thông báo"
        aria-expanded={bell}
        onClick={() => setBell(true)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Bell size={18} className="shrink-0" />
          <span className="flex-1 truncate">Thông báo</span>
        </div>
        {noticeRows.length > 0 && (
          <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            {noticeRows.length}
          </span>
        )}
      </button>

      <Modal open={bell} onClose={() => setBell(false)} title="Thông báo" variant="center">
        {notifications.state.status === "error" ? (
          <p role="alert" className="text-sm font-medium text-destructive bg-destructive/10 p-4 rounded-xl">{notifications.state.message}</p>
        ) : notifications.state.status === "loading" ? (
          <p className="text-sm font-medium text-muted-foreground p-4 text-center">Đang tải thông báo…</p>
        ) : noticeRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
            <Bell size={24} className="text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">Chưa có thông báo được lưu trong hệ thống.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto p-1 scrollbar-none">
            {noticeRows.map((item, index) => {
              const row = item as Record<string, unknown>;
              const title = typeof row.title === "string" ? row.title : "Thông báo";
              const body = typeof row.body === "string" ? row.body : "";
              return (
                <li key={String(row.id ?? index)} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <b className="font-semibold text-foreground text-sm">{title}</b>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
