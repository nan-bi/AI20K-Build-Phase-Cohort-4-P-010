import { afterEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { ApiResponse } from "@/lib/apiClient";
import { clearDraft, draftKey, loadDraft, saveDraft } from "@/lib/inspection/draftStore";
import {
  INSPECTION_ERROR_CODES,
  blankDraft,
  boardBadge,
  doneCounts,
  draftProgress,
  fieldAnchorId,
  inspectionErrorText,
  inspectionResErrorText,
  isDraftCompatible,
  moveListing,
  syncPhotos,
  toSubmitDto,
  validateDraft,
} from "@/lib/inspection/logic";
import { TaskLimiter, isRetryableUpload, uploadWithRecovery } from "@/lib/inspection/uploadQueue";
import type { CatalogItem, InspectionDetail, InspectionPhotoView, InventoryGroup } from "@/lib/inspection/types";

const GROUPS: InventoryGroup[] = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function catalog(): CatalogItem[] {
  return Array.from({ length: 32 }, (_, i) => ({
    code: String(i + 1),
    group: GROUPS[Math.floor(i / 4)],
    name: `Hạng mục ${i + 1}`,
    passport: "Sofa & bàn ghế",
    liability: i % 2 ? "wear_or_misuse" : "misuse",
    specHint: "",
    checkHint: "",
  }));
}

function makeDetail(over: Partial<InspectionDetail> = {}): InspectionDetail {
  return {
    id: "m-1",
    unitCode: "VHOP-S1.02-12A08",
    building: "S1.02",
    zone: "S1",
    floor: 12,
    door: "08",
    layoutKind: "1PN",
    areaM2: 45,
    askRent: 9_000_000,
    furnished: false,
    locks: ["smart"],
    landlordName: "Nguyễn Văn A",
    stage: "inspecting",
    signedAt: "2026-10-04T01:00:00.000Z",
    inspectDueAt: "2026-10-06T01:00:00.000Z",
    overdue: false,
    tier: "assigned",
    hostAcceptedAt: "2026-10-04T02:00:00.000Z",
    decidedAt: null,
    suggestedDeposit: 18_000_000,
    leaseTerm: "long",
    note: null,
    landlordPhotos: [],
    photos: [],
    doorKind: "smart",
    doorCodeOnFile: true,
    catalog: catalog(),
    limits: { minSidePx: 200, perLineMax: 4, listingMin: 4, listingMax: 12, totalMax: 100 },
    report: null,
    ...over,
  };
}

let pseq = 0;
function photo(slot: string, room: InspectionPhotoView["room"] = null): InspectionPhotoView {
  pseq++;
  return {
    id: `p-${pseq}`,
    slot,
    room,
    width: 1280,
    height: 960,
    size: 100_000,
    uploadedAt: new Date(Date.UTC(2026, 9, 4, 3, 0, pseq)).toISOString(),
    url: null,
  };
}

/** Nháp hợp lệ hoàn chỉnh: dòng present có độ mới + 1 ảnh, 4 ảnh niêm yết. */
function validSetup() {
  const detail = makeDetail();
  let draft = blankDraft(detail);
  draft = { ...draft, inventory: draft.inventory.map((l) => (l.present ? { ...l, condition: 80 } : l)) };
  const photos: InspectionPhotoView[] = [
    ...draft.inventory.filter((l) => l.present).map((l) => photo(l.code)),
    photo("listing", "living_room"),
    photo("listing", "bedroom"),
    photo("listing", "kitchen"),
    photo("listing", "bathroom"),
  ];
  return { detail, draft: syncPhotos(draft, photos), photos };
}

describe("W1 validateDraft", () => {
  it("phiếu đầy đủ ⇒ null", () => {
    const { detail, draft } = validSetup();
    expect(validateDraft(draft, detail)).toBeNull();
  });

  it("V4: dòng present thiếu ảnh ⇒ field inventory.<i>.photoIds đúng chỉ số", () => {
    const { detail, draft } = validSetup();
    const i = draft.inventory.findIndex((l) => l.code === "27");
    expect(i).toBe(-1 + 27); // chỉ số = mã − 1
    const withLine27 = { ...draft, inventory: draft.inventory.map((l) => (l.code === "27" ? { ...l, present: true, condition: 70, photoIds: [] } : l)) };
    const err = validateDraft(withLine27, detail);
    expect(err?.field).toBe("inventory.26.photoIds");
  });

  it("V4: thiếu độ mới / số lượng sai", () => {
    const { detail, draft } = validSetup();
    const noCond = { ...draft, inventory: draft.inventory.map((l) => (l.code === "25" ? { ...l, condition: null } : l)) };
    expect(validateDraft(noCond, detail)?.field).toBe("inventory.24.condition");
    const badQty = { ...draft, inventory: draft.inventory.map((l) => (l.code === "25" ? { ...l, qty: 0 } : l)) };
    expect(validateDraft(badQty, detail)?.field).toBe("inventory.24.qty");
  });

  it("V9: 3 ảnh niêm yết ⇒ field listingPhotoIds", () => {
    const { detail, draft, photos } = validSetup();
    const three = syncPhotos(draft, photos.filter((p, _i, arr) => p.slot !== "listing" || arr.filter((x) => x.slot === "listing").indexOf(p) < 3));
    expect(three.listingPhotoIds).toHaveLength(3);
    expect(validateDraft(three, detail)?.field).toBe("listingPhotoIds");
  });

  it("V4 đứng trước V9 khi lỗi cả hai", () => {
    const { detail, draft } = validSetup();
    const both = syncPhotos(draft, []);
    expect(validateDraft(both, detail)?.field).toBe("inventory.24.photoIds");
  });

  it("V10 reject cần lý do; reject không cần ảnh niêm yết", () => {
    const { detail, draft } = validSetup();
    const rej = syncPhotos({ ...draft, recommendation: "reject", note: "  " }, []);
    // dòng present vẫn cần ảnh theo V4 nên bổ sung ảnh dòng
    const photos = draft.inventory.filter((l) => l.present).map((l) => photo(l.code));
    const rej2 = syncPhotos({ ...rej, note: "  " }, photos);
    expect(validateDraft(rej2, detail)?.field).toBe("note");
    expect(validateDraft({ ...rej2, note: "Sai diện tích" }, detail)).toBeNull();
  });

  it("V11: khoá điện tử chưa có mã + đạt ⇒ cần PIN 4–8 số", () => {
    const { draft } = validSetup();
    const detail = makeDetail({ doorCodeOnFile: false });
    expect(validateDraft(draft, detail)?.field).toBe("doorPin");
    expect(validateDraft({ ...draft, doorPin: "12a4" }, detail)?.field).toBe("doorPin");
    expect(validateDraft({ ...draft, doorPin: "123456" }, detail)).toBeNull();
    // chìa cơ không cần PIN
    expect(validateDraft(draft, makeDetail({ doorCodeOnFile: false, doorKind: "physical" }))).toBeNull();
  });

  it("V1 + V8", () => {
    const { detail, draft } = validSetup();
    const d1 = { ...draft, declared: { ...draft.declared, areaM2: { ok: false, actual: "" } } };
    expect(validateDraft(d1, detail)?.field).toBe("declared.2");
    expect(validateDraft({ ...draft, netAreaM2: "60" }, detail)?.field).toBe("netAreaM2");
    expect(validateDraft({ ...draft, netAreaM2: "" }, detail)?.field).toBe("netAreaM2");
  });

  it("dòng X cần tên", () => {
    const { detail, draft } = validSetup();
    const x = { ...draft, inventory: [...draft.inventory, { ...draft.inventory[0], code: "X1", name: " ", present: false }] };
    expect(validateDraft(x, detail)?.field).toBe("inventory.32.name");
  });

  it("fieldAnchorId đưa field con về hàng dòng", () => {
    expect(fieldAnchorId("inventory.7.photoIds")).toBe("insp-inventory-7");
    expect(fieldAnchorId("listingPhotoIds")).toBe("insp-listingPhotoIds");
    expect(fieldAnchorId("declared.2")).toBe("insp-declared-2");
  });
});

describe("W2 toSubmitDto", () => {
  it("không chứa hostId/submittedAt/avgCondition; listingPhotoIds đúng thứ tự Host sắp", () => {
    const { draft, photos } = validSetup();
    const listing = photos.filter((p) => p.slot === "listing").map((p) => p.id);
    const reordered = moveListing(listing, 0, 1); // đổi chỗ ảnh 0 và 1
    const sorted = syncPhotos({ ...draft, listingOrder: reordered }, photos);
    const dto = toSubmitDto(sorted);
    expect(Object.keys(dto)).not.toContain("hostId");
    expect(Object.keys(dto)).not.toContain("submittedAt");
    expect(Object.keys(dto)).not.toContain("avgCondition");
    expect(dto.listingPhotoIds).toEqual(reordered);
    expect(dto.listingPhotoIds[0]).toBe(listing[1]);
    expect(dto.inventory).toHaveLength(32);
    expect(dto.declared.map((d) => d.field)).toEqual(["identity", "layout", "areaM2", "furnishing", "lock"]);
  });

  it("dòng không present gửi photoIds rỗng; reject không gửi ảnh niêm yết; PIN chỉ khi đạt", () => {
    const { draft, photos } = validSetup();
    const d = syncPhotos({ ...draft, doorPin: " 4321 " }, photos);
    expect(toSubmitDto(d).doorPin).toBe("4321");
    const off = toSubmitDto(d).inventory.find((l) => l.code === "1")!;
    expect(off.present).toBe(false);
    expect(off.photoIds).toEqual([]);
    const rej = toSubmitDto({ ...d, recommendation: "reject", note: "Không đạt" });
    expect(rej.listingPhotoIds).toEqual([]);
    expect(rej.doorPin).toBeUndefined();
    expect(rej.note).toBe("Không đạt");
  });
});

describe("W3 inspectionErrorText", () => {
  const CODES_01_8 = [
    "inspection_not_found",
    "inspection_taken",
    "inspection_not_open",
    "inspection_bad_stage",
    "photo_invalid_type",
    "photo_too_small",
    "photo_too_large",
    "photo_quota",
    "photo_bad_slot",
    "report_invalid",
    "door_code_required",
    "door_code_missing",
    "storage_unavailable",
    "host_role_missing",
  ];
  it("có câu riêng cho mọi mã ở 01 §8", () => {
    for (const code of CODES_01_8) {
      const t = inspectionErrorText(code, "__fallback__");
      expect(t, code).not.toBe("__fallback__");
      expect(t.length).toBeGreaterThan(8);
    }
    expect(INSPECTION_ERROR_CODES.sort()).toEqual([...CODES_01_8].sort());
  });
  it("mã lạ ⇒ fallback; theo phản hồi: code → mất mạng → message", () => {
    expect(inspectionErrorText("xyz", "F")).toBe("F");
    expect(inspectionErrorText(undefined, "F")).toBe("F");
    expect(inspectionResErrorText({ code: "inspection_taken", status: 409 })).toContain("Inspector khác");
    expect(inspectionResErrorText({ status: 0 })).toContain("kết nối");
    expect(inspectionResErrorText({ status: 500, message: "Lỗi máy chủ" })).toBe("Lỗi máy chủ");
  });
});

describe("W4 không còn trạng thái đã bỏ ở web (ngoài vùng tương thích admin mock)", () => {
  const ROOT = join(__dirname, "..");
  const NEEDLE = "review" + "ing"; // ghép chuỗi để file test này không tự khớp
  // Vùng tương thích admin mock (SPEC-P03 §5) + hai nơi ngoài phạm vi hồ sơ này (xem report: Câu hỏi mở).
  const ALLOW = [
    "lib/mock/",
    "components/admin/",
    "components/consign/status.ts",
    "components/consign/ConsignTimeline.tsx",
    "components/portal/AdminShell.tsx",
    "tests/",
  ];
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx|css)$/.test(name)) out.push(p);
    }
    return out;
  }
  it("không file nào ngoài danh sách cho phép chứa chuỗi trạng thái đã bỏ", () => {
    const offenders = walk(ROOT)
      .map((p) => relative(ROOT, p).split("\\").join("/"))
      .filter((rel) => !ALLOW.some((a) => rel === a || rel.startsWith(a)))
      .filter((rel) => readFileSync(join(ROOT, rel), "utf8").includes(NEEDLE));
    expect(offenders).toEqual([]);
  });
});

