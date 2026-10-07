"use client";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

export type LicenseAccess = {
  planLabel: string;
  statusLabel: string;
  status: string;
  daysRemaining: number | null;
};

function licenseRemainingLabel(licenseAccess: LicenseAccess, t: (key: UiCopyKey) => string) {
  if (licenseAccess.status === "expired") {
    return t("settings.licenseExpired");
  }

  if (licenseAccess.daysRemaining === null) {
    return licenseAccess.status === "active" ? t("settings.licenseNoDate") : t("settings.licenseUnspecified");
  }

  const days = Math.max(0, licenseAccess.daysRemaining);

  if (days === 0) {
    return t("settings.licenseExpiresToday");
  }

  if (days === 1) {
    return t("settings.licenseExpiresTomorrow");
  }

  return t("settings.licenseExpiresInDays").replace("{{days}}", String(days));
}

type LicenseSummaryCardProps = {
  language: AppLanguage;
  licenseAccess: LicenseAccess;
  currentLocationCodeCount: number;
  currentLocationManagerAccountCount: number;
  currentLocationManagerLimit: number;
  canManageAccessCodes: boolean;
  onOpenCodesEditor: () => void;
};

/** "Codes" panel: license plan/status summary + access-code counts. */
export function LicenseSummaryCard({
  language,
  licenseAccess,
  currentLocationCodeCount,
  currentLocationManagerAccountCount,
  currentLocationManagerLimit,
  canManageAccessCodes,
  onOpenCodesEditor,
}: LicenseSummaryCardProps) {
  const t = (key: UiCopyKey) => appText(language, key);

  return (
    <article className="settings-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("settings.access")}</span>
          <h2>{t("settings.codes")}</h2>
        </div>
      </div>

      <div className="settings-summary-list">
        <div>
          <span>{t("settings.plan")}</span>
          <strong>{licenseAccess.planLabel}</strong>
        </div>
        <div>
          <span>{t("settings.licenseStatus")}</span>
          <strong>{licenseAccess.statusLabel}</strong>
        </div>

        <div>
          <span>{t("settings.validity")}</span>
          <strong>{licenseRemainingLabel(licenseAccess, t)}</strong>
        </div>

        <div>
          <span>{t("settings.currentLocation")}</span>
          <strong>{t("settings.codesCount").replace("{{count}}", String(currentLocationCodeCount))}</strong>
        </div>

        <div>
          <span>{t("settings.administrators")}</span>
          <strong>
            {currentLocationManagerAccountCount}/{currentLocationManagerLimit}
          </strong>
        </div>
      </div>

      {canManageAccessCodes && (
        <div className="settings-card-actions">
          <button className="primary-button compact" onClick={onOpenCodesEditor} type="button">
            {t("settings.edit")}
          </button>
        </div>
      )}
    </article>
  );
}
