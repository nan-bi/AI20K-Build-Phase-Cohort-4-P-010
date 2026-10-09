import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { blankDraft, syncPhotos, toSubmitDto, validateDraftFull } from "@/lib/inspection/logic";
import { listingForbiddenField, pricingChanged, toExtrasDto, validateExtras } from "@/lib/inspection/facts";
import type { CatalogItem, InspectionDetail, InspectionDraft, InspectionPhotoView, InventoryGroup } from "@/lib/inspection/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

const GROUPS: InventoryGroup[] = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const catalog = (): CatalogItem[] =>
  Array.from({ length: 32 }, (_, i) => ({ code: String(i + 1), group: GROUPS[Math.floor(i / 4)], name: `Hạng mục ${i + 1}`, passport: "Sofa & bàn ghế", liability: "misuse", specHint: "", checkHint: "" }));

function makeDetail(over: Partial<InspectionDetail> = {}): InspectionDetail {
  return {
    id: "m-1", unitCode: "VHOP-S1.02-12A08", building: "S1.02", zone: "S1", floor: 12, door: "08", layoutKind: "2PN", areaM2: 62,
    askRent: 9_000_000, furnished: true, locks: ["smart"], landlordName: "Nguyễn Văn A", stage: "inspecting",
    signedAt: "2026-10-04T01:00:00.000Z", inspectDueAt: "2026-10-06T01:00:00.000Z", overdue: false, tier: "assigned",
    hostAcceptedAt: "2026-10-04T02:00:00.000Z", decidedAt: null, suggestedDeposit: 18_000_000, leaseTerm: "long", note: null,
    landlordPhotos: [], photos: [], doorKind: "smart", doorCodeOnFile: true, catalog: catalog(),
    limits: { minSidePx: 200, perLineMax: 4, listingMin: 4, listingMax: 12, totalMax: 100 }, report: null,
    declared: { bathrooms: 2, direction: "Đông Nam", highlights: ["View hồ"] },
    ...over,
  };
}

let seq = 0;
const photo = (slot: string, room: InspectionPhotoView["room"] = null): InspectionPhotoView => {
  seq++;
  return { id: `p-${seq}`, slot, room, width: 1280, height: 960, size: 1, uploadedAt: new Date(Date.UTC(2026, 9, 4, 3, 0, seq)).toISOString(), url: null };
};

/** Phiếu hợp lệ V1–V11 + facts/pricing/listing điền sẵn từ chủ khai. */
function setup(over: Partial<InspectionDetail> = {}) {
  const detail = makeDetail(over);
  let draft = blankDraft(detail);
  draft = { ...draft, inventory: draft.inventory.map((l) => (l.present ? { ...l, condition: 80 } : l)) };
  const photos = [...draft.inventory.filter((l) => l.present).map((l) => photo(l.code)), photo("listing", "living_room"), photo("listing", "bedroom"), photo("listing", "kitchen"), photo("listing", "bathroom")];
  return { detail, draft: syncPhotos(draft, photos) as InspectionDraft };
}

