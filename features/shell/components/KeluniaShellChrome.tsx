"use client";

import Link from "next/link";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import type { AppView } from "@/lib/types/domain";

type NavigationItem = [AppView, string];

type KeluniaShellChromeProps = {
  displayedView: AppView;
  headerTitle: string;
  isOnline: boolean;
  isSignedIn: boolean;
  licenseMessage: string;
  navigationItems: NavigationItem[];
  offlineMessage: string;
  showLicenseWarning: boolean;
  userLabel?: string;
  onNavigate: (view: AppView) => void;
  onSignOut: () => void;
};

function tabIconClass(view: AppView) {
  return `tab-icon tab-icon-${view}`;
}

export function KeluniaShellChrome({
  displayedView,
  headerTitle,
  isOnline,
  isSignedIn,
  licenseMessage,
  navigationItems,
  offlineMessage,
  showLicenseWarning,
  userLabel,
  onNavigate,
  onSignOut,
}: KeluniaShellChromeProps) {
  return (
    <>
      <header className="app-topbar app-main-topbar">
        <div className="app-topbar-brand" aria-label="Kelunia">
          <img src="/icon-192.png" alt="" />
          <span>Kelunia</span>
        </div>

        <div className="app-topbar-context">
          {headerTitle && <h1>{headerTitle}</h1>}
          <p>{userLabel ?? "Rezervări clare pentru fiecare spațiu al comunității."}</p>
        </div>

        <div className="topbar-actions">
          <InstallAppPrompt />
          {isSignedIn ? (
            <button className="icon-button logout-button" onClick={onSignOut} aria-label="Ieșire" type="button">
              <span className="logout-door" aria-hidden="true" />
              <span>Ieșire</span>
            </button>
          ) : (
            <Link className="primary-link" href="/login">
              Intră în cont
            </Link>
          )}
        </div>
      </header>

      {!isOnline && <p className="offline-banner">{offlineMessage}</p>}
      {isSignedIn && showLicenseWarning && <p className="warning-line settings-alert">{licenseMessage}</p>}

      {!isSignedIn && (
        <section className="public-intro" aria-label="Despre Kelunia">
          <div className="public-intro-copy">
            <span className="eyebrow">Kelunia</span>
            <h2>Un calendar liniștit pentru locuri folosite cu grijă.</h2>
            <p>
              Organizează săli, grupuri și rezervări într-un singur loc, cu acces simplu pentru fiecare rol și o vedere clară asupra săptămânii.
            </p>
            <div className="intro-tags" aria-label="Caracteristici">
              <span>Calendar</span>
              <span>Rezervări</span>
              <span>Locații</span>
            </div>
          </div>
          <img src="/kelunia-logo.png" alt="Kelunia" />
        </section>
      )}

      <nav className="app-tabs" aria-label="Navigare">
        {navigationItems.map(([value, label]) => (
          <button
            key={value}
            className={`${displayedView === value ? "active " : ""}app-tab-${value}`}
            onClick={() => onNavigate(value)}
            type="button"
            title={label}
            aria-label={label}
          >
            <span className={tabIconClass(value)} aria-hidden="true" />
            <span className="tab-label">{label}</span>
          </button>
        ))}
        <span className="app-tabs-spacer" aria-hidden="true" />
        <InstallAppPrompt />
        {isSignedIn ? (
          <button className="logout-button app-tab-action app-tab-logout" onClick={onSignOut} aria-label="Ieșire" title="Ieșire" type="button">
            <span className="logout-door" aria-hidden="true" />
            <span className="tab-label">Ieșire</span>
          </button>
        ) : (
          <Link className="app-tab-link app-tab-login" href="/login" aria-label="Intră în cont" title="Intră în cont">
            <span className="tab-icon tab-icon-login" aria-hidden="true" />
            <span className="tab-label">Intră în cont</span>
          </Link>
        )}
      </nav>
    </>
  );
}
