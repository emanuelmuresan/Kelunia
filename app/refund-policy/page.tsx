import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { refundCopy } from "@/lib/i18n/legal-copy";

export const metadata: Metadata = {
  title: "Refund Policy | Kelunia",
  description: "Kelunia refund policy for trials, subscriptions and payments.",
};

export default function RefundPolicyPage() {
  return <LegalDocument pageKey="refund" copy={refundCopy} />;
}
