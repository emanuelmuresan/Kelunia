import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { contactCopy } from "@/lib/i18n/legal-copy";

export const metadata: Metadata = {
  title: "Contact | Kelunia",
  description: "Contact Kelunia support.",
};

export default function ContactPage() {
  return <LegalDocument pageKey="contact" copy={contactCopy} />;
}
