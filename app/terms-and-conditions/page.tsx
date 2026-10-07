// Pagina publică „Termeni și condiții": regulile de folosire a Kelunia.
import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { termsCopy } from "@/lib/i18n/legal-copy";

// Metadatele paginii pentru browser și motoare de căutare.
export const metadata: Metadata = {
  title: "Terms & Conditions | Kelunia",
  description: "The terms that apply when using Kelunia.",
};

// Redă documentul legal cu termenii și condițiile.
export default function TermsAndConditionsPage() {
  return <LegalDocument pageKey="terms" copy={termsCopy} />;
}
