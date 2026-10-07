// Pagina publică „Șterge contul": explică cum își poate șterge cineva contul și datele personale.
import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { deleteAccountCopy } from "@/lib/i18n/legal-copy";

// Metadatele paginii pentru browser și motoare de căutare.
export const metadata: Metadata = {
  title: "Delete Account | Kelunia",
  description: "How to delete your Kelunia account and associated personal data.",
};

// Redă documentul legal despre ștergerea contului.
export default function DeleteAccountPage() {
  return <LegalDocument pageKey="deleteAccount" copy={deleteAccountCopy} />;
}
