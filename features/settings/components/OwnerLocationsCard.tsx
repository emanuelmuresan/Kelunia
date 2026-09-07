"use client";

import { useEffect, useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import { billingStatusLabel, dateFromFirestoreValue, planLabel } from "@/lib/licensing";
import type { LocationItem } from "@/lib/types/domain";

function locationExpiryLabel(location: LocationItem) {
  const trialEnd = dateFromFirestoreValue(location.trialEndsAt);
  const subscriptionEnd = dateFromFirestoreValue(location.subscriptionExpiresAt);
  const endDate = location.billingStatus === "trialing" ? trialEnd : subscriptionEnd ?? trialEnd;

  if (!endDate) {
    return "fara data";
  }

  const days = Math.ceil((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  if (days < 0) {
    return `expirata de ${Math.abs(days)} zile`;
  }

  if (days === 0) {
    return "expira azi";
  }

  if (days === 1) {
    return "mai are 1 zi";
  }

  return `mai are ${days} zile`;
}

type OwnerLocationsCardProps = {
  language: AppLanguage;
  locations: LocationItem[];
  currentLocationId: string;
  licenseCodeCount: number;
  newsletterSubscriberCount: number;
  communityApplicationsCount: number;
  communityApplicationsError: string;
  unreadLandingMessageCount: number;
  onSelectLocation: (locationId: string) => void;
  onOpenLocationEditor: (location?: LocationItem) => void;
  onOpenLicenseCodes: () => void;
  onOpenNewsletter: () => void;
  onOpenInbox: () => void;
  onEnableOwnerNotifications: () => Promise<void>;
};

/** Owner-only panel: workspace locations list + license / newsletter / inbox tool cards. */
export function OwnerLocationsCard({
  language,
  locations,
  currentLocationId,
  licenseCodeCount,
  newsletterSubscriberCount,
  communityApplicationsCount,
  communityApplicationsError,
  unreadLandingMessageCount,
  onSelectLocation,
  onOpenLocationEditor,
  onOpenLicenseCodes,
  onOpenNewsletter,
  onOpenInbox,
  onEnableOwnerNotifications,
}: OwnerLocationsCardProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const notificationsEnabled = notificationPermission === "granted";

  useEffect(() => {
    refreshNotificationPermission();
  }, []);

  function refreshNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(Notification.permission);
  }

  async function enableNotifications() {
    await onEnableOwnerNotifications();
    refreshNotificationPermission();
  }

  return (
    <article className="settings-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("role.owner")}</span>
          <h2>{t("settings.locations")}</h2>
        </div>
      </div>

      <p className="muted-note">{locations.length} locatii in workspace.</p>

      <div className="mini-list">
        {locations.length === 0 ? (
          <p className="empty-line">{t("settings.noItems")}</p>
        ) : (
          locations.map((location) => (
            <div className="mini-row" key={location.id}>
              <div className="mini-row-main">
                <span>{location.name}</span>
                {location.address && <small>{location.address}</small>}
                <small>
                  {planLabel(location.plan ?? "standard")} · {billingStatusLabel(location.billingStatus ?? "trialing")} · {locationExpiryLabel(location)}
                </small>
              </div>
              <div className="row-actions">
                <button
                  className="secondary-button compact location-open-button"
                  onClick={() => onSelectLocation(location.id)}
                  type="button"
                >
                  {location.id === currentLocationId ? "Deschisa" : "Deschide"}
                </button>
                <button
                  className="secondary-button compact"
                  onClick={() => onOpenLocationEditor(location)}
                  type="button"
                >
                  Licenta
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="owner-tool-grid">
        <div className="owner-tool-card">
          <div>
            <span className="eyebrow">Licente</span>
            <h3>Control licente</h3>
            <p>{licenseCodeCount} coduri generate.</p>
          </div>

          <div className="owner-tool-actions">
            <button className="primary-button compact" onClick={onOpenLicenseCodes} type="button">
              Deschide
            </button>
          </div>
        </div>

        <div className="owner-tool-card">
          <div>
            <span className="eyebrow">Newsletter</span>
            <h3>Actualizări</h3>
            <p>{newsletterSubscriberCount} abonați activi.</p>
          </div>

          <div className="owner-tool-actions">
            <button className="primary-button compact" onClick={onOpenNewsletter} type="button">
              Deschide
            </button>
          </div>
        </div>

        <div className="owner-tool-card">
          <div>
            <span className="eyebrow">Inbox</span>
            <h3>Mesaje Landing</h3>
            <p>
              {communityApplicationsCount} mesaje primite
              {unreadLandingMessageCount > 0 ? ` · ${unreadLandingMessageCount} necitite` : ""}
            </p>
          </div>

          {communityApplicationsError && (
            <p className="error-line">{communityApplicationsError}</p>
          )}

          <div className="owner-tool-actions">
            {unreadLandingMessageCount > 0 && <span className="badge-pill">{unreadLandingMessageCount}</span>}
            {notificationsEnabled ? (
              <span className="badge-pill success">Notificari active</span>
            ) : (
              <button className="secondary-button compact" onClick={enableNotifications} type="button">
                Activeaza notificari
              </button>
            )}
            <button className="primary-button compact" onClick={onOpenInbox} type="button">
              Deschide inbox
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
