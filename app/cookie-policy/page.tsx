// Pagina publică „Politica de cookie-uri": ce stocăm în browser și de ce.
import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { cookiesCopy } from "@/lib/i18n/legal-copy";

// Metadatele paginii (titlu și descriere) pentru browser și motoare de căutare.
export const metadata: Metadata = {
  title: "Cookie Policy | Kelunia",
  description: "How Kelunia uses cookies, local storage and similar technologies.",
};

// Redă documentul legal pe baza textelor traduse din catalog.
export default function CookiePolicyPage() {
  return <LegalDocument pageKey="cookies" copy={cookiesCopy} />;
}
