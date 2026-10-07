"use client";

import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { TickerEditorModal } from "@/features/settings/components/TickerEditorModal";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";

type TickerSettingsCardProps = {
  language: AppLanguage;
  settings: UpcomingTickerSettings;
  onChange: (patch: Partial<UpcomingTickerSettings>) => void;
};

/** Per-device summary of the upcoming-events band; editing happens in a modal. */
export function TickerSettingsCard({ language, settings, onChange }: TickerSettingsCardProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [editorOpen, setEditorOpen] = useState(false);

  function save(next: UpcomingTickerSettings) {
    onChange(next);
    setEditorOpen(false);
  }

  return (
    <>
      <SettingsBlock
        title={t("settings.tickerTitle")}
        action={
          <button className="secondary-button compact" onClick={() => setEditorOpen(true)} type="button">
            {t("settings.edit")}
          </button>
        }
      >

        <div className="settings-summary-list">
          <div>
            <span>{t("settings.tickerShowBlock")}</span>
            <strong>{settings.enabled ? t("settings.active") : t("settings.inactive")}</strong>
          </div>
          {settings.enabled && (
            <>
              <div>
                <span>{t("settings.tickerRangeBlock")}</span>
                <strong>{settings.leadDays} {t("booking.day")}</strong>
              </div>
              <div>
                <span>{t("settings.tickerColor")}</span>
                <strong>
                  <i className="ticker-color-swatch" style={{ backgroundColor: settings.color }} />
                </strong>
              </div>
              <div>
                <span>{t("settings.tickerTextColor")}</span>
                <strong>
                  {settings.textColor ? (
                    <i className="ticker-color-swatch" style={{ backgroundColor: settings.textColor }} />
                  ) : (
                    t("settings.tickerAuto")
                  )}
                </strong>
              </div>
            </>
          )}
        </div>
      </SettingsBlock>

      {editorOpen && (
        <TickerEditorModal language={language} settings={settings} onSave={save} onClose={() => setEditorOpen(false)} />
      )}
    </>
  );
}
