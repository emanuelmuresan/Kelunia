"use client";

// Fereastra de modificare a benzii cu evenimente următoare: afișare, numărul de zile (1-60), culoarea benzii și a textului, cu previzualizare.
// Nimic nu se aplică până la „Salvează”; setările se rețin doar pe acest dispozitiv.
import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { tickerTextColor } from "@/features/calendar/components/UpcomingTicker";
import { ColorPicker } from "@/features/settings/components/ColorPicker";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { useDismissGuard } from "@/features/shell/components/ConfirmDialog";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";

// Proprietățile ferestrei: setările curente și acțiunile de salvare și închidere.
type TickerEditorModalProps = {
  language: AppLanguage;
  settings: UpcomingTickerSettings;
  onSave: (next: UpcomingTickerSettings) => void;
  onClose: () => void;
};

// Culorile propuse pentru bandă și pentru text.
const bandPalette = ["#1787ff", "#10b8d7", "#8b5cf6", "#e35df4", "#b9503d", "#a86716", "#2e9d57", "#16172b", "#ffffff", "#f4c20d"] as const;
const textPalette = ["#ffffff", "#111827", "#f4c20d", "#1787ff", "#b9503d"] as const;

// Numărul de zile: un întreg între 1 și 60, altfel valoarea anterioară.
export function clampTickerLeadDays(text: string, fallback: number) {
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 60) : fallback;
}

// Componenta ferestrei.
/** Per-device editor for the upcoming-events band. Nothing applies until Save. */
export function TickerEditorModal({ language, settings, onSave, onClose }: TickerEditorModalProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  // Ciorna setărilor și textul scris pentru numărul de zile; „murdar” înseamnă că ceva diferă de setările curente.
  const [draft, setDraft] = useState(settings);
  const [leadDaysText, setLeadDaysText] = useState(String(settings.leadDays));
  const nextLeadDays = clampTickerLeadDays(leadDaysText, settings.leadDays);
  const dirty =
    draft.enabled !== settings.enabled ||
    draft.color !== settings.color ||
    draft.textColor !== settings.textColor ||
    nextLeadDays !== settings.leadDays;

  // Închiderea prin clic pe fundal sau Esc cere confirmare doar dacă există modificări.
  const requestClose = useDismissGuard(dirty, onClose, language);

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={requestClose}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticker-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Antetul ferestrei. */}
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("nav.calendar")}</span>
            <h2 id="ticker-settings-title">{t("settings.tickerTitle")}</h2>
          </div>
        </div>

        {/* Blocurile: afișare, interval, aspect. */}
        <div className="settings-form">
          {/* Afișarea benzii. */}
          <SettingsBlock title={t("settings.tickerShowBlock")} hint={t("settings.tickerShowHint")}>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
              />
              {t("settings.tickerShow")}
            </label>
          </SettingsBlock>

          {/* Numărul de zile din față. */}
          <SettingsBlock title={t("settings.tickerRangeBlock")}>
            <label>
              {t("settings.tickerDays")}
              <input
                type="text"
                inputMode="numeric"
                value={leadDaysText}
                disabled={!draft.enabled}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setLeadDaysText(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 2))}
                onBlur={() => setLeadDaysText(String(nextLeadDays))}
              />
            </label>
          </SettingsBlock>

          {/* Aspectul: culoarea benzii, culoarea textului (automată sau aleasă) și previzualizarea. */}
          <SettingsBlock title={t("settings.tickerLookBlock")}>
            <div className="color-field">
              <span>{t("settings.tickerColor")}</span>
              <ColorPicker
                disabled={!draft.enabled}
                hexLabel={t("settings.colorHex")}
                palette={bandPalette}
                value={draft.color}
                onChange={(color) => setDraft((current) => ({ ...current, color }))}
              />
            </div>

            <label className="toggle-row compact-toggle">
              <input
                type="checkbox"
                checked={draft.textColor === ""}
                disabled={!draft.enabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    textColor: event.target.checked ? "" : tickerTextColor(current),
                  }))
                }
              />
              {t("settings.tickerTextAuto")}
            </label>

            {draft.textColor !== "" && (
              <div className="color-field">
                <span>{t("settings.tickerTextColor")}</span>
                <ColorPicker
                  disabled={!draft.enabled}
                  hexLabel={t("settings.colorHex")}
                  palette={textPalette}
                  value={draft.textColor}
                  onChange={(textColor) => setDraft((current) => ({ ...current, textColor }))}
                />
              </div>
            )}

            <div className="ticker-preview" style={{ backgroundColor: draft.color, color: tickerTextColor(draft) }}>
              {t("settings.tickerTitle")}
            </div>
          </SettingsBlock>

          {/* Butoanele de renunțare și salvare. */}
          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              {t("action.cancel")}
            </button>
            <button
              className="primary-button"
              disabled={!dirty}
              onClick={() => onSave({ ...draft, leadDays: nextLeadDays })}
              type="button"
            >
              {t("action.save")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
