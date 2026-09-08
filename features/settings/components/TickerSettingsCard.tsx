"use client";

import { useEffect, useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";

type TickerSettingsCardProps = {
  language: AppLanguage;
  settings: UpcomingTickerSettings;
  onChange: (patch: Partial<UpcomingTickerSettings>) => void;
};

/** Per-device: the scrolling band of upcoming events at the top of the app. */
export function TickerSettingsCard({ language, settings, onChange }: TickerSettingsCardProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!editing) {
      setDraft(settings);
    }
  }, [editing, settings]);

  function startEdit() {
    setDraft(settings);
    setMessage("");
    setEditing(true);
  }

  function cancel() {
    setDraft(settings);
    setEditing(false);
  }

  function save() {
    try {
      onChange(draft);
      setMessage("Setările au fost salvate pe acest dispozitiv.");
      setEditing(false);
    } catch {
      setMessage("Setările nu au putut fi salvate pe acest dispozitiv.");
    }
  }

  const view = editing ? draft : settings;

  return (
    <article className="settings-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("nav.calendar")}</span>
          <h2>Bandă evenimente viitoare</h2>
        </div>
        {!editing && (
          <button className="secondary-button compact" onClick={startEdit} type="button">
            {t("settings.edit")}
          </button>
        )}
      </div>

      {message && <p className="success-line">{message}</p>}

      <div className="settings-form">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={view.enabled}
            disabled={!editing}
            onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
          />
          Afișează banda sus (doar pe acest dispozitiv)
        </label>

        <label>
          Cu câte zile înainte apar evenimentele
          <input
            type="number"
            min={1}
            max={60}
            value={view.leadDays}
            disabled={!editing || !view.enabled}
            onChange={(event) => setDraft((current) => ({ ...current, leadDays: Number(event.target.value) }))}
          />
        </label>

        <label>
          Culoarea benzii
          <input
            type="color"
            value={view.color}
            disabled={!editing || !view.enabled}
            onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
          />
        </label>

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
