"use client";

// Ecranul de pornire al aplicației instalate: dacă rulează ca aplicație (PWA/nativă), sare direct la dashboard sau login.
// În browser obișnuit nu redirecționează; pagina de start rămâne landing-ul public.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isInstalledAppShell } from "@/lib/app-shell";
import { useAuth } from "@/context/AuthContext";

// Redirecționarea se face după ce se știe dacă utilizatorul e conectat; un cont neverificat merge la login.
export function AppEntryRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // A doua încercare, întârziată, acoperă detectarea întârziată a modului instalat.
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

  // Ecranul de așteptare afișat cât timp se decide destinația.
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
