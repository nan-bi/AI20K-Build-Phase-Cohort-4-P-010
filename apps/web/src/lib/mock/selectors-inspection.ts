import type {
  Consignment,
  DeclaredField,
  InspectionReport,
  MockState,
} from "./types";
import type { ItemKey, PassportItem } from "./units";

export const LOW_CONDITION = 60;

export const DECLARED_LABEL: Record<DeclaredField, string> = {
  identity: "Toà · Tầng · Căn",
  layout: "Loại căn",
  areaM2: "Diện tích",
  furnishing: "Nội thất",
  lock: "Loại khoá",
};

export function declaredValue(c: Consignment, f: DeclaredField): string {
  switch (f) {
    case "identity":
      return `${c.building} · Tầng ${c.floor} · Căn ${c.door}`;
    case "layout":
      return c.layout;
    case "areaM2":
      return `${c.areaM2} m²`;
    case "furnishing":
      if (c.furnishing === "full") return "Full nội thất";
      if (c.furnishing === "basic") return "Nội thất cơ bản";
      return "Nhà trống";
    case "lock":
      return c.lock === "smart" ? "Khoá thông minh" : "Khoá cơ";
    default:
      return "";
  }
}

export function isInspectOverdue(c: Consignment, now: number): boolean {
  if (c.status !== "awaiting_host" && c.status !== "inspecting") return false;
  if (!c.inspectDueAt) return false;
  return now > new Date(c.inspectDueAt).getTime();
}

export function hostInspections(state: MockState, hostId: string): Consignment[] {
  const validStatuses = new Set([
    "awaiting_host",
    "inspecting",
    "reviewing",
    "approved",
    "rejected",
  ]);

  return state.consignments
    .filter((c) => c.hostId === hostId && validStatuses.has(c.status))
    .sort((a, b) => {
      const timeA = new Date(a.signedAt ?? a.createdAt).getTime();
      const timeB = new Date(b.signedAt ?? b.createdAt).getTime();
      return timeB - timeA;
    });
}

export interface InspectionSummary {
  avgCondition: number;
  lowItems: PassportItem[];
  mismatches: DeclaredField[];
  missingItems: ItemKey[];
}

export function inspectionSummary(r: InspectionReport): InspectionSummary {
  const sum = r.equipment.reduce((acc, eq) => acc + eq.condition, 0);
  const avgCondition = r.equipment.length > 0 ? Math.round(sum / r.equipment.length) : 0;
  const lowItems = r.equipment
    .filter((eq) => eq.condition < LOW_CONDITION)
    .map((eq) => eq.item);
  const mismatches = r.declared.filter((d) => !d.ok).map((d) => d.field);
  const missingItems = r.items.filter((it) => !it.present).map((it) => it.key);

  return {
    avgCondition,
    lowItems,
    mismatches,
    missingItems,
  };
}
