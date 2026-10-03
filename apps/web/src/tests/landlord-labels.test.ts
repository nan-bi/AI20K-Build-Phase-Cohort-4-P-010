import { describe, expect, it } from "vitest";
import { errorText } from "@/lib/landlord/api";
import { niceScale } from "@/components/charts/scale";
import type { MandateStatus, UnitStatus } from "@/lib/landlord/types";
import { axisMillions, daysLeft, exitBlockReason, hoursLeft, unitDoor, unitLabel } from "@/lib/landlord/labels";

describe("unitDoor — số căn suy từ mã căn", () => {
  it("tầng đệm 0 (dữ liệu import): VHOP-S1.02-0701, tầng 7 → 01", () => {
    expect(unitDoor({ unitCode: "VHOP-S1.02-0701", floor: 7 })).toBe("01");
  });
  it("tầng viết thường (căn tạo qua ký gửi): VHOP-S1.02-1208, tầng 12 → 08", () => {
    expect(unitDoor({ unitCode: "VHOP-S1.02-1208", floor: 12 })).toBe("08");
  });
  it("mã căn không theo mẫu → trả nguyên phần đuôi, không ném lỗi", () => {
    expect(unitDoor({ unitCode: "VHOP-S1.02-12A08", floor: 12 })).toBe("A08");
    expect(unitDoor({ unitCode: "LẠ", floor: 3 })).toBe("LẠ");
  });
  it("nhãn đầy đủ", () => {
    expect(unitLabel({ building: "BE3", floor: 24, unitCode: "VHOP-BE3-2402" })).toBe("BE3 · Tầng 24 · Căn 02");
  });
});

describe("đồng hồ đếm ngược", () => {
  const now = new Date("2026-10-02T00:00:00Z").getTime();
  it("hoursLeft làm tròn lên, không âm, null khi không có mốc", () => {
    expect(hoursLeft("2026-10-02T01:30:00Z", now)).toBe(2);
    expect(hoursLeft("2026-10-01T00:00:00Z", now)).toBe(0);
    expect(hoursLeft(null, now)).toBeNull();
  });
  it("daysLeft: 15 ngày báo trước → 15, quá hạn → 0", () => {
    expect(daysLeft("2026-10-17T00:00:00Z", now)).toBe(15);
    expect(daysLeft("2026-09-01T00:00:00Z", now)).toBe(0);
  });
});

describe("errorText", () => {
  it("ưu tiên message của backend; message dạng mảng (ValidationPipe) được ghép lại", () => {
    expect(errorText({ status: 409, message: "Căn đang cho thuê" })).toBe("Căn đang cho thuê");
    expect(errorText({ status: 400, message: ["Giá thuê quá thấp", "Tầng sai"] as unknown as string })).toBe("Giá thuê quá thấp Tầng sai");
  });
  it("mất kết nối (status 0) và lỗi trống có thông báo riêng", () => {
    expect(errorText({ status: 0, message: undefined })).toBe("Không kết nối được máy chủ.");
    expect(errorText({ status: 500, message: undefined })).toBe("Có lỗi xảy ra, thử lại sau.");
  });
});

describe("trục biểu đồ tiền (lỗi nhãn 0.000001tr / 5e-7tr khi mọi tháng bằng 0)", () => {
  const ticksFor = (max: number, floor: number) => {
    const { max: top, step } = niceScale(Math.max(max, floor));
    return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => axisMillions(i * step));
  };

  it("mọi cột bằng 0: thang đo có sàn 1 triệu → nhãn tròn, sạch", () => {
    expect(ticksFor(0, 1_000_000)).toEqual(["0", "0.5tr", "1tr"]);
  });
  it("không sàn (như trước khi sửa) thì ra đúng loại nhãn lỗi — test này chứng minh sàn là cần thiết", () => {
    expect(ticksFor(0, 1).some((t) => /e-|0\.0/.test(t) || t === "0tr")).toBe(true);
  });
  it("giá trị thật: 9,5tr và 28tr", () => {
    expect(ticksFor(9_500_000, 1_000_000)).toEqual(["0", "5tr", "10tr"]);
    expect(axisMillions(28_000_000)).toBe("28tr");
  });
});

describe("exitBlockReason — vì sao căn chưa thoát được ủy quyền", () => {
  const row = (status: UnitStatus, mandate: MandateStatus | null) => ({ status, mandate: mandate && { status: mandate } });
  it("căn trống + ủy quyền hiệu lực → thoát được", () => {
    expect(exitBlockReason(row("available", "active"))).toBeNull();
    expect(exitBlockReason(row("viewing", "active"))).toBeNull();
  });
  it("căn chưa có bản ghi ủy quyền (trường hợp dữ liệu nhập thẳng DB) → có lý do, không ném lỗi", () => {
    expect(exitBlockReason(row("available", null))).toContain("chưa có ủy quyền");
  });
  it("ủy quyền chưa hiệu lực/đã kết thúc/đang thoát → có lý do tương ứng", () => {
    expect(exitBlockReason(row("available", "pending_inspection"))).toContain("chờ thẩm định");
    expect(exitBlockReason(row("available", "ended"))).toContain("kết thúc");
    expect(exitBlockReason(row("available", "exiting"))).toContain("báo trước");
  });
  it("căn đang giữ chỗ / cho thuê → chặn", () => {
    expect(exitBlockReason(row("holding", "active"))).toContain("giữ căn");
    expect(exitBlockReason(row("rented", "active"))).toContain("cho thuê");
  });
});
