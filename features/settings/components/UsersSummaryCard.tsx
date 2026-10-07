"use client";

import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { ManagedUser } from "@/lib/types/domain";

type UsersSummaryCardProps = {
  language: AppLanguage;
  managedUsers: ManagedUser[];
  onOpenUsersManager: () => void;
};

/** Users panel: account counts + a button into the users manager modal. */
export function UsersSummaryCard({ language, managedUsers, onOpenUsersManager }: UsersSummaryCardProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const managerCount = managedUsers.filter((item) => item.role === "manager").length;

  return (
    <SettingsBlock title={t("settings.users")} action={<button className="secondary-button compact" onClick={onOpenUsersManager} type="button">{t("settings.openAction")}</button>}>

      <div className="settings-summary-list">
        <div>
          <span>{t("settings.users")}</span>
          <strong>{managedUsers.length}</strong>
        </div>
        <div>
          <span>{t("settings.administrators")}</span>
          <strong>{managerCount}</strong>
        </div>
        <div>
          <span>{t("role.collaborator")} / {t("role.guest")}</span>
          <strong>{managedUsers.length - managerCount}</strong>
        </div>
      </div>
    </SettingsBlock>
  );
}
