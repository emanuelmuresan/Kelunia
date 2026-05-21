"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function isInstalledAppShell() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:" ||
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function AppEntryRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!isInstalledAppShell() || loading) {
      return;
    }

    router.replace(user?.emailVerified ? "/dashboard" : "/login");
  }, [loading, router, user]);

  return (
    <div className="app-entry-splash" aria-live="polite">
      <div className="loading-logo">
        <img src="/icon-192.png" alt="Kelunia" />
      </div>
      <h1>Kelunia</h1>
      <p>Se pregătește calendarul...</p>
    </div>
  );
}
