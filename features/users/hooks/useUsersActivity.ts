"use client";

// Activitatea conturilor unei locații (din Firebase Auth, prin funcția cloud getLocationUsersActivity): email validat, data creării
// contului și ultima conectare. Se încarcă la deschiderea ferestrei „Utilizatori”; dacă funcția nu răspunde, rândurile rămân fără acest detaliu.
import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";

import { cloudFunctions } from "@/lib/firebase";

// Starea unui cont: emailul validat, momentul creării și ultima conectare (milisecunde, sau null dacă nu se știe).
export type UserActivity = {
  emailVerified: boolean;
  createdAt: number | null;
  lastSeenAt: number | null;
};

// Hook-ul: întoarce activitatea pe id de utilizator pentru locația dată, doar cât timp este activat.
export function useUsersActivity(locationId: string, enabled: boolean) {
  const [activity, setActivity] = useState<Record<string, UserActivity>>({});

  useEffect(() => {
    if (!enabled || !locationId) {
      return;
    }

    let cancelled = false;

    httpsCallable<{ locationId: string }, { users: Record<string, UserActivity> }>(
      cloudFunctions,
      "getLocationUsersActivity"
    )({ locationId })
      .then((result) => {
        if (!cancelled) {
          setActivity(result.data.users ?? {});
        }
      })
      .catch((error) => {
        console.warn("Activitatea utilizatorilor nu a putut fi citită:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, locationId]);

  return activity;
}
