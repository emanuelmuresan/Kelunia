"use client";

// Dezabonarea de la newsletter fără cont: linkul din email (?e=<email>&t=<jeton>) deschide această pagină, iar un clic pe buton
// trimite cererea către funcția publică unsubscribeNewsletter, care verifică jetonul și marchează adresa ca dezabonată.
// Cererea se face doar la apăsarea butonului, ca un link deschis automat (previzualizare, antivirus) să nu dezaboneze pe nimeni.
import { useEffect, useState } from "react";
import Link from "next/link";

import { appText, normalizeSupportedLocale, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";

type Status = "ready" | "working" | "done" | "error" | "invalid";

// Funcția HTTP publică (regiunea europe-west1) a proiectului Firebase.
const unsubscribeUrl = `https://europe-west1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/unsubscribeNewsletter`;

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [language, setLanguage] = useState<SupportedLocale>("ro");
  const [status, setStatus] = useState<Status>("ready");

  // Emailul, jetonul și limba vin din adresă; fără ele linkul este considerat invalid.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextEmail = params.get("e") ?? "";
    const nextToken = params.get("t") ?? "";

    setEmail(nextEmail);
    setToken(nextToken);
    setLanguage(normalizeSupportedLocale(params.get("lang") ?? window.localStorage.getItem("kelunia-language")));

    if (!nextEmail || !nextToken) {
      setStatus("invalid");
    }
  }, []);

  async function confirm() {
    setStatus("working");

    try {
      const response = await fetch(`${unsubscribeUrl}?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`, { method: "POST" });

      if (response.status === 400) {
        setStatus("invalid");
        return;
      }

      setStatus(response.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  const subtitle =
    status === "done"
      ? appText(language, "unsubscribe.done")
      : status === "invalid"
        ? appText(language, "unsubscribe.invalid")
        : status === "error"
          ? appText(language, "unsubscribe.error")
          : appText(language, "unsubscribe.intro").replace("{{email}}", email);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card-head">
          <img src="/icon-192.png" alt="Kelunia" />
          <div>
            <span>Kelunia</span>
            <h2>{appText(language, "unsubscribe.title")}</h2>
            <p>{subtitle}</p>
          </div>
        </div>

        {(status === "ready" || status === "working" || status === "error") && (
          <button className="primary-button" disabled={status === "working"} onClick={confirm} type="button">
            {status === "working" ? appText(language, "unsubscribe.working") : appText(language, "unsubscribe.button")}
          </button>
        )}

        <div className="auth-links">
          <Link href="/">{appText(language, "action.backHome")}</Link>
        </div>
      </section>
    </main>
  );
}
