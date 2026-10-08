import { describe, expect, it } from "vitest";
import { blankDraft, GROUPS } from "@/lib/inspection/logic";
import type { CatalogItem, InspectionDetail } from "@/lib/inspection/types";

const catalog: CatalogItem[] = Array.from({ length: 32 }, (_, i) => ({
  code: String(i + 1),
  group: GROUPS[Math.floor(i / 4)],
  name: `Hạng mục ${i + 1}`,
  passport: "Sofa & bàn ghế",
  liability: "misuse",
  specHint: "",
  checkHint: "",
}));

const detail = (over: Partial<Pick<InspectionDetail, "furnished" | "declared">>) =>
  ({ catalog, areaM2: 47, furnished: true, layoutKind: "1PN", floor: 12, askRent: 6_500_000, suggestedDeposit: 6_500_000, declared: undefined, ...over }) as Parameters<typeof blankDraft>[0];

const presentCodes = (d: ReturnType<typeof blankDraft>) => d.inventory.filter((l) => l.present).map((l) => l.code);

describe("thẩm định: tick sẵn món chủ nhà khai", () => {
  it("chủ nhà chọn món ⇒ tick đúng các món đó + 25–29 (sàn, tường, điện, cửa, thẻ)", () => {
    const d = blankDraft(detail({ declared: { inventoryCodes: ["8", "21", "24"] } }));
    expect(presentCodes(d)).toEqual(["8", "21", "24", "25", "26", "27", "28", "29"]);
  });

  it("khai 0 món ⇒ chỉ còn 25–29", () => {
    expect(presentCodes(blankDraft(detail({ declared: { inventoryCodes: [] } })))).toEqual(["25", "26", "27", "28", "29"]);
  });

  it("hồ sơ cũ không khai (null/thiếu) ⇒ quy tắc cũ: có nội thất tick 1–27 + 28–29", () => {
    const old = presentCodes(blankDraft(detail({ declared: { inventoryCodes: null } })));
    expect(old).toHaveLength(29);
    expect(presentCodes(blankDraft(detail({})))).toHaveLength(29);
  });

  it("khai không nội thất ⇒ bỏ qua danh sách món, chỉ 25–29", () => {
    const d = blankDraft(detail({ furnished: false, declared: { inventoryCodes: ["8"] } }));
    expect(presentCodes(d)).toEqual(["25", "26", "27", "28", "29"]);
  });
});
