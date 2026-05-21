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
      <div className="app-entry-logo">
        <img src="/icon-192.png" alt="Kelunia" />
      </div>
      <strong>Kelunia</strong>
      <span>Se deschide aplicația...</span>
    </div>
  );
}
