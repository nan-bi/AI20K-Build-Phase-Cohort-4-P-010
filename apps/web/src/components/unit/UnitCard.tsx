import type { MouseEvent } from "react";
import Link from "next/link";
import { ArrowRight, Bath, BedDouble, CalendarCheck, Compass, Ruler } from "lucide-react";
import { vnd, vndShort } from "@/lib/format";
import type { CostBreakdown } from "@/lib/pricing/cost";
import { unitAddress, zoneById, type Unit } from "@/lib/units";
import { AllInBar } from "./AllInBar";
import { FavoriteButton } from "./FavoriteButton";
import { UnitBadges } from "./UnitBadges";
import { VerifiedPhoto } from "./VerifiedPhoto";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UnitCardProps {
  unit: Unit;
  cost: CostBreakdown;
  /** "feature" = thẻ lớn có lý do AI chọn; "grid" = thẻ gọn. */
  variant?: "grid" | "feature";
  rank?: number;
  reasons?: string[];
  priority?: boolean;
  /** Có ⇒ bấm thẻ mở chi tiết tại chỗ (không điều hướng); href vẫn giữ để mở tab mới bằng chuột giữa/Ctrl. */
  onSelect?: (unit: Unit, book: boolean) => void;
}

export function UnitCard({ unit, cost, variant = "grid", rank, reasons, priority, onSelect }: UnitCardProps) {
  const zoneName = unit.zoneName || zoneById(unit.zoneId)?.name || "Phân khu chưa cập nhật";
  const feature = variant === "feature";
  const href = `/units/${unit.code || unit.id}`;
  const open = (book: boolean) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onSelect || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onSelect(unit, book);
  };

  return (
    <Card className={`group flex flex-col overflow-hidden transition-all hover:shadow-lg border-border bg-card ${feature ? "md:flex-row md:items-stretch" : ""}`}>
      <div className={`relative ${feature ? "md:w-[420px] shrink-0" : "w-full aspect-[4/3]"}`}>
        <Link href={href} onClick={open(false)} aria-label={`Xem chi tiết căn ${unitAddress(unit)}`} className="absolute inset-0 z-0">
          <VerifiedPhoto
            unit={unit}
            sizes={feature ? "(max-width: 900px) 100vw, 420px" : "(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 340px"}
            priority={priority}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </Link>

        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
          {rank && <Badge variant="secondary" className="bg-background/95 backdrop-blur-sm shadow-sm font-medium">Gợi ý #{rank}</Badge>}
          <UnitBadges unit={unit} />
        </div>

        <div className="absolute top-3 right-3 z-20">
          <FavoriteButton unitId={unit.id} />
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5 gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            <Link href={href} onClick={open(false)} className="focus:outline-none">
              {unitAddress(unit)}
            </Link>
          </h3>
          <p className="text-sm font-medium text-muted-foreground mt-0.5 line-clamp-1">
            {zoneName} · {unit.view}
          </p>
        </div>

        <ul className="flex items-center gap-4 text-xs font-medium text-muted-foreground flex-wrap">
          <li className="flex items-center gap-1.5">
            <Ruler size={14} className="text-foreground/70" /> {unit.areaM2} m²
          </li>
          <li className="flex items-center gap-1.5">
            <BedDouble size={14} className="text-foreground/70" /> {unit.layoutLabel}
          </li>
          <li className="flex items-center gap-1.5">
            <Bath size={14} className="text-foreground/70" /> {unit.bathrooms} WC
          </li>
          <li className="flex items-center gap-1.5">
            <Compass size={14} className="text-foreground/70" /> {unit.direction}
          </li>
        </ul>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{vnd(cost.total)}</span>
            <span className="text-sm font-medium text-muted-foreground">đ/tháng</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground bg-muted inline-flex w-fit px-2 py-0.5 rounded-md">
            All-in: thuê {vndShort(cost.rent)} + phí {vndShort(cost.total - cost.rent)}
          </p>
        </div>

        <AllInBar cost={cost} />

        {reasons && reasons.length > 0 && (
          <ul className="flex flex-col gap-2 mt-2">
            {reasons.slice(0, 3).map((r) => (
              <li key={r} className="text-sm text-muted-foreground bg-muted/50 p-2.5 rounded-lg border border-border/50">
                {r}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex gap-2.5 border-t border-border pt-4">
          <Button
            variant="outline"
            className="h-10 flex-1 rounded-xl px-4 text-sm font-semibold"
            render={<Link href={href} onClick={open(false)} />}
          >
            Chi tiết
            <ArrowRight size={15} aria-hidden="true" />
          </Button>
          <Button
            className="h-10 flex-[1.35] rounded-xl px-4 text-sm font-semibold shadow-sm"
            render={<Link href={`${href}?book=1`} onClick={open(true)} />}
          >
            <CalendarCheck size={16} aria-hidden="true" />
            Đặt lịch xem
          </Button>
        </div>
      </div>
    </Card>
  );
}
