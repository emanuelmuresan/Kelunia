"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isInstalledAppShell } from "@/lib/app-shell";
import { useAuth } from "@/context/AuthContext";

export function AppEntryRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    const redirectInstalledShell = () => {
      if (isInstalledAppShell()) {
        router.replace(user?.emailVerified ? "/dashboard" : "/login");
      }
    };
    const delayedRedirect = window.setTimeout(redirectInstalledShell, 250);

    redirectInstalledShell();

    return () => window.clearTimeout(delayedRedirect);
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
