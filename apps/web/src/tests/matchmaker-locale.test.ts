import { describe, expect, it } from "vitest";
import { emptyCriteria, parseQuery } from "@/lib/tenant/matchmaker";

describe("English home-search requests", () => {
  it("extracts bedroom count, neighborhood, and a million-VND budget", () => {
    const result = parseQuery("2 bedrooms in Sapphire 2 under 12 million", emptyCriteria());

    expect(result.patch.layouts).toEqual(["2PN"]);
    expect(result.patch.zones).toEqual(["sapphire2"]);
    expect(result.patch.budget).toBe(12_000_000);
  });

  it("recognizes a studio, furnishing, and air-conditioning request", () => {
    const result = parseQuery("fully furnished studio with air conditioning", emptyCriteria());

    expect(result.patch.layouts).toEqual(["Studio"]);
    expect(result.patch.furnishing).toBe("full");
    expect(result.patch.items).toContain("ac");
  });

  it("accepts the common ten-million shorthand", () => {
    const result = parseQuery("high floor, budget up to 10m", emptyCriteria());

    expect(result.patch.floor).toBe("high");
    expect(result.patch.budget).toBe(10_000_000);
  });
});
