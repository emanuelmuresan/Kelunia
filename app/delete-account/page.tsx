import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { deleteAccountCopy } from "@/lib/i18n/legal-copy";

export const metadata: Metadata = {
  title: "Delete Account | Kelunia",
  description: "How to delete your Kelunia account and associated personal data.",
};

export default function DeleteAccountPage() {
  return <LegalDocument pageKey="deleteAccount" copy={deleteAccountCopy} />;
}
