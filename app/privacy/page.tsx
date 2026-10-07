// Adresă scurtă veche: trimite vizitatorul la politica de confidențialitate.
import { redirect } from "next/navigation";

// Redirecționare pe server către /privacy-policy.
export default function PrivacyRedirectPage() {
  redirect("/privacy-policy");
}
