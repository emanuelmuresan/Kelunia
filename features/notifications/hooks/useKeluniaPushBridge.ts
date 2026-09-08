"use client";

import { useEffect } from "react";
import type { User } from "firebase/auth";

import type { UserProfile } from "@/context/AuthContext";
import { listenKeluniaForegroundPush, registerKeluniaPushToken } from "@/lib/push-notifications";

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
export function useKeluniaPushBridge({ user, profile }: UseKeluniaPushBridgeParams) {
  useEffect(() => {
    if (!user || !profile || typeof window === "undefined") {
      return;
    }

    void registerKeluniaPushToken(user, profile);
  }, [profile, user]);

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
