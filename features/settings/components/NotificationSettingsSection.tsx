"use client";

import { useEffect, useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import {
  getKeluniaNotificationPermission,
  requestKeluniaNotificationPermission,
  type KeluniaNotificationPermission,
} from "@/lib/notifications";
import type { PersonalDraft } from "@/lib/types/domain";

type NotificationSettingsSectionProps = {
  language: AppLanguage;
  personalDraft: PersonalDraft;
  setPersonalDraft: (value: PersonalDraft) => void;
  newBookingPush: boolean;
  onNewBookingPushChange: (enabled: boolean) => void;
  onDeviceEnabled: () => void | Promise<void>;
};

const statusKeys: Record<KeluniaNotificationPermission, UiCopyKey> = {
  granted: "settings.notifStatusGranted",
  denied: "settings.notifStatusDenied",
  default: "settings.notifStatusDefault",
  unsupported: "settings.notifStatusUnsupported",
};

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

function offsetUnit(offset: string) {
  return offset.endsWith("d") ? "d" : offset.endsWith("h") ? "h" : "m";
}

function unitMax(unit: "m" | "h" | "d") {
  return unit === "m" ? 120 : unit === "h" ? 48 : 30;
}

/** Device status, new-booking pings and pre-start reminders, each with its own plain-language label. */
export function NotificationSettingsSection({
  language,
  personalDraft,
  setPersonalDraft,
  newBookingPush,
  onNewBookingPushChange,
  onDeviceEnabled,
}: NotificationSettingsSectionProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [permission, setPermission] = useState<KeluniaNotificationPermission>("default");
  const [enabling, setEnabling] = useState(false);

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

  return (
    <div className="notif-settings">
      <section className="notif-block">
        <h4>{t("settings.notifDevice")}</h4>
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
      </section>

      <section className="notif-block">
        <h4>{t("settings.notifReminders")}</h4>
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
      </section>

      <small className="muted-note">{t("settings.notifFootnote")}</small>
    </div>
  );
}
