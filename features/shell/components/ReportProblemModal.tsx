"use client";

import { useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useDismissGuard } from "@/features/shell/components/ConfirmDialog";
import { appText } from "@/lib/i18n/app-copy-catalog";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type ReportProblemModalProps = {
  open: boolean;
  errorContext?: { message?: string; componentStack?: string };
  onClose: () => void;
};

export function ReportProblemModal({ open, errorContext, onClose }: ReportProblemModalProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const { profile } = useAuth();
  const language = profile?.language ?? "ro";
  const requestClose = useDismissGuard(text.trim().length > 0 && !done && !sending, onClose, language);

  if (!open) {
    return null;
  }

  async function send() {
    const userMessage = text.trim();

    if (userMessage.length < 5) {
      setError("Scrie câteva cuvinte despre ce s-a întâmplat.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await addDoc(collection(db, "errorReports"), {
        message: (errorContext?.message ?? "").slice(0, 6000),
        componentStack: (errorContext?.componentStack ?? "").slice(0, 6000),
        userMessage: userMessage.slice(0, 4000),
        path: typeof window !== "undefined" ? window.location.pathname : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : "",
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "web",
        uid: auth.currentUser?.uid ?? "",
        email: auth.currentUser?.email ?? "",
        status: "new",
        createdAt: serverTimestamp(),
      });
      setDone(true);
      setText("");
    } catch (sendError) {
      console.error("Raportul nu a putut fi trimis:", sendError);
      setError("Raportul nu a putut fi trimis. Verifică internetul și încearcă din nou.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={requestClose}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-problem-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">Suport</span>
            <h2 id="report-problem-title">{appText(language, "settings.reportProblem")}</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label={appText(language, "booking.close")}>
            ×
          </button>
        </div>

        {done ? (
          <>
            <p className="success-line">{appText(language, "report.thanks")}</p>
            <div className="modal-actions">
              <button className="primary-button" onClick={onClose} type="button">{appText(language, "booking.close")}</button>
            </div>
          </>
        ) : (
          <div className="settings-form">
            <label>
              Ce s-a întâmplat?
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={appText(language, "report.placeholder")}
                rows={5}
              />
            </label>

            {errorContext?.message && (
              <p className="muted-note">Detaliile tehnice ale erorii se trimit automat.</p>
            )}
            {error && <p className="error-line">{error}</p>}

            <div className="modal-actions">
              <button className="secondary-button" onClick={onClose} type="button" disabled={sending}>
                Renunță
              </button>
              <button className="primary-button" onClick={send} type="button" disabled={sending}>
                {sending ? "Se trimite..." : "Trimite"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
