"use client";

// Fereastra „Setări personale”, deschisă din cardul Profil: toate setările personale în citire, grupate în blocuri
// (identitate, securitate, notificări, cont), fiecare cu propriul „Modifică” care deschide ProfileEditorModal pentru acel bloc.
import type { AppLanguage } from "@/context/AuthContext";
import type { ProfileSection } from "@/features/settings/components/ProfileEditorModal";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { getNewBookingPushPreference } from "@/lib/push-notifications";
import { appText, localeLabel, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { PersonalDraft } from "@/lib/types/domain";

// Proprietățile ferestrei: rolul, ciorna setărilor personale și acțiunile (modificare, parolă, ștergerea contului).
type ProfileSettingsModalProps = {
  isOwner: boolean;
  isSuperAdmin: boolean;
  groupsLabel: string;
  personalDraft: PersonalDraft;
  onEditSection: (section: ProfileSection) => void;
  onOpenPasswordModal: () => void;
  onDeleteAccount: () => void;
  onClose: () => void;
};

/**
 * "Personal settings" opened from its card: every setting laid out read-only, grouped
 * in blocks, each block with its own "Modifică" (editing one block never touches the others).
 */
// Componenta ferestrei.
export function ProfileSettingsModal({
  isOwner,
  isSuperAdmin,
  groupsLabel,
  personalDraft,
  onEditSection,
  onOpenPasswordModal,
  onDeleteAccount,
  onClose,
}: ProfileSettingsModalProps) {
  // Limba ferestrei este cea aleasă în ciorna personală; butonul „Modifică” al fiecărui bloc și eticheta tipului de blocare.
  const language: AppLanguage = personalDraft.language;
  const t = (key: UiCopyKey) => appText(language, key);
  const editButton = (section: ProfileSection) => (
    <button className="secondary-button compact" onClick={() => onEditSection(section)} type="button">
      {t("settings.edit")}
    </button>
  );
  const lockLabel = personalDraft.useBiometrics
    ? t("settings.lockPinBiometric")
    : personalDraft.usePin
      ? t("settings.lockPin")
      : t("settings.lockNone");

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-view-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Antetul ferestrei. */}
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("settings.profile")}</span>
            <h2 id="profile-view-title">{t("settings.personal")}</h2>
          </div>
        </div>

        {/* Blocurile, în citire. */}
        <div className="settings-form">
          {/* Identitate: nume, rol, limbă și (pentru ne-proprietari) grupul. */}
          <SettingsBlock title={t("settings.blockIdentity")} action={editButton("identity")}>
            <div className="settings-summary-list">
              <div>
                <span>{t("settings.name")}</span>
                <strong>{personalDraft.displayName || t("settings.notSet")}</strong>
              </div>
              <div>
                <span>{t("settings.role")}</span>
                <strong>{isOwner ? t("role.owner") : isSuperAdmin ? t("role.administrator") : t("role.collaborator")}</strong>
              </div>
              <div>
                <span>{t("common.language")}</span>
                <strong>{localeLabel(personalDraft.language)}</strong>
              </div>
              {!isOwner && (
                <div>
                  <span>{groupsLabel}</span>
                  <strong>{personalDraft.groupName || t("settings.notChosen")}</strong>
                </div>
              )}
            </div>
          </SettingsBlock>

          {/* Securitate: tipul de blocare și blocarea la ieșire, plus butonul pentru parolă. */}
          <SettingsBlock title={t("settings.security")} action={editButton("security")}>
            <div className="settings-summary-list">
              <div>
                <span>{t("settings.security")}</span>
                <strong>{lockLabel}</strong>
              </div>
              <div>
                <span>{t("settings.blockOnExit")}</span>
                <strong>{personalDraft.lockOnHide ? t("settings.active") : t("settings.inactive")}</strong>
              </div>
            </div>
            <div className="settings-card-actions">
              <button className="secondary-button compact" onClick={onOpenPasswordModal} type="button">
                {t("settings.password")}
              </button>
            </div>
          </SettingsBlock>

          {/* Notificări (doar pentru cei care nu sunt proprietari): notificările pentru rezervări noi și memento-urile. */}
          {!isOwner && (
            <SettingsBlock title={t("settings.notifications")} action={editButton("notifications")}>
              <div className="settings-summary-list">
                <div>
                  <span>{t("settings.notifNewBookingsShort")}</span>
                  <strong>{getNewBookingPushPreference() ? t("settings.active") : t("settings.inactive")}</strong>
                </div>
                <div>
                  <span>{t("settings.notifReminders")}</span>
                  <strong>
                    {personalDraft.notifyGroupBookings
                      ? t("settings.notifMoments").replace("{{count}}", String(personalDraft.notifyOffsets.length))
                      : t("settings.inactive")}
                  </strong>
                </div>
              </div>
            </SettingsBlock>
          )}

          {/* Contul: ștergerea contului. */}
          <SettingsBlock title={t("settings.accountBlock")}>
            <div className="settings-card-actions">
              <button className="danger-button compact" onClick={onDeleteAccount} type="button">
                {t("settings.deleteAccount")}
              </button>
            </div>
          </SettingsBlock>

          <div className="modal-actions">
            <button className="primary-button" onClick={onClose} type="button">
              {t("action.done")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
