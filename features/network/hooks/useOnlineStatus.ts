"use client";

// Starea conexiunii la internet (online/offline), folosită ca să se blocheze scrierile fără rețea.
// Poate fi marcată manual ca offline (setIsOnline) când o cerere eșuează din cauza rețelei.
import { useEffect, useState } from "react";

export function useOnlineStatus() {
  // Starea inițială vine din navigator.onLine (pe server se presupune online).
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === "undefined") {
      return true;
    }

    return navigator.onLine;
  });

  // Se actualizează la evenimentele online/offline ale browserului.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncOnlineStatus = () => {
      setIsOnline(window.navigator.onLine);
    };

    syncOnlineStatus();

    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);

    return () => {
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, []);

  return {
    isOnline,
    setIsOnline,
  };
}