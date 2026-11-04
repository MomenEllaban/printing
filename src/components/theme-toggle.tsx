"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "./locale-provider";

const THEME_COOKIE = "fm_theme";
const THEME_EVENT = "fm-theme-change";

function subscribeTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  localStorage.setItem(THEME_COOKIE, theme);
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function ThemeToggle() {
  const { t } = useI18n();
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);

  const label = dark ? t("settings.themeLight") : t("settings.themeDark");

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      onClick={() => {
        applyTheme(dark ? "light" : "dark");
        window.dispatchEvent(new Event(THEME_EVENT));
      }}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
