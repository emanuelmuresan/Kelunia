// Asocierea dintre limba interfeței și localizarea folosită la formatarea datelor (toLocaleDateString).
import type { SupportedLocale } from "@/lib/i18n/app-copy-catalog";

export const dateLocales: Record<SupportedLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  es: "es-ES",
  it: "it-IT",
  fr: "fr-FR",
  pt: "pt-PT",
};
