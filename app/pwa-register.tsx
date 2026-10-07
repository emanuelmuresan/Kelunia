"use client";

// Registrează service worker-ul care face aplicația instalabilă (PWA) și o curăță în dezvoltare.

import { useEffect } from "react";

// Componentă fără interfață: doar rulează efectul de înregistrare la montare.
export default function PwaRegister() {
  // Dacă browserul nu are service worker, nu avem ce înregistra.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Pe localhost sau în dezvoltare nu vrem service worker: ar servi pagini vechi din cache.
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0";

    // În mediu local îl dezînregistrăm și ștergem cache-ul lui, apoi ieșim.
    if (process.env.NODE_ENV !== "production" || isLocal) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch((error) => console.warn("Service worker local nu a putut fi oprit:", error));

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith("kelunia-shell-")).map((key) => caches.delete(key))))
          .catch((error) => console.warn("Cache-ul local PWA nu a putut fi curatat:", error));
      }

      return;
    }

    // În producție înregistrăm /sw.js după încărcarea paginii.
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.warn("Service worker indisponibil:", error);
      }
    };

    window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
