"use client";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

export type LicenseAccess = {
  planLabel: string;
  statusLabel: string;
  status: string;
  daysRemaining: number | null;
};

function licenseRemainingLabel(licenseAccess: LicenseAccess) {
  if (licenseAccess.status === "expired") {
    return "Expirata";
  }

  if (licenseAccess.daysRemaining === null) {
    return licenseAccess.status === "active" ? "Fara data de expirare" : "Nespecificat";
  }

  const days = Math.max(0, licenseAccess.daysRemaining);

  if (days === 0) {
    return "Expira azi";
  }

  if (days === 1) {
    return "Expira maine";
  }

  return `Expira in ${days} zile`;
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

        {canManageAccessCodes && (
          <button className="secondary-button compact" onClick={onOpenCodesEditor} type="button">
            {t("settings.edit")}
          </button>
        )}
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
          <strong>{licenseRemainingLabel(licenseAccess)}</strong>
        </div>

        <div>
          <span>{t("settings.currentLocation")}</span>
          <strong>{currentLocationCodeCount} coduri</strong>
        </div>

        <div>
          <span>{t("settings.administrators")}</span>
          <strong>
            {currentLocationManagerAccountCount}/{currentLocationManagerLimit}
          </strong>
        </div>
      </div>
    </article>
  );
}
