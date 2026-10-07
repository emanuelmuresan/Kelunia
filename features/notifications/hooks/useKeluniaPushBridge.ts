"use client";

// Leagă notificările push de aplicație: înregistrează jetonul dispozitivului după autentificare și, cât aplicația e deschisă,
// afișează mesajele FCM primite ca notificare a service worker-ului (atingerea ei deschide rezervarea).
import { useEffect } from "react";
import type { User } from "firebase/auth";

import type { UserProfile } from "@/context/AuthContext";
import { listenKeluniaForegroundPush, registerKeluniaPushToken } from "@/lib/push-notifications";

// Parametrii: utilizatorul și profilul; forma mesajului primit în prim-plan.
type UseKeluniaPushBridgeParams = {
  user: User | null;
  profile: UserProfile | null;
};

type ForegroundPushPayload = {
  data?: Record<string, string>;
  notification?: { body?: string; title?: string };
};

/**
 * Registers this device's push token and, while the app is foregrounded, mirrors
 * incoming FCM messages into a service-worker notification (so a tap still deep-links).
 */
// Hook-ul punții push.
export function useKeluniaPushBridge({ user, profile }: UseKeluniaPushBridgeParams) {
  // După autentificare se înregistrează jetonul push al acestui dispozitiv.
  useEffect(() => {
    if (!user || !profile || typeof window === "undefined") {
      return;
    }

    void registerKeluniaPushToken(user, profile);
  }, [profile, user]);

  // Ascultă mesajele primite cât aplicația e în prim-plan și le arată dacă permisiunea de notificare e acordată.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void listenKeluniaForegroundPush(async (payload: ForegroundPushPayload) => {
      const data = payload.data ?? {};
      const title = data.title || payload.notification?.title || "Kelunia";
      const body = data.body || payload.notification?.body || "";

      if (!("serviceWorker" in navigator) || !("Notification" in window) || Notification.permission !== "granted") {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        badge: "/icon-192.png",
        data: {
          bookingId: data.bookingId || "",
          url: data.url || "/dashboard",
        },
        icon: "/icon-192.png",
        requireInteraction: true,
        tag: data.tag || data.bookingId || "kelunia-notification",
      });
    }).then((nextUnsubscribe: () => void) => {
      if (cancelled) {
        nextUnsubscribe();
        return;
      }

      unsubscribe = nextUnsubscribe;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
}
