"use client";

import Link from "next/link";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
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
  language?: SupportedLocale;
  onNavigate: (view: AppView) => void;
  onSignOut: () => void;
};

function tabIconClass(view: AppView) {
  return `tab-icon tab-icon-${view}`;
}

function splitBalancedTitle(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return words;
  }

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")].filter(Boolean);
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
  language = "ro",
  onNavigate,
  onSignOut,
}: KeluniaShellChromeProps) {
  const headerTitleLines = splitBalancedTitle(headerTitle);

  return (
    <>
      <header className="app-topbar app-main-topbar">
        <div className="app-topbar-brand" aria-label="Kelunia">
          <img src="/icon-192.png" alt="" />
        </div>

        <div className="app-topbar-context">
          {headerTitleLines.length > 0 && (
            <h1 className={headerTitleLines.length === 1 ? "single-line-title" : undefined}>
              {headerTitleLines.map((line, index) => (
                <span key={`${line}-${index}`}>{line}</span>
              ))}
            </h1>
          )}
          <p>{userLabel ?? appText(language, "public.subtitle")}</p>
        </div>
      </header>

      {!isOnline && <p className="offline-banner">{offlineMessage}</p>}
      {isSignedIn && showLicenseWarning && <p className="warning-line settings-alert">{licenseMessage}</p>}

      {!isSignedIn && (
        <section className="public-intro" aria-label="Kelunia">
          <div className="public-intro-copy">
            <span className="eyebrow">Kelunia</span>
            <h2>{appText(language, "public.title")}</h2>
            <p>{appText(language, "public.subtitle")}</p>
            <div className="intro-tags" aria-label="Caracteristici">
              <span>{appText(language, "public.feature.calendar")}</span>
              <span>{appText(language, "public.feature.bookings")}</span>
              <span>{appText(language, "public.feature.locations")}</span>
            </div>
          </div>
          <img src="/kelunia-logo.png" alt="Kelunia" />
        </section>
      )}

      <nav className="app-tabs" aria-label={appText(language, "nav.aria")}>
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
          <button className="logout-button app-tab-action app-tab-logout" onClick={onSignOut} aria-label={appText(language, "action.signOut")} title={appText(language, "action.signOut")} type="button">
            <span className="logout-door" aria-hidden="true" />
            <span className="tab-label">{appText(language, "action.signOut")}</span>
          </button>
        ) : (
          <Link className="app-tab-link app-tab-login" href="/login" aria-label={appText(language, "auth.signIn")} title={appText(language, "auth.signIn")}>
            <span className="tab-icon tab-icon-login" aria-hidden="true" />
            <span className="tab-label">{appText(language, "auth.signIn")}</span>
          </Link>
        )}
      </nav>
    </>
  );
}
