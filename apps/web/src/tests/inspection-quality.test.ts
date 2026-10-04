import { describe, it, expect } from "vitest";
import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  PHOTO_MIN_SIDE_PX,
  QUALITY_MESSAGE,
  SHARPNESS_MIN,
  canOverride,
  judgePhoto,
  laplacianVariance,
  meanBrightness,
  type PhotoMetrics,
} from "@/lib/inspection/photoQuality";

const good: PhotoMetrics = { width: 1280, height: 960, sharpness: 200, brightness: 128 };

describe("inspection photoQuality (W5 / P2-8)", () => {
  it("ngưỡng khớp 01-CONTRACTS §4", () => {
    expect([PHOTO_MIN_SIDE_PX, SHARPNESS_MIN, BRIGHTNESS_MIN, BRIGHTNESS_MAX]).toEqual([200, 60, 40, 235]);
  });

  it("judgePhoto: ảnh tốt đạt, 4 ca biên bị chặn đúng lý do", () => {
    expect(judgePhoto(good)).toEqual({ ok: true });
    expect(judgePhoto({ ...good, width: 640, height: 199 })).toEqual({ ok: false, reason: "too_small" });
    expect(judgePhoto({ ...good, brightness: 39.9 })).toEqual({ ok: false, reason: "too_dark" });
    expect(judgePhoto({ ...good, brightness: 235.1 })).toEqual({ ok: false, reason: "too_bright" });
    expect(judgePhoto({ ...good, sharpness: 59.9 })).toEqual({ ok: false, reason: "blurry" });
  });

  it("judgePhoto: đúng ngưỡng thì đạt (biên đóng)", () => {
    expect(judgePhoto({ width: 480, height: 800, sharpness: 60, brightness: 40 })).toEqual({ ok: true });
    expect(judgePhoto({ width: 800, height: 480, sharpness: 60, brightness: 235 })).toEqual({ ok: true });
  });

  it("judgePhoto: thứ tự too_small → too_dark → too_bright → blurry", () => {
    expect(judgePhoto({ width: 100, height: 100, sharpness: 0, brightness: 0 })).toEqual({ ok: false, reason: "too_small" });
    expect(judgePhoto({ ...good, sharpness: 0, brightness: 0 })).toEqual({ ok: false, reason: "too_dark" });
    expect(judgePhoto({ ...good, sharpness: 0, brightness: 255 })).toEqual({ ok: false, reason: "too_bright" });
  });

  it("laplacianVariance: ảnh phẳng = 0, bàn cờ > 1000, ảnh quá nhỏ = 0", () => {
    const w = 16;
    const h = 16;
    const flat = new Uint8ClampedArray(w * h).fill(128);
    expect(laplacianVariance(flat, w, h)).toBe(0);
    const board = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) board[y * w + x] = (x + y) % 2 ? 255 : 0;
    expect(laplacianVariance(board, w, h)).toBeGreaterThan(1000);
    expect(laplacianVariance(new Uint8ClampedArray(4), 2, 2)).toBe(0);
  });

  it("meanBrightness", () => {
    expect(meanBrightness(new Uint8ClampedArray([0, 100, 200]))).toBe(100);
    expect(meanBrightness(new Uint8ClampedArray(0))).toBe(0);
  });

  it("canOverride: chỉ ảnh mờ còn ≥ 60% ngưỡng; too_small/tối/cháy luôn chặn", () => {
    const blurOk = { ...good, sharpness: 40 };
    expect(canOverride(judgePhoto(blurOk), blurOk)).toBe(true);
    const blurBad = { ...good, sharpness: 35 };
    expect(canOverride(judgePhoto(blurBad), blurBad)).toBe(false);
    const small = { ...good, width: 150, height: 150, sharpness: 50 };
    expect(canOverride(judgePhoto(small), small)).toBe(false);
    const dark = { ...good, brightness: 10 };
    expect(canOverride(judgePhoto(dark), dark)).toBe(false);
    expect(canOverride(judgePhoto(good), good)).toBe(false);
  });

  it("có thông điệp tiếng Việt cho mọi lý do", () => {
    for (const r of ["too_small", "blurry", "too_dark", "too_bright"] as const) expect(QUALITY_MESSAGE[r].length).toBeGreaterThan(10);
  });
});
