import { cookies } from "next/headers";
import { getSettings } from "./settings";
import { LOCALE_COOKIE, THEME_COOKIE, isLocale, normalizeLocale } from "./i18n";
import type { Locale, ThemeMode } from "./types";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  try {
    return normalizeLocale((await getSettings()).general.locale);
  } catch {
    return "ar";
  }
}

export async function getTheme(): Promise<ThemeMode> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  if (value === "light" || value === "dark" || value === "system") return value;
  try {
    return (await getSettings()).general.theme;
  } catch {
    return "system";
  }
}
