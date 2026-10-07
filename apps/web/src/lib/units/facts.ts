/** Bản sao `DIRECTIONS` của backend (`backend/src/modules/property/unit-facts.ts`); test `listing-text.test.ts` so khớp. */
export const DIRECTIONS = ["Đông", "Tây", "Nam", "Bắc", "Đông Nam", "Đông Bắc", "Tây Nam", "Tây Bắc"] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** Số WC mặc định theo layout (SPEC-P03 §1). */
export function defaultBathrooms(layout: "Studio" | "1PN" | "2PN" | "3PN"): number {
  if (layout === "2PN" || layout === "3PN") return 2;
  return 1;
}