describe("W6 draftStore", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("khoá hỏng / sai dạng ⇒ null, không ném", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v), removeItem: (k: string) => void delete store[k] });
    store[draftKey("a")] = "{không phải json";
    expect(loadDraft("a")).toBeNull();
    store[draftKey("a")] = JSON.stringify({ v: 99, draft: {} });
    expect(loadDraft("a")).toBeNull();
    store[draftKey("a")] = JSON.stringify({ v: 1, draft: { declared: 1 } });
    expect(loadDraft("a")).toBeNull();
    store[draftKey("a")] = "null";
    expect(loadDraft("a")).toBeNull();
  });

  it("storage ném lỗi ở mọi thao tác ⇒ bỏ qua", () => {
    const boom = () => {
      throw new Error("denied");
    };
    vi.stubGlobal("localStorage", { getItem: boom, setItem: boom, removeItem: boom });
    expect(loadDraft("a")).toBeNull();
    expect(() => saveDraft("a", blankDraft(makeDetail()))).not.toThrow();
    expect(() => clearDraft("a")).not.toThrow();
  });

  it("không có localStorage (SSR) ⇒ null", () => {
    expect(loadDraft("a")).toBeNull();
  });

  it("lưu rồi đọc lại; PIN không được ghi; xoá được", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v), removeItem: (k: string) => void delete store[k] });
    const d = { ...blankDraft(makeDetail()), doorPin: "123456", note: "nháp" };
    saveDraft("a", d);
    expect(store[draftKey("a")]).not.toContain("123456");
    const back = loadDraft("a");
    expect(back?.note).toBe("nháp");
    expect(back?.doorPin).toBe("");
    expect(isDraftCompatible(back!, makeDetail())).toBe(true);
    clearDraft("a");
    expect(loadDraft("a")).toBeNull();
  });
});

