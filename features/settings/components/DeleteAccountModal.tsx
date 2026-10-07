"use client";

// Fereastra „Șterge contul” (dreptul de ștergere GDPR): cere emailul contului ca să confirme, apoi apelează funcția cloud deleteMyAccount
// și trimite utilizatorul la login. Ultimul administrator al unei locații nu își poate șterge contul.
import { useState } from "react";
import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import type { AppLanguage } from "@/context/AuthContext";
import { auth, cloudFunctions } from "@/lib/firebase";
import { appText } from "@/lib/i18n/app-copy-catalog";

// Proprietățile ferestrei: emailul contului, dacă e singurul administrator și limba.
type DeleteAccountModalProps = {
  accountEmail: string;
  isSoleAdmin?: boolean;
  language: AppLanguage;
  onClose: () => void;
};

// Se randează doar cât e deschisă, deci starea se resetează la fiecare deschidere.
/** GDPR "delete my account" flow. Rendered only while open, so state resets each time. */
export function DeleteAccountModal({ accountEmail, isSoleAdmin = false, language, onClose }: DeleteAccountModalProps) {
  const t = (key: Parameters<typeof appText>[1]) => appText(language, key);
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  // Închiderea este blocată cât timp ștergerea e în curs.
  function close() {
    if (working) {
      return;
    }

    onClose();
  }

  // Validează emailul scris, apelează funcția cloud (care șterge contul și datele personale), deconectează și reîncarcă pagina de login.
  // Motivul „last-admin” trimis de server arată mesajul despre ultimul administrator.
  async function deleteCurrentAccount() {
    const cleanEmail = email.trim().toLowerCase();

    if (isSoleAdmin) {
      setError(t("settings.lastAdminDeleteBlocked"));
      return;
    }

    if (!accountEmail || cleanEmail !== accountEmail.toLowerCase()) {
      setError("Scrie exact emailul contului pentru confirmare.");
      return;
    }

    setWorking(true);
    setError("");

    try {
      const deleteMyAccount = httpsCallable(cloudFunctions, "deleteMyAccount");
      await deleteMyAccount({ confirmationEmail: cleanEmail, language });
      await signOut(auth).catch(() => undefined);
      window.location.href = `/login?lang=${language}`;
    } catch (deleteError) {
      console.warn("Contul nu a putut fi sters:", deleteError);
      const reason = (deleteError as { details?: { reason?: string } } | null)?.details?.reason;
      setError(
        reason === "last-admin"
          ? t("settings.lastAdminDeleteBlocked")
          : "Contul nu a putut fi șters. Intră din nou în cont și încearcă încă o dată."
      );
    } finally {
      setWorking(false);
    }
  }

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Antetul ferestrei. */}
        <div className="section-heading">
          <div>
            <span className="eyebrow">Account &amp; Privacy</span>
            <h2 id="delete-account-title">Șterge contul</h2>
          </div>
        </div>

        {/* Explicația a ceea ce se șterge, câmpul de confirmare, eroarea și butoanele. */}
        <div className="settings-form">
          <p className="muted-note">
            Se șterge contul tău Kelunia, profilul personal, setările PIN/biometrie, tokenurile de notificări și datele personale controlate de Kelunia.
            Programările și istoricul locației pot rămâne anonimizate unde sunt necesare pentru continuitate, audit sau obligații legale. Facturile și plățile pot fi păstrate conform obligațiilor fiscale.
          </p>

          {isSoleAdmin && <p className="error-line">{t("settings.lastAdminDeleteBlocked")}</p>}

          <label>
            Scrie emailul contului pentru confirmare
            <input
              autoComplete="email"
              disabled={working}
              inputMode="email"
              placeholder={accountEmail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {error && <p className="error-line">{error}</p>}

          <div className="modal-actions split-actions">
            <button className="secondary-button" disabled={working} onClick={close} type="button">
              {t("action.cancel")}
            </button>
            <button
              className="danger-button"
              disabled={working || isSoleAdmin || email.trim().toLowerCase() !== accountEmail.toLowerCase()}
              onClick={deleteCurrentAccount}
              type="button"
            >
              {working ? "Se șterge..." : "Șterge definitiv contul"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
