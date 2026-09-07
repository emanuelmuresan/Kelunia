"use client";

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
    <article className="settings-panel wide">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("settings.users")}</span>
          <h2>{managedUsers.length} conturi</h2>
        </div>
      </div>

      <div className="owner-tool-card">
        <div>
          <span className="eyebrow">{t("settings.access")}</span>
          <h3>{managedUsers.length} {managedUsers.length === 1 ? "utilizator" : "utilizatori"}</h3>
          <p>
            {managerCount} administratori · {managedUsers.length - managerCount} colaboratori si oaspeti
          </p>
        </div>
        <div className="owner-tool-actions">
          <button className="primary-button compact" onClick={onOpenUsersManager} type="button">
            {t("settings.users")}
          </button>
        </div>
      </div>
    </article>
  );
}
