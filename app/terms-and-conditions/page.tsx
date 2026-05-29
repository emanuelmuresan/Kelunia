import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { termsCopy } from "@/lib/i18n/legal-copy";

export const metadata: Metadata = {
  title: "Terms & Conditions | Kelunia",
  description: "The terms that apply when using Kelunia.",
};

export default function TermsAndConditionsPage() {
  return <LegalDocument pageKey="terms" copy={termsCopy} />;
}
