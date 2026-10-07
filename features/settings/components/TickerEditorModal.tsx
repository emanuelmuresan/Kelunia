"use client";

import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";

type TickerEditorModalProps = {
  language: AppLanguage;
  settings: UpcomingTickerSettings;
  onSave: (next: UpcomingTickerSettings) => void;
  onClose: () => void;
};

export function clampTickerLeadDays(text: string, fallback: number) {
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 60) : fallback;
}

/** Per-device editor for the upcoming-events band. */
export function TickerEditorModal({ language, settings, onSave, onClose }: TickerEditorModalProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [draft, setDraft] = useState(settings);
  const [leadDaysText, setLeadDaysText] = useState(String(settings.leadDays));
  const nextLeadDays = clampTickerLeadDays(leadDaysText, settings.leadDays);
  const dirty =
    draft.enabled !== settings.enabled || draft.color !== settings.color || nextLeadDays !== settings.leadDays;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
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
            <label>
              {t("settings.tickerColor")}
              <input
                type="color"
                value={draft.color}
                disabled={!draft.enabled}
                onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
              />
            </label>
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
