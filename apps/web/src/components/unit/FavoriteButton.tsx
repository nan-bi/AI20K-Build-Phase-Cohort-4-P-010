"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/tenant/favorites";
import styles from "./UnitCard.module.css";

/** `unitId` là mã căn (VHOP-…). Trạng thái tim đọc từ DB theo tài khoản, không còn lưu tạm ở trình duyệt. */
export function FavoriteButton({ unitId, variant = "overlay", className }: { unitId: string; variant?: "overlay" | "plain"; className?: string }) {
  const { isSaved, toggle, busy } = useFavorites();
  const saved = isSaved(unitId);
  return (
    <button
      type="button"
      className={`${variant === "overlay" ? styles.fav : "icon-btn"} ${className || ""}`}
      aria-pressed={saved}
      aria-busy={busy === unitId}
      disabled={busy === unitId}
      aria-label={saved ? "Bỏ khỏi danh sách đã lưu" : "Lưu căn này"}
      onClick={() => void toggle(unitId)}
    >
      <Heart size={variant === "overlay" ? 18 : 20} fill={saved ? "currentColor" : "none"} className={saved ? styles.saved : ""} />
    </button>
  );
}
