"use client";

// Blocul „Închiderea locației” din Setări > Acces: starea (deschisă sau în curs de închidere), butonul de închidere cu confirmare
// prin scrierea numelui locației, și redeschiderea cât timp rulează perioada de grație (vezi useLocationClosure).
import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { useLocationClosure } from "@/features/locations/hooks/useLocationClosure";
import { useConfirm } from "@/features/shell/components/ConfirmDialog";
import { locationClosureGraceDays } from "@/lib/config/app";
import { dateLocales } from "@/lib/date-locales";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

// Proprietățile blocului: locația, data programată pentru ștergere și funcția care afișează mesajul de succes.
type LocationClosureCardProps = {
  language: AppLanguage;
  locationId: string;
  locationName: string;
  closureScheduledFor?: unknown;
  onMessage: (text: string) => void;
};

// Transformă Timestamp-ul Firestore în Date și formatează data în limba utilizatorului.
function timestampDate(value: unknown) {
  const date = (value as { toDate?: () => Date } | null | undefined)?.toDate?.();
  return date instanceof Date ? date : null;
}

function dateLabel(date: Date, language: AppLanguage) {
  return date.toLocaleDateString(dateLocales[language], { day: "2-digit", month: "long", year: "numeric" });
}

// Componenta blocului.
/** Settings card to close a location (or reopen it while the grace period runs). */
export function LocationClosureCard({ language, locationId, locationName, closureScheduledFor, onMessage }: LocationClosureCardProps) {
  // Starea: fereastra de confirmare, numele scris și data estimată a ștergerii; numele se compară fără litere mari/mici.
  const t = (key: UiCopyKey) => appText(language, key);
  const confirmAction = useConfirm();
  const { working, error, clearError, requestClosure, cancelClosure } = useLocationClosure({ locationId, onMessage });
  const [modalOpen, setModalOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const scheduledFor = timestampDate(closureScheduledFor);
  const closing = scheduledFor !== null;
  const [futureDeletion, setFutureDeletion] = useState<Date | null>(null);
  const nameMatches = typedName.trim().toLowerCase() === locationName.trim().toLowerCase() && locationName.trim() !== "";

  // Închide fereastra de confirmare (nu și în timpul unei cereri) și curăță câmpurile.
  function closeModal() {
    if (working) {
      return;
    }

    setModalOpen(false);
    setTypedName("");
    clearError();
  }

  // Trimite cererea de închidere și închide fereastra doar dacă a reușit.
  async function confirmClosure() {
    if (await requestClosure(typedName.trim())) {
      setModalOpen(false);
      setTypedName("");
    }
  }

  // Redeschiderea locației, după confirmare.
  async function reopen() {
    const confirmed = await confirmAction({
      message: t("closure.reopenMessage"),
      confirmLabel: t("closure.reopenAction"),
    });

    if (confirmed) {
      await cancelClosure();
    }
  }

  // Structura blocului.
  return (
    <>
      {/* Blocul cu starea locației. */}
      <SettingsBlock title={t("closure.title")}>

        <div className="settings-summary-list">
          <div>
            <span>{t("closure.rowStatus")}</span>
            <strong>{closing ? t("closure.statusClosing") : t("closure.statusOpen")}</strong>
          </div>
          {scheduledFor && (
            <div>
              <span>{t("closure.rowDeleteOn")}</span>
              <strong>{dateLabel(scheduledFor, language)}</strong>
            </div>
          )}
        </div>

        {error && !modalOpen && <p className="error-line">{error}</p>}

        <div className="settings-card-actions">
          {closing ? (
            <button className="primary-button compact" disabled={working} onClick={reopen} type="button">
              {working ? t("closure.working") : t("closure.reopenButton")}
            </button>
          ) : (
            <button
              className="danger-button compact"
              onClick={() => {
                setFutureDeletion(new Date(Date.now() + locationClosureGraceDays * 24 * 60 * 60 * 1000));
                setModalOpen(true);
              }}
              type="button"
            >
              {t("closure.closeButton")}
            </button>
          )}
        </div>
      </SettingsBlock>

      {/* Fereastra de confirmare: explică ce se întâmplă și cere numele exact al locației. */}
      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <section
            className="modal-card small-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-location-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">{locationName}</span>
                <h2 id="close-location-title">{t("closure.closeButton")}</h2>
              </div>
            </div>

            <div className="settings-form">
              <p className="muted-note">
                {t("closure.modalIntro")
                  .replace("{{days}}", String(locationClosureGraceDays))
                  .replace("{{date}}", futureDeletion ? dateLabel(futureDeletion, language) : "")}
              </p>

              <label>
                {t("closure.typeName")} <strong>{locationName}</strong>
                <input
                  autoComplete="off"
                  disabled={working}
                  placeholder={locationName}
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                />
              </label>

              {error && <p className="error-line">{error}</p>}

              <div className="modal-actions">
                <button className="secondary-button" disabled={working} onClick={closeModal} type="button">
                  {t("action.cancel")}
                </button>
                <button className="danger-button" disabled={working || !nameMatches} onClick={confirmClosure} type="button">
                  {working ? t("closure.working") : t("closure.closeButton")}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
