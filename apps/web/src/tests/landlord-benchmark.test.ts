import { describe, expect, it } from "vitest";
import { getBenchmark, netIncome, rentVerdict } from "@/lib/landlord/benchmark";

describe("định giá tham chiếu khi ký gửi", () => {
  it("phân khu không có bảng riêng ⇒ dùng bảng mặc định", () => {
    expect(getBenchmark("The Sapphire 1", "1PN").avg).toBe(8_000_000);
    expect(getBenchmark("The Zenpark", "1PN").avg).toBe(8_800_000);
  });

  it("rẻ hơn mặt bằng ≥ 10% ⇒ Căn hời; đúng 10% vẫn tính", () => {
    const b = getBenchmark("The Sapphire 1", "1PN"); // avg 8.0tr
    expect(rentVerdict(7_200_000, b)).toMatchObject({ isDeal: true, isHigh: false });
    expect(rentVerdict(7_300_000, b).isDeal).toBe(false);
  });

  it("cao hơn mặt bằng ≥ 15% ⇒ cảnh báo; chưa nhập giá ⇒ không gắn nhãn nào", () => {
    const b = getBenchmark("The Sapphire 1", "1PN");
    expect(rentVerdict(9_200_000, b)).toMatchObject({ isDeal: false, isHigh: true });
    expect(rentVerdict(0, b)).toEqual({ diff: 0, isDeal: false, isHigh: false });
  });

  it("dòng tiền thực nhận = giá − phí dịch vụ theo % Admin đặt, làm tròn đồng", () => {
    expect(netIncome(9_000_000, 5)).toEqual({ fee: 450_000, net: 8_550_000 });
    expect(netIncome(9_000_001, 5)).toEqual({ fee: 450_000, net: 8_550_001 });
    expect(netIncome(0, 5)).toEqual({ fee: 0, net: 0 });
  });
});
