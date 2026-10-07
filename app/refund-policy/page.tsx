// Pagina publică „Politica de rambursare": regulile pentru perioada de probă, abonamente și plăți.
import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { refundCopy } from "@/lib/i18n/legal-copy";

// Metadatele paginii pentru browser și motoare de căutare.
export const metadata: Metadata = {
  title: "Refund Policy | Kelunia",
  description: "Kelunia refund policy for trials, subscriptions and payments.",
};

// Redă documentul legal despre rambursări.
export default function RefundPolicyPage() {
  return <LegalDocument pageKey="refund" copy={refundCopy} />;
}
