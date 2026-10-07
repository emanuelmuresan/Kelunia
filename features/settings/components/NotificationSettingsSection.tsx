"use client";

// Setările de notificări ale utilizatorului: starea permisiunii pe acest dispozitiv, notificări pentru rezervări noi
// și memento-uri înainte de începerea rezervărilor grupului (până la 5 momente, în minute, ore sau zile).
import { useEffect, useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import {
  getKeluniaNotificationPermission,
  requestKeluniaNotificationPermission,
  type KeluniaNotificationPermission,
} from "@/lib/notifications";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import type { PersonalDraft } from "@/lib/types/domain";

// Proprietățile secțiunii: ciorna, preferința dispozitivului și funcțiile de actualizare.
type NotificationSettingsSectionProps = {
  language: AppLanguage;
  personalDraft: PersonalDraft;
  setPersonalDraft: (value: PersonalDraft) => void;
  newBookingPush: boolean;
  onNewBookingPushChange: (enabled: boolean) => void;
  onDeviceEnabled: () => void | Promise<void>;
};

// Etichetele stării permisiunii de notificare.
const statusKeys: Record<KeluniaNotificationPermission, UiCopyKey> = {
  granted: "settings.notifStatusGranted",
  denied: "settings.notifStatusDenied",
  default: "settings.notifStatusDefault",
  unsupported: "settings.notifStatusUnsupported",
};

// Câmpurile vechi (notifyWeekBefore, notifyDayBefore, notifyOffsetsDays) se actualizează odată cu lista de momente, pentru compatibilitate.
function syncLegacyNotificationFlags(nextOffsets: string[]) {
  return {
    notifyWeekBefore: nextOffsets.includes("7d"),
    notifyDayBefore: nextOffsets.includes("1d"),
    notifyOffsetsDays: nextOffsets
      .filter((offset) => offset.endsWith("d"))
      .map((offset) => Number(offset.slice(0, -1)))
      .filter((offset) => Number.isInteger(offset) && offset >= 1 && offset <= 30),
  };
}

// Unitatea unui moment („15m”, „2h”, „7d”) și limita fiecărei unități.
function offsetUnit(offset: string) {
  return offset.endsWith("d") ? "d" : offset.endsWith("h") ? "h" : "m";
}

function unitMax(unit: "m" | "h" | "d") {
  return unit === "m" ? 120 : unit === "h" ? 48 : 30;
}

/** Device status, new-booking pings and pre-start reminders, each with its own plain-language label. */
// Componenta secțiunii.
export function NotificationSettingsSection({
  language,
  personalDraft,
  setPersonalDraft,
  newBookingPush,
  onNewBookingPushChange,
  onDeviceEnabled,
}: NotificationSettingsSectionProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  // Starea permisiunii de notificare și dacă se cere permisiunea chiar acum.
  const [permission, setPermission] = useState<KeluniaNotificationPermission>("default");
  const [enabling, setEnabling] = useState(false);

  // La montare se citește starea permisiunii.
  useEffect(() => {
    let cancelled = false;

    void getKeluniaNotificationPermission().then((value) => {
      if (!cancelled) {
        setPermission(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Cere permisiunea și (re)înregistrează dispozitivul pentru push.
  async function enableDevice() {
    setEnabling(true);

    try {
      await requestKeluniaNotificationPermission();
      setPermission(await getKeluniaNotificationPermission());
      await onDeviceEnabled();
    } finally {
      setEnabling(false);
    }
  }

  // Modifică lista momentelor: valoarea sau unitatea unuia, ștergerea și adăugarea unuia nou.
  function applyOffsets(nextOffsets: string[]) {
    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function updateOffsetAmount(index: number, value: string) {
    const current = personalDraft.notifyOffsets[index] ?? "15m";
    const unit = offsetUnit(current);
    const amount = Math.max(1, Math.min(unitMax(unit), Number(value) || 1));
    applyOffsets(personalDraft.notifyOffsets.map((offset, offsetIndex) => (offsetIndex === index ? `${amount}${unit}` : offset)));
  }

  function updateOffsetUnit(index: number, unit: "m" | "h" | "d") {
    const current = personalDraft.notifyOffsets[index] ?? "15m";
    const amount = Math.min(Math.max(1, Number(current.slice(0, -1)) || 1), unitMax(unit));
    applyOffsets(personalDraft.notifyOffsets.map((offset, offsetIndex) => (offsetIndex === index ? `${amount}${unit}` : offset)));
  }

  // Structura secțiunii.
  return (
    <div className="notif-settings">
      {/* Blocul „Acest dispozitiv”: starea permisiunii și notificările pentru rezervări noi. */}
      <SettingsBlock title={t("settings.notifDevice")}>
        <div className="notif-status-row">
          <span className={`notif-status notif-status-${permission}`}>{t(statusKeys[permission])}</span>
          {permission === "default" && (
            <button className="secondary-button compact" disabled={enabling} onClick={enableDevice} type="button">
              {t("settings.notifEnable")}
            </button>
          )}
        </div>

        <label className="toggle-row">
          <input type="checkbox" checked={newBookingPush} onChange={(event) => onNewBookingPushChange(event.target.checked)} />
          {t("settings.notifNewBookings")}
        </label>
        <small className="muted-note">{t("settings.notifNewBookingsHint")}</small>
      </SettingsBlock>

      {/* Blocul „Memento-uri”: momentele de notificare înainte de începerea rezervărilor grupului. */}
      <SettingsBlock title={t("settings.notifReminders")}>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={personalDraft.notifyGroupBookings}
            onChange={(event) => setPersonalDraft({ ...personalDraft, notifyGroupBookings: event.target.checked })}
          />
          {t("settings.notifRemindersToggle")}
        </label>

        {personalDraft.notifyGroupBookings && (
          <div className="notification-options">
            {personalDraft.notifyOffsets.map((offset, index) => {
              const unit = offsetUnit(offset);
              const amount = Math.max(1, Number(offset.slice(0, -1)) || 1);

              return (
                <div className="notif-offset-row" key={`${offset}-${index}`}>
                  <input
                    min={1}
                    max={unitMax(unit)}
                    type="number"
                    value={amount}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => updateOffsetAmount(index, event.target.value)}
                  />
                  <select value={unit} onChange={(event) => updateOffsetUnit(index, event.target.value as "m" | "h" | "d")}>
                    <option value="m">{t("booking.minute")}</option>
                    <option value="h">{t("booking.hour")}</option>
                    <option value="d">{t("booking.day")}</option>
                  </select>
                  <span>{t("settings.notifBeforeStart")}</span>
                  <button
                    aria-label={t("settings.notifRemoveMoment")}
                    className="secondary-button compact"
                    onClick={() => applyOffsets(personalDraft.notifyOffsets.filter((_, offsetIndex) => offsetIndex !== index))}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {personalDraft.notifyOffsets.length < 5 && (
              <button
                className="secondary-button compact"
                onClick={() => applyOffsets([...personalDraft.notifyOffsets, "15m"])}
                type="button"
              >
                {t("settings.notifAddMoment")}
              </button>
            )}

            <label className="toggle-row compact-toggle">
              <input
                type="checkbox"
                checked={personalDraft.notifyFixedGroupSchedules}
                onChange={(event) => setPersonalDraft({ ...personalDraft, notifyFixedGroupSchedules: event.target.checked })}
              />
              {t("settings.notifIncludeFixed")}
            </label>
          </div>
        )}
      </SettingsBlock>

      {/* Nota de subsol. */}
      <small className="muted-note">{t("settings.notifFootnote")}</small>
    </div>
  );
}
