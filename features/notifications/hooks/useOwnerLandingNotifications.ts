"use client";

// Notificare pentru proprietar când sosește un mesaj nou din pagina publică (formularul de comunitate), cât aplicația e deschisă.
import { useEffect, useRef } from "react";
import type { User } from "firebase/auth";

import { canUseNativeNotifications, LocalNotifications, nativeNotificationId } from "@/lib/notifications";
import type { CommunityApplication } from "@/lib/types/domain";

// Parametrii: utilizatorul, dacă e proprietar și cererile primite.
type UseOwnerLandingNotificationsParams = {
  user: User | null;
  isOwner: boolean;
  communityApplications: CommunityApplication[];
};

/**
 * Owner-only: raises a local (native) or web notification when a new landing-page
 * message lands while the app is open. Primes silently on first run so the existing
 * backlog does not fire a notification.
 */
// Hook-ul notificărilor.
export function useOwnerLandingNotifications({
  user,
  isOwner,
  communityApplications,
}: UseOwnerLandingNotificationsParams) {
  // Prima rulare doar memorează mesajele existente, ca să nu se afișeze notificări pentru cele vechi.
  const primedRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());

  // Detectează mesajele „noi” apărute de la ultima verificare și le anunță o singură dată.
  useEffect(() => {
    if (!user || !isOwner) {
      primedRef.current = false;
      seenRef.current = new Set();
      return;
    }

    const unreadMessages = communityApplications.filter((application) => application.status === "new");

    if (!primedRef.current) {
      seenRef.current = new Set(unreadMessages.map((application) => application.id));
      primedRef.current = true;
      return;
    }

    const newMessages = unreadMessages.filter(
      (application) => !seenRef.current.has(application.id)
    );

    unreadMessages.forEach((application) => {
      seenRef.current.add(application.id);
    });

    if (newMessages.length === 0 || typeof window === "undefined") {
      return;
    }

    const firstMessage = newMessages[0];
    const title = newMessages.length === 1 ? "Mesaj nou în Kelunia" : `${newMessages.length} mesaje noi în Kelunia`;
    const body = firstMessage.organizationName || firstMessage.email;

    // Pe dispozitive native se programează o notificare locală; în browser se folosește Notification, dacă e permis.
    if (canUseNativeNotifications()) {
      LocalNotifications.schedule({
        notifications: [
          {
            id: nativeNotificationId(user.uid, `landing:${firstMessage.id}`, { value: 1, unit: "hours" }),
            title,
            body,
            schedule: { at: new Date(Date.now() + 500) },
            smallIcon: "ic_stat_icon_config_sample",
            iconColor: "#0f766e",
          },
        ],
      }).catch((error) => {
        console.warn("Notificarea pentru mesaj nou nu a putut fi programată:", error);
      });
      return;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    new Notification(title, {
      body,
      icon: "/icon-192.png",
    });
  }, [communityApplications, isOwner, user]);
}
