// Pagina publică „Contact": titlul din tab și descrierea pentru motoarele de căutare, apoi documentul legal comun.
import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { contactCopy } from "@/lib/i18n/legal-copy";

// Metadatele paginii (titlu și descriere) folosite de browser și de motoarele de căutare.
export const metadata: Metadata = {
  title: "Contact | Kelunia",
  description: "Contact Kelunia support.",
};

// Redă conținutul din catalogul de texte legale, în limba aleasă de vizitator.
export default function ContactPage() {
  return <LegalDocument pageKey="contact" copy={contactCopy} />;
}
