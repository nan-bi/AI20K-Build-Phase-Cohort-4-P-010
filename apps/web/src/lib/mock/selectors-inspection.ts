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
      return `${c.areaM2} m² tim tường`;
    case "furnishing":
      return c.furnished ? "Có nội thất" : "Không nội thất";
    case "lock":
      return (c.locks || []).map((l) => (l === "smart" ? "Khoá thông minh" : "Khoá cơ")).join(" + ");
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
  missingItems?: ItemKey[];
  missingCount?: number;
}

export function inspectionSummary(r: InspectionReport): InspectionSummary {
  const mismatches = r.declared.filter((d) => !d.ok).map((d) => d.field);

  if (r.inventory && r.inventory.some((l) => l.present)) {
    const presentLines = r.inventory.filter((l) => l.present && typeof l.condition === "number");
    const sum = presentLines.reduce((acc, l) => acc + (l.condition ?? 0), 0);
    const avgCondition = presentLines.length > 0 ? Math.round(sum / presentLines.length) : 0;
    const lowItems = Array.from(
      new Set(presentLines.filter((l) => (l.condition ?? 0) < LOW_CONDITION).map((l) => l.passport))
    );
    const missingCount = r.inventory.filter((l) => !l.present).length;

    return {
      avgCondition,
      lowItems,
      mismatches,
      missingItems: [],
      missingCount,
    };
  }

  // Fallback nếu dữ liệu cũ còn equipment
  const eqList = r.equipment || [];
  const sum = eqList.reduce((acc, eq) => acc + eq.condition, 0);
  const avgCondition = eqList.length > 0 ? Math.round(sum / eqList.length) : 0;
  const lowItems = eqList
    .filter((eq) => eq.condition < LOW_CONDITION)
    .map((eq) => eq.item);
  const missingItems = (r.items || []).filter((it) => !it.present).map((it) => it.key);

  return {
    avgCondition,
    lowItems,
    mismatches,
    missingItems,
  };
}
