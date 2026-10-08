"use client";

// Blocurile „Licență” (plan, stare, valabilitate) și „Coduri de acces” (număr de coduri, administratori și limita planului)
// din secțiunea Acces; butonul „Deschide” duce către fereastra codurilor de acces.
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

// Datele de licență afișate: plan, stare și zilele rămase.
export type LicenseAccess = {
  planLabel: string;
  statusLabel: string;
  status: string;
  daysRemaining: number | null;
  isLifetime?: boolean;
};

// Textul valabilității: expirată, fără dată, expiră azi/mâine sau în N zile.
function licenseRemainingLabel(licenseAccess: LicenseAccess, t: (key: UiCopyKey) => string) {
  if (licenseAccess.isLifetime) {
    return t("license.lifetime");
  }

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

// Proprietățile cardului: licența, contoarele și acțiunea de deschidere a codurilor.
type LicenseSummaryCardProps = {
  language: AppLanguage;
  licenseAccess: LicenseAccess;
  currentLocationCodeCount: number;
  currentLocationManagerAccountCount: number;
  currentLocationManagerLimit: number;
  canManageAccessCodes: boolean;
  onOpenCodesEditor: () => void;
};

// Componenta cardului.
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
    <>
      {/* Blocul „Licență”. */}
      <SettingsBlock title={t("settings.blockLicense")}>
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
        </div>
      </SettingsBlock>

      {/* Blocul „Coduri de acces”; butonul apare doar celor care pot gestiona codurile. */}
      <SettingsBlock
        title={t("settings.blockCodes")}
        action={canManageAccessCodes ? <button className="secondary-button compact" onClick={onOpenCodesEditor} type="button">{t("settings.openAction")}</button> : undefined}
      >
        <div className="settings-summary-list">
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
      </SettingsBlock>
    </>
  );
}
