import { redirect } from "next/navigation";

export default function CookiesRedirectPage() {
  redirect("/cookie-policy");
}
