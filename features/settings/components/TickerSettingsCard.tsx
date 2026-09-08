"use client";

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

  return (
    <article className="settings-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("nav.calendar")}</span>
          <h2>Bandă evenimente viitoare</h2>
        </div>
      </div>

      <div className="settings-form">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          Afișează banda sus (doar pe acest dispozitiv)
        </label>

        <label>
          Cu câte zile înainte apar evenimentele
          <input
            type="number"
            min={1}
            max={60}
            value={settings.leadDays}
            disabled={!settings.enabled}
            onChange={(event) => onChange({ leadDays: Number(event.target.value) })}
          />
        </label>

        <label>
          Culoarea benzii
          <input
            type="color"
            value={settings.color}
            disabled={!settings.enabled}
            onChange={(event) => onChange({ color: event.target.value })}
          />
        </label>
      </div>
    </article>
  );
}
