"use client";

import { useDismissGuard } from "@/features/shell/components/ConfirmDialog";
import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, supportedLocales, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { NotificationSettingsSection } from "@/features/settings/components/NotificationSettingsSection";
import { getNewBookingPushPreference, setNewBookingPushPreference } from "@/lib/push-notifications";
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
  onApplyDevicePush: () => void | Promise<void>;
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
  onApplyDevicePush,
}: ProfileEditorModalProps) {
  const language = personalDraft.language;
  const t = (key: UiCopyKey) => appText(language, key);
  const [baseline] = useState(() => copyPersonalDraft(personalDraft));
  const [baselineNewBookingPush] = useState(() => getNewBookingPushPreference());
  const [newBookingPush, setNewBookingPush] = useState(baselineNewBookingPush);
  const profileDirty = !samePersonalDraft(personalDraft, baseline) || newBookingPush !== baselineNewBookingPush;

  function handleClose() {
    setPersonalDraft(copyPersonalDraft(baseline));
    onClose();
  }

  const requestClose = useDismissGuard(profileDirty, handleClose, language);

  async function handleSave() {
    if (!profileDirty) {
      return;
    }

    const devicePushChanged = newBookingPush !== baselineNewBookingPush;

    if (devicePushChanged) {
      setNewBookingPushPreference(newBookingPush);
    }

    await onSave();

    if (devicePushChanged) {
      await onApplyDevicePush();
    }

    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={requestClose}>
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
          <SettingsBlock title={t("settings.blockIdentity")}>
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
          </SettingsBlock>

          <SettingsBlock title={t("settings.security")}>
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
          </SettingsBlock>

          {!isOwner && (
            <NotificationSettingsSection
              language={language}
              personalDraft={personalDraft}
              setPersonalDraft={setPersonalDraft}
              newBookingPush={newBookingPush}
              onNewBookingPushChange={setNewBookingPush}
              onDeviceEnabled={onApplyDevicePush}
            />
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
