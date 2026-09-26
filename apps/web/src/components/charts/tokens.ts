/**
 * Màu biểu đồ lấy từ dải xanh hồ của thương hiệu (một hue, sáng → tối), đã kiểm bằng
 * scripts/validate_palette.js --ordinal (ΔL ≥ 0.06, đầu sáng 2,14:1, hue lệch 10°).
 * Hổ phách KHÔNG dùng để mã hoá dữ liệu — nó dành cho tín hiệu hành động.
 */
export const ORDINAL_6 = ["#8fb8c1", "#5d9bab", "#3a8094", "#1c6e80", "#14505f", "#0b2f3a"] as const;

/** Thang tuần tự cho heatmap (gần 0 → mờ về phía nền). */
export const SEQ = ["#e3eeee", "#c5dde0", "#9fc5cd", "#6fa8b6", "#3f8598", "#1c6e80", "#14505f", "#0b2f3a"] as const;

export const SERIES = "#1c6e80";
export const CONTEXT = "#9dbcc4";
export const STATUS = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" } as const;
