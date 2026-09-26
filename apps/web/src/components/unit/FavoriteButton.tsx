"use client";

import { Heart } from "lucide-react";
import { toggleFavorite } from "@/lib/mock/actions";
import { useMock } from "@/lib/mock/store";
import { toast } from "@/components/ui/Toast";
import styles from "./UnitCard.module.css";

export function FavoriteButton({ unitId, variant = "overlay" }: { unitId: string; variant?: "overlay" | "plain" }) {
  const { favorites } = useMock();
  const saved = favorites.includes(unitId);
  return (
    <button
      type="button"
      className={variant === "overlay" ? styles.fav : "icon-btn"}
      aria-pressed={saved}
      aria-label={saved ? "Bỏ khỏi danh sách đã lưu" : "Lưu căn này"}
      onClick={() => {
        toggleFavorite(unitId);
        toast(saved ? "Đã bỏ khỏi danh sách lưu" : "Đã lưu căn này", saved ? "info" : "success");
      }}
    >
      <Heart size={variant === "overlay" ? 18 : 20} fill={saved ? "currentColor" : "none"} className={saved ? styles.saved : ""} />
    </button>
  );
}
