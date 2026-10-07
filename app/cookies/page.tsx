// Adresă scurtă veche: trimite vizitatorul la pagina oficială de cookie-uri.
import { redirect } from "next/navigation";

// Redirecționare pe server către /cookie-policy.
export default function CookiesRedirectPage() {
  redirect("/cookie-policy");
}