describe("blankDraft / syncPhotos / tiến độ", () => {
  it("tick sẵn dòng 25–29; căn có nội thất tick thêm 1–27", () => {
    const empty = blankDraft(makeDetail({ furnished: false }));
    expect(empty.inventory.filter((l) => l.present).map((l) => l.code)).toEqual(["25", "26", "27", "28", "29"]);
    const full = blankDraft(makeDetail({ furnished: true }));
    expect(full.inventory.filter((l) => l.present)).toHaveLength(29);
    expect(full.furnishing).toBe("full");
    expect(empty.furnishing).toBe("empty");
  });

  it("syncPhotos gắn theo slot, giữ thứ tự ảnh niêm yết Host sắp, ảnh mới nối cuối", () => {
    const base = blankDraft(makeDetail());
    const a = photo("listing", "bedroom");
    const b = photo("listing", "kitchen");
    const line = photo("25");
    const s1 = syncPhotos({ ...base, listingOrder: [b.id, a.id] }, [a, b, line]);
    expect(s1.listingPhotoIds).toEqual([b.id, a.id]);
    expect(s1.inventory.find((l) => l.code === "25")!.photoIds).toEqual([line.id]);
    const c = photo("listing", "view");
    expect(syncPhotos({ ...base, listingOrder: [b.id, a.id] }, [a, b, c]).listingPhotoIds).toEqual([b.id, a.id, c.id]);
    // ảnh đã xoá khỏi server biến mất khỏi thứ tự
    expect(syncPhotos({ ...base, listingOrder: [b.id, a.id] }, [a]).listingPhotoIds).toEqual([a.id]);
  });

  it("moveListing chặn ở biên", () => {
    expect(moveListing(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveListing(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
    expect(moveListing(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
  });

  it("draftProgress + badge + đếm done", () => {
    const { draft } = validSetup();
    const p = draftProgress(draft);
    expect(p).toMatchObject({ presentLines: 5, linesWithPhotos: 5, listingCount: 4, avgCondition: 80, lowLines: 0 });
    expect(boardBadge({ mine: [1, 2], open: [3] })).toBe(3);
    expect(doneCounts([{ stage: "approved" }, { stage: "rejected" }, { stage: "approved" }])).toEqual({ approved: 2, rejected: 1 });
  });

  it("isDraftCompatible từ chối nháp lệch catalog", () => {
    const detail = makeDetail();
    const d = blankDraft(detail);
    expect(isDraftCompatible({ ...d, inventory: d.inventory.slice(1) }, detail)).toBe(false);
    expect(isDraftCompatible({ ...d, inventory: [...d.inventory, { ...d.inventory[0], code: "X3" }] }, detail)).toBe(false);
  });
});

describe("uploadQueue", () => {
  const ok = (id = "p"): ApiResponse<InspectionPhotoView> => ({ ok: true, status: 200, data: { ...photo("1"), id } });
  const fail = (status: number, code?: string): ApiResponse<InspectionPhotoView> => ({ ok: false, status, code, data: {} as InspectionPhotoView });
  const file = (n: string) => new File(["x"], n, { type: "image/jpeg" });

  it("photo_too_large ⇒ nén lại và thử ĐÚNG 1 lần", async () => {
    const send = vi.fn().mockResolvedValueOnce(fail(413, "photo_too_large")).mockResolvedValueOnce(ok("p2"));
    const recompress = vi.fn(async () => file("small.jpg"));
    const out = await uploadWithRecovery({ file: file("big.jpg"), send, recompress });
    expect(out.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    expect(recompress).toHaveBeenCalledTimes(1);
  });

  it("vẫn quá nặng sau khi nén ⇒ báo lỗi, không thử lần 3", async () => {
    const send = vi.fn().mockResolvedValue(fail(413, "photo_too_large"));
    const out = await uploadWithRecovery({ file: file("a.jpg"), send, recompress: async (f) => f });
    expect(out).toMatchObject({ ok: false, code: "photo_too_large", retryable: false });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("storage_unavailable / mất mạng ⇒ retryable; photo_too_small thì không", async () => {
    expect(isRetryableUpload({ status: 503, code: "storage_unavailable" })).toBe(true);
    expect(isRetryableUpload({ status: 0 })).toBe(true);
    expect(isRetryableUpload({ status: 422, code: "photo_too_small" })).toBe(false);
    const out = await uploadWithRecovery({ file: file("a.jpg"), send: async () => fail(0), recompress: async (f) => f });
    expect(out).toMatchObject({ ok: false, retryable: true });
  });

  it("TaskLimiter không bao giờ chạy quá 3 tác vụ song song", async () => {
    const lim = new TaskLimiter(3);
    let active = 0;
    let peak = 0;
    const task = async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    };
    await Promise.all(Array.from({ length: 10 }, () => lim.run(task)));
    expect(peak).toBe(3);
    expect(active).toBe(0);
  });
});
