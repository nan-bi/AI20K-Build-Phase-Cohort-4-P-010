"use client";

import styles from "./authui.module.css";

interface PortalTab<T extends string> {
  id: T;
  label: string;
}

interface PortalTabsProps<T extends string> {
  tabs: PortalTab<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function PortalTabs<T extends string>({ tabs, active, onChange }: PortalTabsProps<T>) {
  return (
    <div className={styles.segmented} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`${styles.segmentBtn} ${active === tab.id ? styles.segmentBtnActive : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
