"use client";

// Pagina linkurilor din emailurile Kelunia: confirmarea adresei de email (?mode=verifyEmail) și alegerea unei parole noi (?mode=resetPassword),
// cu codul unic generat de Firebase Auth (?oobCode=…) și limba emailului (?lang=…). Linkul stă pe domeniul Kelunia, nu pe firebaseapp.com,
// ca filtrele anti-spam să nu penalizeze emailul. Confirmarea emailului se face doar la apăsarea butonului, ca un link deschis automat
// (previzualizare, antivirus) să nu consume codul.
import { useEffect, useState } from "react";
import Link from "next/link";
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { appText, normalizeSupportedLocale, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import { passwordSecurityError } from "@/lib/security/password";

type Mode = "verifyEmail" | "resetPassword";
type Status = "loading" | "verify" | "reset" | "working" | "done" | "invalid" | "error";

// Codurile Firebase care înseamnă „linkul nu mai e bun” (expirat, folosit deja sau înlocuit de unul mai nou).
const invalidLinkCodes = ["auth/expired-action-code", "auth/invalid-action-code", "auth/user-disabled", "auth/user-not-found"];

function errorCode(error: unknown) {
  return String((error as { code?: string } | null)?.code ?? "");
}

export default function AuthActionPage() {
  const [mode, setMode] = useState<Mode | "">("");
  const [oobCode, setOobCode] = useState("");
  const [language, setLanguage] = useState<SupportedLocale>("ro");
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  // Modul, codul și limba vin din adresă; la parolă nouă se verifică întâi codul (fără să-l consume) și se află emailul contului.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get("mode");
    const nextCode = params.get("oobCode") ?? "";

    setLanguage(normalizeSupportedLocale(params.get("lang") ?? window.localStorage.getItem("kelunia-language")));

    if ((nextMode !== "verifyEmail" && nextMode !== "resetPassword") || !nextCode) {
      setStatus("invalid");
      return;
    }

    setMode(nextMode);
    setOobCode(nextCode);

    if (nextMode === "verifyEmail") {
      setStatus("verify");
      return;
    }

    verifyPasswordResetCode(auth, nextCode)
      .then((accountEmail) => {
        setEmail(accountEmail);
        setStatus("reset");
      })
      .catch((error) => {
        setStatus(invalidLinkCodes.includes(errorCode(error)) ? "invalid" : "error");
      });
  }, []);

  // Confirmă adresa de email.
  async function confirmEmail() {
    setStatus("working");

    try {
      await applyActionCode(auth, oobCode);
      setStatus("done");
    } catch (error) {
      setStatus(invalidLinkCodes.includes(errorCode(error)) ? "invalid" : "verify");
      setFormError(invalidLinkCodes.includes(errorCode(error)) ? "" : appText(language, "action.linkError"));
    }
  }

  // Salvează parola nouă, după aceleași reguli ca la crearea contului.
  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (password !== confirmPassword) {
      setFormError(appText(language, "msg.passwordMismatch"));
      return;
    }

    if (passwordSecurityError(password, email)) {
      setFormError(appText(language, "action.passwordWeak"));
      return;
    }

    setStatus("working");

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("done");
    } catch (error) {
      const code = errorCode(error);

      if (invalidLinkCodes.includes(code)) {
        setStatus("invalid");
        return;
      }

      setStatus("reset");
      setFormError(
        code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements"
          ? appText(language, "action.passwordWeak")
          : appText(language, "action.linkError")
      );
    }
  }

  const title = mode === "resetPassword" ? appText(language, "action.resetTitle") : appText(language, "action.verifyTitle");
  const subtitle =
    status === "done"
      ? appText(language, mode === "resetPassword" ? "action.resetDone" : "action.verifyDone")
      : status === "invalid"
        ? appText(language, "action.linkInvalid")
        : status === "error"
          ? appText(language, "action.linkError")
          : status === "loading" || status === "working"
            ? appText(language, "action.working")
            : mode === "resetPassword"
              ? appText(language, "action.resetIntro").replace("{{email}}", email)
              : appText(language, "action.verifyIntro");

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card-head">
          <img src="/icon-192.png" alt="Kelunia" />
          <div>
            <span>Kelunia</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>

        {status === "verify" && (
          <button className="primary-button" onClick={confirmEmail} type="button">
            {appText(language, "action.verifyButton")}
          </button>
        )}

        {(status === "reset" || (status === "working" && mode === "resetPassword")) && (
          <form className="auth-form" onSubmit={savePassword}>
            <label>
              {appText(language, "auth.password")}
              <input
                autoComplete="new-password"
                disabled={status === "working"}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={appText(language, "auth.passwordPlaceholder")}
                required
                type="password"
                value={password}
              />
            </label>
            <label>
              {appText(language, "auth.confirmPassword")}
              <input
                autoComplete="new-password"
                disabled={status === "working"}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={appText(language, "auth.confirmPasswordPlaceholder")}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
            <button className="primary-button" disabled={status === "working"} type="submit">
              {appText(language, "action.resetButton")}
            </button>
          </form>
        )}

        {formError && <p className="error-line">{formError}</p>}

        <div className="auth-links">
          <Link href="/login">{status === "done" ? appText(language, "action.goToLogin") : appText(language, "auth.backToLogin")}</Link>
        </div>
      </section>
    </main>
  );
}
