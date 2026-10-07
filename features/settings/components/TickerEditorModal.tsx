"use client";

import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { tickerTextColor } from "@/features/calendar/components/UpcomingTicker";
import { ColorPicker } from "@/features/settings/components/ColorPicker";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { useDismissGuard } from "@/features/shell/components/ConfirmDialog";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";

type TickerEditorModalProps = {
  language: AppLanguage;
  settings: UpcomingTickerSettings;
  onSave: (next: UpcomingTickerSettings) => void;
  onClose: () => void;
};

const bandPalette = ["#1787ff", "#10b8d7", "#8b5cf6", "#e35df4", "#b9503d", "#a86716", "#2e9d57", "#16172b", "#ffffff", "#f4c20d"] as const;
const textPalette = ["#ffffff", "#111827", "#f4c20d", "#1787ff", "#b9503d"] as const;

export function clampTickerLeadDays(text: string, fallback: number) {
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 60) : fallback;
}

/** Per-device editor for the upcoming-events band. Nothing applies until Save. */
export function TickerEditorModal({ language, settings, onSave, onClose }: TickerEditorModalProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [draft, setDraft] = useState(settings);
  const [leadDaysText, setLeadDaysText] = useState(String(settings.leadDays));
  const nextLeadDays = clampTickerLeadDays(leadDaysText, settings.leadDays);
  const dirty =
    draft.enabled !== settings.enabled ||
    draft.color !== settings.color ||
    draft.textColor !== settings.textColor ||
    nextLeadDays !== settings.leadDays;

  const requestClose = useDismissGuard(dirty, onClose, language);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={requestClose}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticker-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("nav.calendar")}</span>
            <h2 id="ticker-settings-title">{t("settings.tickerTitle")}</h2>
          </div>
        </div>

        <div className="settings-form">
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
