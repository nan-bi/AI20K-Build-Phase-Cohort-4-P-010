"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { UnitInventoryLine } from "@/lib/tenant/types";

/** Ảnh minh hoạ hạng mục: `public/inventory/<code>.jpg` (xem README cùng thư mục). Thiếu ảnh ⇒ ẩn, không icon vỡ. */
export function inventoryImageSrc(code: string): string {
  return `/inventory/${encodeURIComponent(code)}.jpg`;
}

/** "Mới ~X%": độ mới do Host kiểm định ước lượng; null ⇒ không hiện. */
export function ConditionChip({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Độ mới ước lượng khi kiểm định">
      <span className="h-1.5 w-12 rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
      </span>
      Mới ~{v}%
    </span>
  );
}

export function InventoryRow({ line }: { line: UnitInventoryLine }) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const src = inventoryImageSrc(line.code);
  return (
    <li className="flex items-start gap-3 text-sm text-foreground">
      {!failed && (
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-lg overflow-hidden border border-border/60" aria-label={`Xem ảnh minh hoạ ${line.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Ảnh minh hoạ ${line.name}`} width={56} height={42} loading="lazy" className="h-[42px] w-14 object-cover" onError={() => setFailed(true)} />
        </button>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div>
          <span className="font-medium">{line.name}</span>
          {line.qty > 1 && <span className="text-muted-foreground"> · ×{line.qty}</span>}
          {line.spec && <span className="text-xs text-muted-foreground"> · {line.spec}</span>}
        </div>
        <ConditionChip pct={line.conditionPct} />
      </div>
      {!failed && (
        <Modal open={open} onClose={() => setOpen(false)} title={line.name} variant="center">
          <div className="p-4 flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Ảnh minh hoạ ${line.name}`} className="w-full rounded-xl object-contain max-h-[70vh]" />
            <p className="text-xs text-muted-foreground">Ảnh minh hoạ</p>
          </div>
        </Modal>
      )}
    </li>
  );
}
