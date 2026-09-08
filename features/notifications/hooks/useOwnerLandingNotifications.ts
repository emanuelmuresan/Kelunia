"use client";

import { useEffect, useRef } from "react";
import type { User } from "firebase/auth";

import { canUseNativeNotifications, LocalNotifications } from "@/lib/notifications";
import type { CommunityApplication } from "@/lib/types/domain";

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
export function useOwnerLandingNotifications({
  user,
  isOwner,
  communityApplications,
}: UseOwnerLandingNotificationsParams) {
  const primedRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());

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

    if (canUseNativeNotifications()) {
      LocalNotifications.schedule({
        notifications: [
          {
            id: Math.max(1, Date.now() % 2147483647),
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
