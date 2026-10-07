"use client";

// Fereastra „Raportează o problemă”: trimite un document în errorReports (citit doar de proprietar), cu mesajul utilizatorului.
// Din ErrorBoundary se atașează automat și detaliile tehnice ale erorii.
import { useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useDismissGuard } from "@/features/shell/components/ConfirmDialog";
import { appText } from "@/lib/i18n/app-copy-catalog";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

// Proprietățile ferestrei: deschisă/închisă, contextul erorii (opțional) și închiderea.
type ReportProblemModalProps = {
  open: boolean;
  errorContext?: { message?: string; componentStack?: string };
  onClose: () => void;
};

// Starea formularului: textul, trimiterea în curs, confirmarea și eroarea.
export function ReportProblemModal({ open, errorContext, onClose }: ReportProblemModalProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const { profile } = useAuth();
  const language = profile?.language ?? "ro";
  const requestClose = useDismissGuard(text.trim().length > 0 && !done && !sending, onClose, language);

  // Fereastra nu se randează când e închisă.
  if (!open) {
    return null;
  }

  // Validează mesajul (minimum 5 caractere) și îl salvează, cu lungimi limitate, împreună cu adresa, browserul, versiunea și utilizatorul.
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

  // Fereastra propriu-zisă; clic pe fundal cere confirmare dacă există text nesalvat.
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

        {/* După trimitere se arată mulțumirea; altfel formularul. */}
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
