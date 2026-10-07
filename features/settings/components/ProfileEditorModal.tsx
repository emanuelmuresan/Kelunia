"use client";

// Fereastra de modificare a unui singur bloc din setările personale: identitate (limbă, nume, grup), securitate (PIN, biometrie,
// blocare la ieșire) sau notificări. Salvarea apelează funcția din dashboard; închiderea cu modificări cere confirmare.
import { useDismissGuard } from "@/features/shell/components/ConfirmDialog";
import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, supportedLocales, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import { NotificationSettingsSection } from "@/features/settings/components/NotificationSettingsSection";
import { getNewBookingPushPreference, setNewBookingPushPreference } from "@/lib/push-notifications";
import type { GroupItem, PersonalDraft } from "@/lib/types/domain";

// Blocurile care se pot modifica separat.
export type ProfileSection = "identity" | "security" | "notifications";

// Proprietățile ferestrei: blocul editat, ciorna, grupurile și funcțiile din dashboard.
type ProfileEditorModalProps = {
  section: ProfileSection;
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

// Compară două ciorne și copiază o ciornă (inclusiv listele), ca renunțarea să readucă valorile inițiale.
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

// Componenta ferestrei.
/** Personal profile dialog: language, name, group, lock toggles, notification offsets. */
export function ProfileEditorModal({
  section,
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
  // Starea inițială (pentru comparare și renunțare) și preferința de notificări pentru rezervări noi, pe acest dispozitiv.
  const language = personalDraft.language;
  const t = (key: UiCopyKey) => appText(language, key);
  const [baseline] = useState(() => copyPersonalDraft(personalDraft));
  const [baselineNewBookingPush] = useState(() => getNewBookingPushPreference());
  const [newBookingPush, setNewBookingPush] = useState(baselineNewBookingPush);
  // Fereastra este „murdară” dacă ciorna sau preferința dispozitivului diferă de starea inițială.
  const profileDirty = !samePersonalDraft(personalDraft, baseline) || newBookingPush !== baselineNewBookingPush;

  // Renunțarea readuce ciorna la starea inițială și închide fereastra.
  function handleClose() {
    setPersonalDraft(copyPersonalDraft(baseline));
    onClose();
  }

  // Închiderea prin clic pe fundal sau Esc cere confirmare doar dacă există modificări.
  const requestClose = useDismissGuard(profileDirty, handleClose, language);

  // Salvează: scrie preferința dispozitivului, apelează salvarea din dashboard și, dacă preferința s-a schimbat, reînregistrează jetonul push.
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

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={requestClose}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Antetul: numele blocului editat. */}
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("settings.personal")}</span>
            <h2 id="profile-settings-title">
              {t(section === "identity" ? "settings.blockIdentity" : section === "security" ? "settings.security" : "settings.notifications")}
            </h2>
          </div>
        </div>

        {/* Câmpurile blocului ales. */}
        <div className="settings-form">
          {/* Identitate: limba, numele și grupul. */}
          {section === "identity" && (
          <>
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
          </>
          )}

          {/* Securitate: PIN, biometrie și blocarea la ieșire. */}
          {section === "security" && (
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
          )}

          {/* Notificări (nu pentru proprietar). */}
          {section === "notifications" && !isOwner && (
            <NotificationSettingsSection
              language={language}
              personalDraft={personalDraft}
              setPersonalDraft={setPersonalDraft}
              newBookingPush={newBookingPush}
              onNewBookingPushChange={setNewBookingPush}
              onDeviceEnabled={onApplyDevicePush}
            />
          )}

          {/* Butoanele de renunțare și salvare; „Salvează” este activ doar dacă există modificări. */}
          <div className="modal-actions">
            <button className="secondary-button" onClick={handleClose} type="button">
              {t("action.cancel")}
            </button>
            <button className="primary-button" disabled={!profileDirty} onClick={handleSave} type="button">
              {t("action.save")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
