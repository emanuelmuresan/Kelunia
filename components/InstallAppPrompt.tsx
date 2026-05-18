"use client";

import { useEffect, useState } from "react";

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

interface CapacitorWindow extends Window {
  Capacitor?: {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isNativeApp() {
  if (typeof window === "undefined") {
    return false;
  }

  const capacitor = (window as CapacitorWindow).Capacitor;

  if (capacitor?.isNativePlatform?.()) {
    return true;
  }

  const platform = capacitor?.getPlatform?.();

  if (platform && platform !== "web") {
    return true;
  }

  return window.location.protocol === "capacitor:" || window.location.protocol === "ionic:";
}

function isIosDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function installSteps() {
  if (typeof window === "undefined") {
    return [];
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  if (isIosDevice()) {
    return ["Deschide Kelunia in Safari.", "Apasa butonul Partajare.", "Alege Adauga la ecranul principal."];
  }

  if (userAgent.includes("android")) {
    return ["Deschide Kelunia in Chrome.", "Apasa meniul cu trei puncte.", "Alege Instaleaza aplicatia sau Adauga pe ecranul principal."];
  }

  return ["Deschide Kelunia in Chrome sau Edge.", "Apasa iconita de instalare din bara de adrese.", "Daca nu apare, deschide meniul browserului si alege Instaleaza Kelunia."];
}

export function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandaloneMode() || isNativeApp()) {
      setDismissed(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowHelp(false);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (dismissed || isStandaloneMode() || isNativeApp()) {
    return null;
  }

  const canPrompt = Boolean(installPrompt);

  async function installApp() {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === "dismissed") {
      setShowHelp(true);
    }
  }

  return (
    <>
      <button className="secondary-button compact install-button" onClick={installApp} type="button">
        Instaleaza
      </button>

      {showHelp && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card small-card install-card" role="dialog" aria-modal="true" aria-label="Instaleaza Kelunia">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Kelunia</span>
                <h2>Instaleaza aplicatia</h2>
              </div>
              <button onClick={() => setShowHelp(false)} type="button" aria-label="Inchide">x</button>
            </div>
            <ol className="install-steps">
              {installSteps().map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => setShowHelp(false)} type="button">Gata</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
