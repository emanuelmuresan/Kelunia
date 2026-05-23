"use client";

import { useEffect } from "react";
import type { User } from "firebase/auth";

import type { UserProfile } from "@/context/AuthContext";
import { maxNotificationDelayMs } from "@/lib/config/app";
import { formatDateLabel } from "@/lib/dates";
import {
  canUseNativeNotifications,
  LocalNotifications,
  nativeNotificationId,
  normalizeNotificationOffsets,
  notificationStorageKey,
  notificationTitle,
} from "@/lib/notifications";
import {
  bookingStartDateTime,
  isGroupBooking,
} from "@/lib/scheduling";
import type { Booking } from "@/lib/types/domain";

type UseGroupBookingNotificationsParams = {
  bookings: Booking[];
  profile: UserProfile | null;
  user: User | null;
};

type NativeGroupBookingNotification = {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date };
  iconColor: string;
  extra: { bookingId: string; url: string };
};

export function useGroupBookingNotifications({
  bookings,
  profile,
  user,
}: UseGroupBookingNotificationsParams) {
  useEffect(() => {
    if (!user || !profile?.notifyGroupBookings || !profile.groupName.trim() || typeof window === "undefined") {
      return;
    }

    const offsets = normalizeNotificationOffsets(profile.notifyOffsetsDays).length > 0
      ? normalizeNotificationOffsets(profile.notifyOffsetsDays)
      : [
        ...(profile.notifyWeekBefore ? [7] : []),
        ...(profile.notifyDayBefore ? [1] : []),
      ];

    if (offsets.length === 0) {
      return;
    }

    const groupBookings = bookings.filter((booking) => isGroupBooking(booking, profile.groupName));

    if (canUseNativeNotifications()) {
      void (async () => {
        const notifications: NativeGroupBookingNotification[] = groupBookings.flatMap((booking) =>
          offsets.flatMap((offsetDays) => {
            const notifyAt = new Date(bookingStartDateTime(booking).getTime() - offsetDays * 24 * 60 * 60 * 1000);

            if (notifyAt.getTime() <= Date.now()) {
              return [];
            }

            return [
              {
                id: nativeNotificationId(user.uid, booking.id, offsetDays),
                title: notificationTitle(offsetDays),
                body: `${booking.group}, ${formatDateLabel(booking.startDate, { year: "numeric" })}, ${booking.startTime}-${booking.endTime}, ${booking.room}`,
                schedule: { at: notifyAt },
                iconColor: "#1da4fe",
                extra: { bookingId: booking.id, url: "/dashboard" },
              },
            ];
          })
        );

        if (notifications.length === 0) {
          return;
        }

        try {
          await LocalNotifications.schedule({ notifications });
        } catch (error) {
          console.warn("Notificarile native nu au putut fi programate:", error);
        }
      })();
      return;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const timers = bookings
      .filter((booking) => isGroupBooking(booking, profile.groupName))
      .flatMap((booking) =>
        offsets.map((offsetDays) => {
          const notifyAt = new Date(bookingStartDateTime(booking).getTime() - offsetDays * 24 * 60 * 60 * 1000);
          const delay = notifyAt.getTime() - Date.now();
          const storageKey = notificationStorageKey(user.uid, booking.id, offsetDays);

          if (delay <= 0 || delay > maxNotificationDelayMs || window.localStorage.getItem(storageKey)) {
            return null;
          }

          return window.setTimeout(async () => {
            const body = `${booking.group}, ${formatDateLabel(booking.startDate, { year: "numeric" })}, ${booking.startTime}-${booking.endTime}, ${booking.room}`;
            window.localStorage.setItem(storageKey, "1");

            try {
              if ("serviceWorker" in navigator) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(notificationTitle(offsetDays), {
                  body,
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  tag: storageKey,
                  data: { url: "/" },
                });
                return;
              }

              new Notification(notificationTitle(offsetDays), {
                body,
                icon: "/icon-192.png",
                tag: storageKey,
              });
            } catch (error) {
              console.warn("Notificarea nu a putut fi afisata:", error);
            }
          }, delay);
        })
      )
      .filter((timer): timer is number => timer !== null);

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [bookings, profile, user]);
}
