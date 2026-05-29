import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { privacyCopy } from "@/lib/i18n/legal-copy";

export const metadata: Metadata = {
  title: "Privacy Policy | Kelunia",
  description: "How Kelunia collects, uses, stores and protects personal data.",
};

export default function PrivacyPolicyPage() {
  return <LegalDocument pageKey="privacy" copy={privacyCopy} />;
}
