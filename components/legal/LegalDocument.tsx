"use client";

import Link from "next/link";
import { httpsCallable } from "firebase/functions";
import { signOut } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth, cloudFunctions } from "@/lib/firebase";
import { localeLabel, normalizeSupportedLocale, supportedLocales, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { LegalPageCopy, LegalPageKey } from "@/lib/i18n/legal-copy";

const languageStorageKey = "kelunia-language";
const legalLinkLabels: Record<SupportedLocale, { privacy: string; terms: string; cookies: string; deleteAccount: string }> = {
  ro: {
    privacy: "Confidențialitate",
    terms: "Termeni și condiții",
    cookies: "Cookies",
    deleteAccount: "Ștergere cont",
  },
  en: {
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    cookies: "Cookie Policy",
    deleteAccount: "Delete Account",
  },
  es: {
    privacy: "Privacidad",
    terms: "Términos",
    cookies: "Cookies",
    deleteAccount: "Eliminar cuenta",
  },
  it: {
    privacy: "Privacy",
    terms: "Termini",
    cookies: "Cookie",
    deleteAccount: "Elimina account",
  },
  fr: {
    privacy: "Confidentialité",
    terms: "Conditions",
    cookies: "Cookies",
    deleteAccount: "Supprimer le compte",
  },
  pt: {
    privacy: "Privacidade",
    terms: "Termos",
    cookies: "Cookies",
    deleteAccount: "Eliminar conta",
  },
};

type LegalDocumentProps = {
  pageKey: LegalPageKey;
  copy: Record<SupportedLocale, LegalPageCopy>;
};

export function LegalLinks({ language = "ro" }: { language?: SupportedLocale }) {
  const suffix = `?lang=${language}`;
  const labels = legalLinkLabels[language] ?? legalLinkLabels.ro;

  return (
    <nav className="legal-links" aria-label="Legal">
      <Link href={`/privacy-policy${suffix}`}>{labels.privacy}</Link>
      <Link href={`/terms-and-conditions${suffix}`}>{labels.terms}</Link>
      <Link href={`/cookie-policy${suffix}`}>{labels.cookies}</Link>
      <Link href={`/delete-account${suffix}`}>{labels.deleteAccount}</Link>
    </nav>
  );
}

export function LegalDocument({ pageKey, copy }: LegalDocumentProps) {
  const { user, profile, loading } = useAuth();
  const [language, setLanguage] = useState<SupportedLocale>("ro");
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const text = copy[language] ?? copy.ro;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLanguage = normalizeSupportedLocale(params.get("lang"));
    const storedLanguage = normalizeSupportedLocale(window.localStorage.getItem(languageStorageKey));
    const nextLanguage = params.has("lang") ? urlLanguage : storedLanguage;
    setLanguage(nextLanguage);
    window.localStorage.setItem(languageStorageKey, nextLanguage);
  }, []);

  function changeLanguage(nextLanguage: SupportedLocale) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(languageStorageKey, nextLanguage);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLanguage);
    window.history.replaceState(null, "", url.toString());
  }

  const accountEmail = useMemo(() => user?.email ?? profile?.email ?? "", [profile?.email, user?.email]);
  const canDelete = pageKey === "deleteAccount" && Boolean(user && accountEmail && confirmation.trim().toLowerCase() === accountEmail.toLowerCase());

  async function deleteAccount() {
    if (!user || !accountEmail) {
      setError(text.deleteAccount?.notSignedIn ?? "");
      return;
    }

    if (!canDelete) {
      setError(text.deleteAccount?.confirmationRequired ?? "");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const deleteMyAccount = httpsCallable(cloudFunctions, "deleteMyAccount");
      await deleteMyAccount({ confirmationEmail: confirmation.trim(), language });
      await signOut(auth).catch(() => undefined);
      setMessage(text.deleteAccount?.success ?? "");
      setConfirmation("");
    } catch (deleteError) {
      console.warn("Contul nu a putut fi șters:", deleteError);
      setError(text.deleteAccount?.error ?? "");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link href="/" className="landing-brand" aria-label="Kelunia">
          <img src="/icon-192.png" alt="" />
          <span>Kelunia</span>
        </Link>
        <div className="legal-header-actions">
          <label className="language-selector legal-language-selector">
            <span>{text.languageLabel}</span>
            <select value={language} onChange={(event) => changeLanguage(event.target.value as SupportedLocale)}>
              {supportedLocales.map((locale) => (
                <option key={locale.code} value={locale.code}>{locale.label}</option>
              ))}
            </select>
          </label>
          <LegalLinks language={language} />
        </div>
      </header>

      <article className="legal-card">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="legal-lead">{text.description}</p>
        <p className="legal-updated">{text.updatedLabel}: {text.updatedAt}</p>

        {pageKey === "deleteAccount" && text.deleteAccount ? (
          <section className="legal-delete-panel" aria-labelledby="delete-account-action-title">
            <div>
              <span className="eyebrow">{text.deleteAccount.actionEyebrow}</span>
              <h2 id="delete-account-action-title">{text.deleteAccount.actionTitle}</h2>
              <p>
                {loading
                  ? text.deleteAccount.loading
                  : user
                    ? text.deleteAccount.signedInAs.replace("{{email}}", accountEmail)
                    : text.deleteAccount.notSignedIn}
              </p>
            </div>

            {user ? (
              <div className="legal-delete-form">
                <label>
                  {text.deleteAccount.confirmationLabel}
                  <input
                    autoComplete="email"
                    disabled={working}
                    inputMode="email"
                    placeholder={accountEmail}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                </label>
                <button className="danger-button" disabled={!canDelete || working} onClick={deleteAccount} type="button">
                  {working ? text.deleteAccount.deleting : text.deleteAccount.button}
                </button>
              </div>
            ) : (
              <Link href={`/login?lang=${language}`} className="primary-link">{text.deleteAccount.login}</Link>
            )}

            {error ? <p className="error-line">{error}</p> : null}
            {message ? <p className="success-line">{message}</p> : null}
          </section>
        ) : null}

        <div className="legal-section-list">
          {text.sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.body ? <p>{section.body}</p> : null}
              {section.items ? (
                <ul>
                  {section.items.map((item, index) => (
                    <li key={`${section.title}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <p className="legal-language-note">{text.languageNote.replace("{{language}}", localeLabel(language))}</p>
      </article>
    </main>
  );
}
