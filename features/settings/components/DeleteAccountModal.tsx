"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import type { AppLanguage } from "@/context/AuthContext";
import { auth, cloudFunctions } from "@/lib/firebase";
import { appText } from "@/lib/i18n/app-copy-catalog";

type DeleteAccountModalProps = {
  accountEmail: string;
  language: AppLanguage;
  onClose: () => void;
};

/** GDPR "delete my account" flow. Rendered only while open, so state resets each time. */
export function DeleteAccountModal({ accountEmail, language, onClose }: DeleteAccountModalProps) {
  const t = (key: Parameters<typeof appText>[1]) => appText(language, key);
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (working) {
      return;
    }

    onClose();
  }

  async function deleteCurrentAccount() {
    const cleanEmail = email.trim().toLowerCase();

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
      setError("Contul nu a putut fi șters. Intră din nou în cont și încearcă încă o dată.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">Account &amp; Privacy</span>
            <h2 id="delete-account-title">Șterge contul</h2>
          </div>
        </div>

        <div className="settings-form">
          <p className="muted-note">
            Se șterge contul tău Kelunia, profilul personal, setările PIN/biometrie, tokenurile de notificări și datele personale controlate de Kelunia.
            Programările și istoricul locației pot rămâne anonimizate unde sunt necesare pentru continuitate, audit sau obligații legale. Facturile și plățile pot fi păstrate conform obligațiilor fiscale.
          </p>

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
              disabled={working || email.trim().toLowerCase() !== accountEmail.toLowerCase()}
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
