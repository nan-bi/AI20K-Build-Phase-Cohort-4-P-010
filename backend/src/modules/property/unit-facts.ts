/** 8 hướng căn hộ hợp lệ (cột `units.direction`; web giữ bản sao ở `apps/web/src/lib/units/facts.ts`). */
export const DIRECTIONS = ['Đông', 'Tây', 'Nam', 'Bắc', 'Đông Nam', 'Đông Bắc', 'Tây Nam', 'Tây Bắc'] as const;
export type Direction = (typeof DIRECTIONS)[number];
