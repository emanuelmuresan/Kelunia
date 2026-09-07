"use client";

import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, supportedLocales, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { GroupItem, PersonalDraft } from "@/lib/types/domain";

type ProfileEditorModalProps = {
  isOwner: boolean;
  groups: GroupItem[];
  groupsLabel: string;
  personalDraft: PersonalDraft;
  setPersonalDraft: (value: PersonalDraft) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onHandlePinToggle: (checked: boolean) => void;
  onHandleBiometricsToggle: (checked: boolean) => void;
};

function samePersonalDraft(first: PersonalDraft, second: PersonalDraft) {
  return first.displayName === second.displayName
    && first.groupName === second.groupName
    && first.usePin === second.usePin
    && first.lockOnHide === second.lockOnHide
    && first.useBiometrics === second.useBiometrics
    && first.notifyGroupBookings === second.notifyGroupBookings
    && first.notifyFixedGroupSchedules === second.notifyFixedGroupSchedules
    && first.notifyWeekBefore === second.notifyWeekBefore
    && first.notifyDayBefore === second.notifyDayBefore
    && first.notifyOffsets.join("|") === second.notifyOffsets.join("|")
    && first.notifyOffsetsDays.join("|") === second.notifyOffsetsDays.join("|")
    && first.language === second.language;
}

function copyPersonalDraft(draft: PersonalDraft): PersonalDraft {
  return { ...draft, notifyOffsets: [...draft.notifyOffsets], notifyOffsetsDays: [...draft.notifyOffsetsDays] };
}

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

/** Personal profile dialog: language, name, group, lock toggles, notification offsets. */
export function ProfileEditorModal({
  isOwner,
  groups,
  groupsLabel,
  personalDraft,
  setPersonalDraft,
  onClose,
  onSave,
  onHandlePinToggle,
  onHandleBiometricsToggle,
}: ProfileEditorModalProps) {
  const language = personalDraft.language;
  const t = (key: UiCopyKey) => appText(language, key);
  const [baseline] = useState(() => copyPersonalDraft(personalDraft));
  const profileDirty = !samePersonalDraft(personalDraft, baseline);

  function updateNotificationOffset(index: number, value: string) {
    const current = personalDraft.notifyOffsets[index] ?? "15m";
    const unit = current.endsWith("d") ? "d" : current.endsWith("h") ? "h" : "m";
    const max = unit === "m" ? 120 : unit === "h" ? 48 : 30;
    const nextValue = Math.max(1, Math.min(max, Number(value) || 1));
    const nextOffsets = personalDraft.notifyOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${nextValue}${unit}` : offset
    );

    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function updateNotificationOffsetUnit(index: number, unit: "m" | "h" | "d") {
    const current = personalDraft.notifyOffsets[index] ?? "15m";
    const currentValue = Math.max(1, Number(current.slice(0, -1)) || 1);
    const nextValue = unit === "m" ? Math.min(currentValue, 120) : unit === "h" ? Math.min(currentValue, 48) : Math.min(currentValue, 30);
    const nextOffsets = personalDraft.notifyOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${nextValue}${unit}` : offset
    );

    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function addNotificationOffset() {
    const nextOffsets = [...personalDraft.notifyOffsets, "15m"].slice(0, 5);

    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function removeNotificationOffset(index: number) {
    const nextOffsets = personalDraft.notifyOffsets.filter((_, offsetIndex) => offsetIndex !== index);

    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function handleClose() {
    setPersonalDraft(copyPersonalDraft(baseline));
    onClose();
  }

  async function handleSave() {
    if (!profileDirty) {
      return;
    }

    await onSave();
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={handleClose}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("settings.profile")}</span>
            <h2 id="profile-settings-title">{t("settings.personal")}</h2>
          </div>
        </div>

        <div className="settings-form">
          <label>
            {appText(personalDraft.language, "common.language")}
            <select
              value={personalDraft.language}
              onChange={(event) =>
                setPersonalDraft({
                  ...personalDraft,
                  language: event.target.value as AppLanguage,
                })
              }
            >
              {supportedLocales.map((locale) => (
                <option key={locale.code} value={locale.code}>{locale.label}</option>
              ))}
            </select>
          </label>

          <label>
            {t("settings.name")}
            <input
              value={personalDraft.displayName}
              onChange={(event) =>
                setPersonalDraft({
                  ...personalDraft,
                  displayName: event.target.value,
                })
              }
            />
          </label>

          {!isOwner && (
            <label>
              {groupsLabel}
              <select
                value={personalDraft.groupName}
                onChange={(event) =>
                  setPersonalDraft({
                    ...personalDraft,
                    groupName: event.target.value,
                  })
                }
              >
                <option value="">{t("settings.notChosen")}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="settings-toggle-stack">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={personalDraft.usePin}
                onChange={(event) => onHandlePinToggle(event.target.checked)}
              />
              {t("settings.lockPin")}
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={personalDraft.useBiometrics}
                onChange={(event) => onHandleBiometricsToggle(event.target.checked)}
              />
              {t("settings.lockPinBiometric")}
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={personalDraft.lockOnHide}
                onChange={(event) =>
                  setPersonalDraft({
                    ...personalDraft,
                    lockOnHide: event.target.checked,
                  })
                }
              />
              {t("settings.blockOnExit")}
            </label>
          </div>

          {!isOwner && (
            <div className="settings-toggle-stack">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={personalDraft.notifyGroupBookings}
                  onChange={(event) =>
                    setPersonalDraft({
                      ...personalDraft,
                      notifyGroupBookings: event.target.checked,
                    })
                  }
                />
                {t("settings.notifications")}
              </label>

              {personalDraft.notifyGroupBookings && (
                <div className="notification-options">
                  <label className="toggle-row compact-toggle">
                    <input
                      type="checkbox"
                      checked={personalDraft.notifyFixedGroupSchedules}
                      onChange={(event) =>
                        setPersonalDraft({
                          ...personalDraft,
                          notifyFixedGroupSchedules: event.target.checked,
                        })
                      }
                    />
                    {t("fixed.new")}
                  </label>
                  {personalDraft.notifyOffsets.map((offset, index) => {
                    const unit = offset.endsWith("d") ? "d" : offset.endsWith("h") ? "h" : "m";
                    const amount = Math.max(1, Number(offset.slice(0, -1)) || 1);

                    return (
                    <label key={`${offset}-${index}`}>
                      {t("booking.offsetBefore")}
                      <div className="inline-add">
                        <input
                          min={1}
                          max={unit === "m" ? 120 : unit === "h" ? 48 : 30}
                          type="number"
                          value={amount}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => updateNotificationOffset(index, event.target.value)}
                        />
                        <select value={unit} onChange={(event) => updateNotificationOffsetUnit(index, event.target.value as "m" | "h" | "d")}>
                          <option value="m">{t("booking.minute")}</option>
                          <option value="h">{t("booking.hour")}</option>
                          <option value="d">{t("booking.day")}</option>
                        </select>
                        <button className="secondary-button compact" onClick={() => removeNotificationOffset(index)} type="button">
                          {t("action.delete")}
                        </button>
                      </div>
                    </label>
                    );
                  })}
                  {personalDraft.notifyOffsets.length < 5 && (
                    <button className="secondary-button compact" onClick={addNotificationOffset} type="button">
                      {t("booking.notifications")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button className="secondary-button" onClick={handleClose} type="button">
              {t("action.cancel")}
            </button>
            <button className="primary-button" disabled={!profileDirty} onClick={handleSave} type="button">
              {t("settings.saveChanges")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
