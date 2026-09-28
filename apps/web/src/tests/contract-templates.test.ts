import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// Store chạy trên localStorage của trình duyệt; dựng một window tối giản cho môi trường node trước khi import actions
const mem = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
  addEventListener: () => {},
});

import * as actions from "@/lib/mock/actions";
import {
  CONTRACT_TEMPLATES,
  TEMPLATE_STEPS,
  templateById,
  templateForKind,
  templatesForKind,
  stepsForTemplate,
  templatesForParty,
} from "@/lib/mock/contract-templates";
import type { TemplateKind } from "@/lib/mock/contract-templates";

const ROOT_REPO = path.resolve(process.cwd(), "../..");

describe("Contract Templates Catalog - C1-C8 (WP1)", () => {
  // C1: kích thước & id
  it("C1: 32 mẫu, id duy nhất, đúng thứ tự SPEC-P01 §1; 18 bước, id S01…S18", () => {
    expect(CONTRACT_TEMPLATES).toHaveLength(32);
    const templateIds = CONTRACT_TEMPLATES.map((t) => t.id);
    const uniqueTemplateIds = new Set(templateIds);
    expect(uniqueTemplateIds.size).toBe(32);

    const EXPECTED_TEMPLATE_IDS = [
      "CORE-00", "CORE-01", "CORE-02", "CORE-03", "CORE-04", "CORE-05", "CORE-06", "CORE-07",
      "TN-01", "TN-02", "TN-03", "TN-04", "TN-05", "TN-06",
      "LL-01", "LL-02", "LL-03", "LL-04", "LL-05", "LL-06",
      "FH-01", "FH-02", "FH-03", "FH-04", "FH-05", "FH-06",
      "ADM-01", "ADM-02", "ADM-03", "ADM-04", "ADM-05", "ADM-06",
    ];
    expect(templateIds).toEqual(EXPECTED_TEMPLATE_IDS);

    expect(TEMPLATE_STEPS).toHaveLength(18);
    const stepIds = TEMPLATE_STEPS.map((s) => s.id);
    const EXPECTED_STEP_IDS = Array.from({ length: 18 }, (_, i) => `S${String(i + 1).padStart(2, "0")}`);
    expect(stepIds).toEqual(EXPECTED_STEP_IDS);
  });

  // C2: file tồn tại
  it("C2: fs.existsSync(root/file) cho cả 32; group khớp thư mục", () => {
    for (const t of CONTRACT_TEMPLATES) {
      const fullPath = path.join(ROOT_REPO, t.file);
      expect(fs.existsSync(fullPath), `File not found: ${t.file} (template ${t.id})`).toBe(true);

      if (t.group === "core") {
        expect(t.file.startsWith("legal/0"), `Core file should be in legal/ root: ${t.file}`).toBe(true);
      } else {
        expect(t.file.startsWith(`legal/${t.group}/`), `File path should match group: ${t.file} vs group ${t.group}`).toBe(true);
      }
    }
  });

  // C3: refCode
  it("C3: mẫu có refCode => nội dung file chứa chuỗi đó; đúng 29 mẫu có refCode (CORE-03/04/05 không)", () => {
    let countWithRef = 0;
    for (const t of CONTRACT_TEMPLATES) {
      if (t.refCode) {
        countWithRef++;
        const fullPath = path.join(ROOT_REPO, t.file);
        const content = fs.readFileSync(fullPath, "utf-8");
        expect(content, `File ${t.file} must contain refCode "${t.refCode}"`).toContain(t.refCode);
      } else {
        expect(["CORE-03", "CORE-04", "CORE-05"]).toContain(t.id);
      }
    }
    expect(countWithRef).toBe(29);
  });

  // C4: binds
  it("C4: mỗi kind trong 4 kind có đúng 1 mẫu binds type contract; templateForKind hoạt động chuẩn", () => {
    const KINDS: TemplateKind[] = ["mandate", "holding", "lease", "partnership"];
    for (const kind of KINDS) {
      const bound = CONTRACT_TEMPLATES.filter((t) => t.binds === kind);
      expect(bound, `Kind ${kind} should have exactly 1 bound template`).toHaveLength(1);
      expect(bound[0].type).toBe("contract");
    }

    expect(templateForKind("mandate").id).toBe("CORE-01");
    expect(templateForKind("holding").id).toBe("CORE-02");
    expect(templateForKind("lease").id).toBe("CORE-06");
    expect(templateForKind("partnership").id).toBe("FH-01");
  });

  // C5: tham chiếu
  it("C5: mọi id trong primary, attached, related tồn tại; không mẫu nào related chính nó", () => {
    const templateIdSet = new Set(CONTRACT_TEMPLATES.map((t) => t.id));

    for (const s of TEMPLATE_STEPS) {
      if (s.primary) {
        expect(templateIdSet.has(s.primary), `Step ${s.id} primary ${s.primary} must exist`).toBe(true);
      }
      for (const att of s.attached) {
        expect(templateIdSet.has(att), `Step ${s.id} attached ${att} must exist`).toBe(true);
      }
    }

    for (const t of CONTRACT_TEMPLATES) {
      if (t.related) {
        for (const rel of t.related) {
          expect(templateIdSet.has(rel), `Template ${t.id} related ${rel} must exist`).toBe(true);
        }
        expect(t.related.includes(t.id), `Template ${t.id} cannot be related to itself`).toBe(false);
      }
    }
  });

  // C6: action thật
  it("C6: implemented === !!action; action là hàm export thật; đúng 4 bước chưa có luồng (S07, S16, S17, S18)", () => {
    const unimplementedSteps: string[] = [];
    const actionsMap = actions as unknown as Record<string, unknown>;

    for (const s of TEMPLATE_STEPS) {
      expect(s.implemented).toBe(!!s.action);
      if (s.action) {
        expect(typeof actionsMap[s.action], `Step ${s.id} action ${s.action} must be a function in actions.ts`).toBe("function");
      } else {
        unimplementedSteps.push(s.id);
      }
    }

    expect(unimplementedSteps).toEqual(["S07", "S16", "S17", "S18"]);
  });

  // C7: templatesForKind
  it("C7: templatesForKind lease & holding trả về primary và attached đúng chuẩn", () => {
    const leaseBundle = templatesForKind("lease");
    expect(leaseBundle.primary.id).toBe("CORE-06");
    const leaseAttachedIds = leaseBundle.attached.map((t) => t.id);
    expect(leaseAttachedIds).toContain("CORE-04");
    expect(leaseAttachedIds).toContain("LL-04");
    expect(leaseAttachedIds).toContain("CORE-07");
    expect(leaseAttachedIds).not.toContain("CORE-06");

    const holdingBundle = templatesForKind("holding");
    expect(holdingBundle.primary.id).toBe("CORE-02");
    const holdingAttachedIds = holdingBundle.attached.map((t) => t.id);
    expect(holdingAttachedIds).toEqual(["TN-02", "CORE-07", "CORE-00"]);
  });

  // C8: stepsForTemplate / templatesForParty
  it("C8: stepsForTemplate('LL-03') = S07, S09; templatesForParty('host') không chứa sop và chứa FH-01", () => {
    const ll03Steps = stepsForTemplate("LL-03").map((s) => s.id);
    expect(ll03Steps).toEqual(["S07", "S09"]);

    const hostTemplates = templatesForParty("host");
    for (const t of hostTemplates) {
      expect(t.type).not.toBe("sop");
    }
    const hostTemplateIds = hostTemplates.map((t) => t.id);
    expect(hostTemplateIds).toContain("FH-01");

    // templateById lookup
    expect(templateById("CORE-01")?.title).toBe("HĐ ký gửi quản lý cho thuê độc quyền");
    expect(templateById("NON-EXISTENT")).toBeUndefined();
  });
});
