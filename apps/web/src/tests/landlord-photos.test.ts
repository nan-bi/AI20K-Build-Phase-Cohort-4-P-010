import { describe, expect, it } from "vitest";
import { COMPRESS_STEPS, fitWithin, toJpegName } from "@/lib/landlord/compressPhoto";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_RAW_PHOTO_BYTES, checkPhotoFiles, tooBigAfterCompress, type PickedFile } from "@/lib/landlord/photos";

const f = (name: string, over: Partial<PickedFile> = {}): PickedFile => ({ name, size: 1000, type: "image/jpeg", lastModified: 1, ...over });

describe("checkPhotoFiles — kiểm tra ảnh trước khi tải lên", () => {
  it("nhận JPG/PNG/WebP hợp lệ", () => {
    const r = checkPhotoFiles([], [f("a.jpg"), f("b.png", { type: "image/png" }), f("c.webp", { type: "image/webp" })]);
    expect(r.accepted).toHaveLength(3);
    expect(r.errors).toEqual([]);
  });

  it("từ chối file không phải ảnh; HEIC (iPhone) có thông báo riêng", () => {
    const r = checkPhotoFiles([], [f("doc.pdf", { type: "application/pdf" }), f("IMG_1.HEIC", { type: "" }), f("x.svg", { type: "image/svg+xml" })]);
    expect(r.accepted).toEqual([]);
    expect(r.errors[0]).toContain("không phải ảnh");
    expect(r.errors[1]).toContain("HEIC");
    expect(r.errors[2]).toContain("không phải ảnh");
  });

  it("ảnh gốc điện thoại vài MB vẫn được nhận để nén; quá 20MB thì từ chối", () => {
    const r = checkPhotoFiles([], [f("phone.jpg", { size: 8 * 1024 * 1024 }), f("huge.jpg", { size: MAX_RAW_PHOTO_BYTES + 1 })]);
    expect(r.accepted.map((x) => x.name)).toEqual(["phone.jpg"]);
    expect(r.errors[0]).toContain("quá lớn");
  });

  it("sau khi nén: ≤3MB được tải, hơn 3MB bị chặn kèm thông báo", () => {
    expect(tooBigAfterCompress(f("a.jpg", { size: MAX_PHOTO_BYTES }))).toBeNull();
    expect(tooBigAfterCompress(f("b.jpg", { size: MAX_PHOTO_BYTES + 1 }))).toContain("tối đa 3MB");
  });

  it("chọn lại đúng ảnh đã có thì bỏ qua lặng lẽ, không báo lỗi", () => {
    const a = f("a.jpg");
    const r = checkPhotoFiles([a], [f("a.jpg"), f("b.jpg", { lastModified: 2 })]);
    expect(r.accepted.map((x) => x.name)).toEqual(["b.jpg"]);
    expect(r.errors).toEqual([]);
  });

  it("giới hạn tổng 8 ảnh, tính cả ảnh đã tải lên máy chủ", () => {
    const current = Array.from({ length: 5 }, (_, i) => f(`c${i}.jpg`, { lastModified: i }));
    const picked = Array.from({ length: 4 }, (_, i) => f(`n${i}.jpg`, { lastModified: 100 + i }));
    const r = checkPhotoFiles(current, picked, 2); // 2 đã lên + 5 đang chọn → còn chỗ cho 1
    expect(r.accepted).toHaveLength(MAX_PHOTOS - 2 - 5);
    expect(r.errors).toHaveLength(3);
    expect(r.errors[0]).toContain(`${MAX_PHOTOS} ảnh`);
  });
});

describe("checkPhotoFiles — ảnh đã nén vẫn bị nhận ra là trùng", () => {
  it("ảnh gốc IMG.png (4MB) và bản nén IMG.jpg (300KB) có cùng lastModified → chọn lại bản gốc bị bỏ qua", () => {
    const compressed = f("IMG.jpg", { size: 300_000, lastModified: 77 });
    const r = checkPhotoFiles([compressed], [f("IMG.png", { type: "image/png", size: 4_000_000, lastModified: 77 })]);
    expect(r.accepted).toEqual([]);
    expect(r.errors).toEqual([]);
  });
});

describe("nén ảnh", () => {
  it("fitWithin: thu nhỏ theo cạnh dài, giữ tỉ lệ, không bao giờ phóng to", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200, scale: 0.4 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600, scale: 0.4 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600, scale: 1 });
    expect(fitWithin(1, 5000, 1600).width).toBe(1);
  });
  it("các mức nén giảm dần để ảnh khó nén vẫn xuống dưới trần", () => {
    const sides = COMPRESS_STEPS.map((s) => s.maxSide);
    expect(sides).toEqual([...sides].sort((a, b) => b - a));
    expect(COMPRESS_STEPS[0].maxSide).toBeLessThanOrEqual(1600);
  });
  it("đổi đuôi sang .jpg, chỉ thay đuôi cuối", () => {
    expect(toJpegName("phong.khach.PNG")).toBe("phong.khach.jpg");
    expect(toJpegName("noext")).toBe("noext.jpg");
  });
});
