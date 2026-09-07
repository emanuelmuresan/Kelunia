"use client";

import Link from "next/link";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, localeLabel, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { PersonalDraft } from "@/lib/types/domain";

type ProfileSummaryCardProps = {
  userExists: boolean;
  isOwner: boolean;
  isSuperAdmin: boolean;
  personalDraft: PersonalDraft;
  groupsLabel: string;
  onEditProfile: () => void;
  onOpenPasswordModal: () => void;
  onDeleteAccount: () => void;
};

/** "Personal" panel: read-only summary of the signed-in user's profile + card actions. */
export function ProfileSummaryCard({
  userExists,
  isOwner,
  isSuperAdmin,
  personalDraft,
  groupsLabel,
  onEditProfile,
  onOpenPasswordModal,
  onDeleteAccount,
}: ProfileSummaryCardProps) {
  const language: AppLanguage = personalDraft.language;
  const t = (key: UiCopyKey) => appText(language, key);

  return (
    <article className="settings-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("settings.profile")}</span>
          <h2>{t("settings.personal")}</h2>
        </div>
      </div>

      {userExists ? (
        <>
        <div className="settings-summary-list profile-summary-list">
          <div>
            <span>{t("settings.name")}</span>
            <strong>{personalDraft.displayName || t("settings.notSet")}</strong>
          </div>
          <div>
            <span>{t("settings.role")}</span>
            <strong>{isOwner ? t("role.owner") : isSuperAdmin ? t("role.administrator") : t("role.collaborator")}</strong>
          </div>
          <div>
            <span>{appText(personalDraft.language, "common.language")}</span>
            <strong>{localeLabel(personalDraft.language)}</strong>
          </div>
          {!isOwner && (
            <div>
              <span>{groupsLabel}</span>
              <strong>{personalDraft.groupName || t("settings.notChosen")}</strong>
            </div>
          )}
          <div>
            <span>{t("settings.security")}</span>
            <strong>
              {personalDraft.useBiometrics
                ? t("settings.lockPinBiometric")
                : personalDraft.usePin
                  ? t("settings.lockPin")
                  : t("settings.lockNone")}
            </strong>
          </div>
          <div>
            <span>{t("settings.blockOnExit")}</span>
            <strong>{personalDraft.lockOnHide ? t("settings.active") : t("settings.inactive")}</strong>
          </div>
          {!isOwner && (
            <div>
              <span>{t("settings.notifications")}</span>
              <strong>
                {personalDraft.notifyGroupBookings
                  ? `${personalDraft.notifyOffsets.length} active`
                  : t("settings.inactive")}
              </strong>
            </div>
          )}
        </div>

        <div className="settings-card-actions">
          <button className="primary-button compact" onClick={onEditProfile} type="button">
            {t("settings.editSettings")}
          </button>
          <button className="secondary-button compact" onClick={onOpenPasswordModal} type="button">
            {t("settings.password")}
          </button>
          <button className="danger-button compact" onClick={onDeleteAccount} type="button">
            Șterge contul
          </button>
        </div>

        </>
      ) : (
        <div className="empty-state">
          <p>{t("auth.signIn")}</p>
          <Link className="primary-link" href="/login">
            {t("auth.signIn")}
          </Link>
        </div>
      )}
    </article>
  );
}
