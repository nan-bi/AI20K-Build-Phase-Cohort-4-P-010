"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export type LandingLocale = "vi" | "en";

type LandingPreferencesValue = {
  locale: LandingLocale;
  setLocale: (locale: LandingLocale) => void;
  dark: boolean;
  toggleTheme: () => void;
};

const LandingPreferencesContext = createContext<LandingPreferencesValue | null>(null);
const THEME_KEY = "vinstay-home-theme";

function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("vinstay-home-theme-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("vinstay-home-theme-change", onChange);
  };
}

function getThemeSnapshot() {
  return window.localStorage.getItem(THEME_KEY) === "dark";
}

export function LandingPreferences({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LandingLocale>("vi");
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);

  useEffect(() => {
    document.documentElement.dataset.homeTheme = dark ? "dark" : "light";
    return () => {
      delete document.documentElement.dataset.homeTheme;
    };
  }, [dark]);

  const toggleTheme = useCallback(() => {
    window.localStorage.setItem(THEME_KEY, dark ? "light" : "dark");
    window.dispatchEvent(new Event("vinstay-home-theme-change"));
  }, [dark]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    dark,
    toggleTheme,
  }), [dark, locale, toggleTheme]);

  return <LandingPreferencesContext.Provider value={value}>{children}</LandingPreferencesContext.Provider>;
}

export function useLandingPreferences() {
  const value = useContext(LandingPreferencesContext);
  if (!value) throw new Error("Landing preferences must be used inside LandingPreferences.");
  return value;
}

export function useOptionalLandingPreferences() {
  return useContext(LandingPreferencesContext);
}
