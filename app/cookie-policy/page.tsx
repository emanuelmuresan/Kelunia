import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { cookiesCopy } from "@/lib/i18n/legal-copy";

export const metadata: Metadata = {
  title: "Cookie Policy | Kelunia",
  description: "How Kelunia uses cookies, local storage and similar technologies.",
};

export default function CookiePolicyPage() {
  return <LegalDocument pageKey="cookies" copy={cookiesCopy} />;
}
