// Adresă scurtă veche: trimite vizitatorul la termeni și condiții.
import { redirect } from "next/navigation";

// Redirecționare pe server către /terms-and-conditions.
export default function TermsRedirectPage() {
  redirect("/terms-and-conditions");
}
