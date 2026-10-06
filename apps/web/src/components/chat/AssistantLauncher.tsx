"use client";

import { MessageCircle } from "lucide-react";
import { useOptionalLandingPreferences } from "@/components/landing/LandingPreferences";
import { useAssistant } from "./AssistantProvider";
import styles from "./AssistantLauncher.module.css";

/** Nút nổi "Hỏi trợ lý": cuộn về ô chat hero và focus; ẩn khi ô chat đã trong khung nhìn. Chỉ render ở "/". */
export function AssistantLauncher() {
  const { focusAssistant, assistantVisible } = useAssistant();
  const en = useOptionalLandingPreferences()?.locale === "en";
  const label = en ? "Ask the home assistant" : "Hỏi trợ lý tìm nhà";
  return (
    <button
      type="button"
      className={styles.launcher}
      hidden={assistantVisible}
      aria-hidden={assistantVisible}
      aria-label={label}
      onClick={() => focusAssistant()}
    >
      <MessageCircle size={20} />
      <span>{label}</span>
    </button>
  );
}
