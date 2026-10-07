// Pagina publică „Politica de confidențialitate": cum colectăm și protejăm datele personale.
import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { privacyCopy } from "@/lib/i18n/legal-copy";

// Metadatele paginii pentru browser și motoare de căutare.
export const metadata: Metadata = {
  title: "Privacy Policy | Kelunia",
  description: "How Kelunia collects, uses, stores and protects personal data.",
};

// Redă documentul legal despre confidențialitate.
export default function PrivacyPolicyPage() {
  return <LegalDocument pageKey="privacy" copy={privacyCopy} />;
}
