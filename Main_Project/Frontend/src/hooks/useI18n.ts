import { useState } from "react";
import { en, vi, type Translations } from "@/lib/i18n";

type Locale = "en" | "vi";

const translations: Record<Locale, Translations> = { en, vi };

export function useI18n() {
  const [locale, setLocale] = useState<Locale>("en");
  const t = translations[locale];
  return { t, locale, setLocale };
}
