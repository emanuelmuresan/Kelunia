"use client";

import { useEffect, useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";

type TickerSettingsCardProps = {
  language: AppLanguage;
  settings: UpcomingTickerSettings;
  onChange: (patch: Partial<UpcomingTickerSettings>) => void;
};

function clampLeadDays(text: string, fallback: number) {
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 60) : fallback;
}

/** Per-device: the scrolling band of upcoming events at the top of the app. */
export function TickerSettingsCard({ language, settings, onChange }: TickerSettingsCardProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [leadDaysText, setLeadDaysText] = useState(String(settings.leadDays));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!editing) {
      setDraft(settings);
      setLeadDaysText(String(settings.leadDays));
    }
  }, [editing, settings]);

  function startEdit() {
    setDraft(settings);
    setLeadDaysText(String(settings.leadDays));
    setMessage("");
    setEditing(true);
  }

  function cancel() {
    setDraft(settings);
    setLeadDaysText(String(settings.leadDays));
    setEditing(false);
  }

  function save() {
    try {
      onChange({ ...draft, leadDays: clampLeadDays(leadDaysText, settings.leadDays) });
      setMessage(t("settings.tickerSaved"));
      setEditing(false);
    } catch {
      setMessage(t("settings.tickerSaveFailed"));
    }
  }

  const view = editing ? draft : settings;

  return (
    <article className="settings-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("nav.calendar")}</span>
          <h2>{t("settings.tickerTitle")}</h2>
        </div>
        {!editing && (
          <button className="secondary-button compact" onClick={startEdit} type="button">
            {t("settings.edit")}
          </button>
        )}
      </div>

      {message && <p className="success-line">{message}</p>}

      <div className="settings-form">
        <SettingsBlock title={t("settings.tickerShowBlock")} hint={t("settings.tickerShowHint")}>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={view.enabled}
              disabled={!editing}
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
              value={editing ? leadDaysText : String(settings.leadDays)}
              disabled={!editing || !view.enabled}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setLeadDaysText(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 2))}
              onBlur={() => setLeadDaysText(String(clampLeadDays(leadDaysText, settings.leadDays)))}
            />
          </label>
        </SettingsBlock>

        <SettingsBlock title={t("settings.tickerLookBlock")}>
          <label>
            {t("settings.tickerColor")}
            <input
              type="color"
              value={view.color}
              disabled={!editing || !view.enabled}
              onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
            />
          </label>
        </SettingsBlock>

        {editing && (
          <div className="modal-actions inline-actions">
            <button className="secondary-button" onClick={cancel} type="button">
              {t("action.cancel")}
            </button>
            <button className="primary-button" onClick={save} type="button">
              {t("action.save")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