describe("W5 màn thẩm định: giá & cọc", () => {
  it("điền sẵn từ chủ khai: facts, pricing, listing", () => {
    const { draft } = setup();
    expect(draft.facts).toEqual({ areaM2: "62", layout: "2PN", bathrooms: "2", direction: "Đông Nam", floor: "12" });
    expect(draft.pricing).toEqual({ rent: "9000000", securityDeposit: "18000000", reason: "" });
    expect(draft.listing).toEqual({ highlights: ["View hồ", "", ""] });
  });

  it("API chưa trả declared ⇒ WC mặc định theo layout, hướng Chưa rõ, listing rỗng", () => {
    const d = blankDraft(makeDetail({ declared: undefined, layoutKind: "3PN" }));
    expect(d.facts.bathrooms).toBe("2");
    expect(d.facts.direction).toBe("");
    expect(d.listing).toEqual({ highlights: ["", "", ""] });
  });

  it("không đổi giá/cọc ⇒ payload pricing = bản chủ khai, không reason", () => {
    const { detail, draft } = setup();
    expect(pricingChanged(draft.pricing, detail)).toBe(false);
    expect(validateDraftFull(draft, detail)).toBeNull();
    const dto = toSubmitDto(draft);
    expect(dto.pricing).toEqual({ rent: 9_000_000, securityDeposit: 18_000_000 });
    expect(dto.facts).toEqual({ areaM2: 62, layout: "2PN", bathrooms: 2, direction: "Đông Nam", floor: 12 });
    expect(dto.listing).toEqual({ highlights: ["View hồ"] });
  });

  it("đổi giá ⇒ payload có pricing mới + reason, nút đổi nhãn, thiếu reason bị chặn đúng ô", () => {
    const { detail, draft } = setup();
    const changed = { ...draft, pricing: { rent: "8500000", securityDeposit: "18000000", reason: "" } };
    expect(pricingChanged(changed.pricing, detail)).toBe(true);
    expect(validateDraftFull(changed, detail)).toMatchObject({ field: "pricing.reason" });
    const ok = { ...changed, pricing: { ...changed.pricing, reason: "  Giá cùng tầng thấp hơn  " } };
    expect(validateDraftFull(ok, detail)).toBeNull();
    expect(toSubmitDto(ok).pricing).toEqual({ rent: 8_500_000, securityDeposit: 18_000_000, reason: "Giá cùng tầng thấp hơn" });
  });

  it("chỉ đổi cọc cũng tính là đổi; khoảng giá bị chặn như backend", () => {
    const { detail, draft } = setup();
    expect(pricingChanged({ ...draft.pricing, securityDeposit: "9000000" }, detail)).toBe(true);
    expect(validateExtras({ ...draft, pricing: { ...draft.pricing, rent: "999999", reason: "x" } }, detail)?.field).toBe("pricing.rent");
    expect(validateExtras({ ...draft, pricing: { ...draft.pricing, rent: "200000001", reason: "x" } }, detail)?.field).toBe("pricing.rent");
    expect(validateExtras({ ...draft, pricing: { ...draft.pricing, reason: "x".repeat(301) } }, detail)?.field).toBe("pricing.reason");
  });

  it("F2: biên giá/cọc cùng backend — rent ∈ [3tr,200tr], cọc ∈ [2tr, 3×rent], số nguyên", () => {
    const { detail, draft } = setup();
    const f = (rent: string, securityDeposit: string) => validateExtras({ ...draft, pricing: { rent, securityDeposit, reason: "x" } }, detail)?.field;
    expect(f("2999999", "3000000")).toBe("pricing.rent");
    expect(f("6500000", "0")).toBe("pricing.securityDeposit");
    expect(f("6500000", "1999999")).toBe("pricing.securityDeposit");
    expect(f("6500000", "19500001")).toBe("pricing.securityDeposit");
    expect(f("6500000", "1e15")).toBe("pricing.securityDeposit");
    expect(f("6500000", "NaN")).toBe("pricing.securityDeposit");
    expect(f("6500000.5", "6500000")).toBe("pricing.rent");
    expect(f("6500000", "6500000.5")).toBe("pricing.securityDeposit");
    expect(f("6500000", "2000000")).toBeUndefined();
    expect(f("6500000", "19500000")).toBeUndefined();
    expect(validateExtras({ ...draft, pricing: { rent: "6500000", securityDeposit: "1000000", reason: "x" } }, detail)?.message).toMatch(/2\.000\.000/);
  });

  it("facts: miền giá trị cùng backend", () => {
    const { detail, draft } = setup();
    const f = (patch: Partial<InspectionDraft["facts"]>) => validateExtras({ ...draft, facts: { ...draft.facts, ...patch } }, detail)?.field;
    expect(f({ bathrooms: "0" })).toBe("facts.bathrooms");
    expect(f({ bathrooms: "5" })).toBe("facts.bathrooms");
    expect(f({ bathrooms: "1.5" })).toBe("facts.bathrooms");
    expect(f({ floor: "81" })).toBe("facts.floor");
    expect(f({ areaM2: "0" })).toBe("facts.areaM2");
    expect(f({ areaM2: "501" })).toBe("facts.areaM2");
    expect(f({ direction: "Đông Đông" })).toBe("facts.direction");
    expect(f({ direction: "" })).toBeUndefined();
  });

  it("listing: SĐT/URL/tiền bị chặn đúng ô; điểm nổi bật không bắt buộc", () => {
    const { detail, draft } = setup();
    const l = (patch: Partial<InspectionDraft["listing"]>) => validateExtras({ ...draft, listing: { ...draft.listing, ...patch } }, detail)?.field;
    expect(l({ highlights: ["", "", ""] })).toBeUndefined();
    expect(l({ highlights: ["OK", "zalo.me/abc", ""] })).toBe("listing.highlights.1");
    expect(l({ highlights: ["Gọi 0979841233", "", ""] })).toBe("listing.highlights.0");
    expect(l({ highlights: ["h".repeat(61), "", ""] })).toBe("listing.highlights.0");
    expect(listingForbiddenField("highlights", { highlights: ["OK", "", "Giá 7 triệu"] })).toBe("listing.highlights.2");
  });

  it("không đạt ⇒ không gửi facts/pricing/listing và không kiểm V12–V14", () => {
    const { detail, draft } = setup();
    const rej = { ...draft, recommendation: "reject" as const, note: "Không đạt", listing: { highlights: ["", "", ""] } };
    expect(validateDraftFull(rej, detail)).toBeNull();
    const dto = toSubmitDto(rej);
    expect(dto).not.toHaveProperty("facts");
    expect(dto).not.toHaveProperty("pricing");
    expect(dto).not.toHaveProperty("listing");
  });

  it("toExtrasDto bỏ ô nổi bật rỗng, hướng rỗng ⇒ null", () => {
    const { draft } = setup();
    const x = toExtrasDto({ ...draft, facts: { ...draft.facts, direction: "" }, listing: { ...draft.listing, highlights: ["", "A", ""] } });
    expect(x.facts.direction).toBeNull();
    expect(x.listing.highlights).toEqual(["A"]);
  });
});

