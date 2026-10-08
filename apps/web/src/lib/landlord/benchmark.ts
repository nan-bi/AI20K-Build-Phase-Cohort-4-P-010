import type { LayoutKind } from "./types";

/** Giá thuê tham chiếu (đ/tháng) theo phân khu và loại căn — chỉ để chủ nhà so khi nhập giá, KHÔNG phải số liệu niêm yết. */
export interface RentBenchmark {
  avg: number;
  min: number;
  max: number;
}

const DEFAULT_TABLE: Record<LayoutKind, RentBenchmark> = {
  Studio: { avg: 6_500_000, min: 5_800_000, max: 7_200_000 },
  "1PN": { avg: 8_000_000, min: 7_200_000, max: 8_800_000 },
  "2PN": { avg: 10_000_000, min: 9_000_000, max: 11_500_000 },
  "3PN": { avg: 13_500_000, min: 12_000_000, max: 15_500_000 },
};

const BY_ZONE: Record<string, Record<LayoutKind, RentBenchmark>> = {
  "The Zenpark": {
    Studio: { avg: 7_000_000, min: 6_300_000, max: 7_800_000 },
    "1PN": { avg: 8_800_000, min: 8_000_000, max: 9_800_000 },
    "2PN": { avg: 11_500_000, min: 10_500_000, max: 13_000_000 },
    "3PN": { avg: 15_000_000, min: 13_500_000, max: 17_500_000 },
  },
  "Masteri Waterfront": {
    Studio: { avg: 7_500_000, min: 6_800_000, max: 8_500_000 },
    "1PN": { avg: 9_500_000, min: 8_500_000, max: 10_800_000 },
    "2PN": { avg: 12_500_000, min: 11_200_000, max: 14_500_000 },
    "3PN": { avg: 16_500_000, min: 15_000_000, max: 19_500_000 },
  },
};

export function getBenchmark(zoneName: string, layout: LayoutKind): RentBenchmark {
  return (BY_ZONE[zoneName] ?? DEFAULT_TABLE)[layout] ?? DEFAULT_TABLE[layout];
}

/** Ngưỡng huy hiệu "Căn hời phân khu" (AGENTS.md): rẻ hơn mặt bằng ≥ 10%. Cao hơn ≥ 15% thì cảnh báo thời gian tìm khách. */
export const DEAL_THRESHOLD = 0.1;
export const HIGH_THRESHOLD = 0.15;

export interface RentVerdict {
  /** (avg − giá) / avg; dương = rẻ hơn mặt bằng. 0 khi chưa nhập giá. */
  diff: number;
  isDeal: boolean;
  isHigh: boolean;
}

export function rentVerdict(rent: number, bench: RentBenchmark): RentVerdict {
  const diff = bench.avg > 0 && rent > 0 ? (bench.avg - rent) / bench.avg : 0;
  return { diff, isDeal: diff >= DEAL_THRESHOLD, isHigh: diff <= -HIGH_THRESHOLD };
}

/** Phí dịch vụ và tiền thực nhận hàng tháng; `percent` lấy từ Admin (`Finance.serviceFeePercent`). */
export function netIncome(rent: number, percent: number): { fee: number; net: number } {
  const fee = Math.round((rent * percent) / 100);
  return { fee, net: Math.max(0, rent - fee) };
}
