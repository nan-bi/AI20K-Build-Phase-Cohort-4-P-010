import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pricingDecisionOutcome, pricingDiff } from "@/lib/landlord/pricing";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { ConsignTimeline } from "@/components/consign/ConsignTimeline";
import { landlordApi } from "@/lib/landlord/api";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

const proposal = { rent: 8_500_000, securityDeposit: 17_000_000, reason: "Giá cùng tầng thấp hơn", proposedAt: "2026-10-07T01:00:00Z", original: { rent: 9_000_000, securityDeposit: 18_000_000 } };

describe("chủ duyệt giá", () => {
  it("pricingDiff so với bản chủ khai", () => {
    expect(pricingDiff(proposal)).toEqual({ rentChanged: true, depositChanged: true, rentDelta: -500_000, depositDelta: -1_000_000 });
    expect(pricingDiff({ ...proposal, securityDeposit: 18_000_000 }).depositChanged).toBe(false);
  });

  it("bảng lỗi → hành vi caller: 409 tải lại, 403 về danh sách", () => {
    expect(pricingDecisionOutcome({ ok: true, status: 200 }).kind).toBe("done");
    expect(pricingDecisionOutcome({ ok: false, status: 409, code: "PRICING_NOT_PENDING" }).kind).toBe("reload");
    expect(pricingDecisionOutcome({ ok: false, status: 409 }).kind).toBe("reload");
    expect(pricingDecisionOutcome({ ok: false, status: 403, code: "NOT_OWNER" }).kind).toBe("leave");
    expect(pricingDecisionOutcome({ ok: false, status: 500, message: "Lỗi" })).toEqual({ kind: "error", message: "Lỗi" });
  });

  it("decidePricing gọi đúng route + body", async () => {
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ stage: "rejected", unitCode: "X", listedAt: null }), { status: 200 });
    });
    const res = await landlordApi.decidePricing("abc-1", "decline");
    vi.unstubAllGlobals();
    expect(res.ok).toBe(true);
    expect(calls).toEqual([{ url: "/api/v1/landlord/consignments/abc-1/pricing-decision", body: JSON.stringify({ decision: "decline" }) }]);
  });

  it("trạng thái awaiting_landlord có nhãn + gợi ý", () => {
    expect(CONSIGN_STATUS_META.awaiting_landlord.label).toBe("Chờ bạn đồng ý giá");
  });

  it("ConsignTimeline có bước 'Chờ bạn đồng ý giá' giữa Thẩm định và kết quả; hiện là bước hiện tại khi awaiting_landlord", () => {
    const html = renderToStaticMarkup(createElement(ConsignTimeline, { c: { status: "awaiting_landlord", signedAt: "2026-10-04T01:00:00Z", hostAcceptedAt: "2026-10-04T02:00:00Z", report: { submittedAt: "2026-10-05T01:00:00Z" } }, now: 0 }));
    const labels = ["Thẩm định", "Chờ bạn đồng ý giá", "Kết quả"].map((l) => html.indexOf(`>${l}<`));
    expect(labels.every((i) => i > -1)).toBe(true);
    expect(labels[0]).toBeLessThan(labels[1]);
    expect(labels[1]).toBeLessThan(labels[2]);
    const li = html.split("<li").find((x) => x.includes(">Chờ bạn đồng ý giá<")) ?? "";
    expect(li).toContain('aria-current="step"');
    const done = renderToStaticMarkup(createElement(ConsignTimeline, { c: { status: "approved", decidedAt: "2026-10-06T01:00:00Z", report: { submittedAt: "2026-10-05T01:00:00Z" } }, now: 0 }));
    expect((done.split("<li").find((x) => x.includes(">Chờ bạn đồng ý giá<")) ?? "")).not.toContain("aria-current");
    expect(done).toContain("Đã niêm yết");
  });

  it("thẻ so sánh 2 cột + 2 nút; hộp xác nhận đóng hồ sơ", async () => {
    const { PricingProposalCard } = await import("@/components/consign/PricingProposalCard");
    const html = renderToStaticMarkup(createElement(PricingProposalCard, { consignmentId: "abc", proposal, onReload: () => {} }));
    for (const t of ["Bạn khai", "Thẩm định đề xuất", "9.000.000đ", "8.500.000đ", "18.000.000đ", "17.000.000đ", "Giá cùng tầng thấp hơn", "Đồng ý giá mới", "Không đồng ý — đóng hồ sơ"]) {
      expect(html, t).toContain(t);
    }
    // Hộp xác nhận chỉ dựng khi mở (Modal) ⇒ kiểm nguồn: có hộp xác nhận trước khi gọi decline.
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(__dirname, "../components/consign/PricingProposalCard.tsx"), "utf8");
    expect(src).toContain("Căn sẽ không được đăng và hồ sơ ký gửi này đóng lại");
    expect(src).toMatch(/onClick=\{\(\) => setConfirmDecline\(true\)\}/); // nút "Không đồng ý" chỉ mở hộp xác nhận
    expect(src).toMatch(/onClick=\{\(\) => void decide\("decline"\)\}/); // gọi API chỉ ở nút trong hộp
  });
});