describe("W5 render khối PIN cửa / Thông tin thực tế", () => {
  it("ô PIN cửa hiện đúng nhãn bắt buộc khi đẩy căn lên; không còn khối Giá & cọc / Kết luận", async () => {
    const { DoorPinBlock } = await import("@/components/host/inspection/DoorPinBlock");
    const { draft } = setup();
    const html = renderToStaticMarkup(createElement(DoorPinBlock, { draft, invalid: false, onChange: () => {} }));
    expect(html).toContain("Mã PIN thật của cửa");
    expect(html).toContain("Bắt buộc khi đẩy căn lên");
    expect(html).not.toContain("Giá &amp; cọc");
  });

  it("ô facts đã sửa có nhãn 'Đã sửa (chủ khai: …)'", async () => {
    const { FactsBlock } = await import("@/components/host/inspection/InfoBlocks");
    const { detail, draft } = setup();
    const noop = () => {};
    const clean = renderToStaticMarkup(createElement(FactsBlock, { detail, draft, invalidField: null, onChange: noop }));
    expect(clean).not.toContain("Đã sửa");
    const edited = { ...draft, facts: { ...draft.facts, bathrooms: "3", direction: "Tây" } };
    const html = renderToStaticMarkup(createElement(FactsBlock, { detail, draft: edited, invalidField: null, onChange: noop }));
    expect(html).toContain("Đã sửa (chủ khai: 2)");
    expect(html).toContain("Đã sửa (chủ khai: Đông Nam)");
    expect(html.match(/Đã sửa/g)).toHaveLength(2);
  });
});

describe("anchor id ô lỗi hồ sơ 18 (kebab-case)", () => {
  it("fieldAnchorId khớp id đặt trên ô", async () => {
    const { fieldAnchorId } = await import("@/lib/inspection/logic");
    expect(fieldAnchorId("facts.areaM2")).toBe("insp-facts-area-m2");
    expect(fieldAnchorId("pricing.securityDeposit")).toBe("insp-pricing-security-deposit");
    expect(fieldAnchorId("pricing.reason")).toBe("insp-pricing-reason");
    expect(fieldAnchorId("listing.highlights.1")).toBe("insp-listing-highlights-1");
    expect(fieldAnchorId("facts")).toBe("insp-facts");
    expect(fieldAnchorId("listingPhotoIds")).toBe("insp-listingPhotoIds"); // cũ giữ nguyên
  });
});
