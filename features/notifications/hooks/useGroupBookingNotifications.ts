"use client";

import { useEffect } from "react";
import type { User } from "firebase/auth";

import type { UserProfile } from "@/context/AuthContext";
import { maxNotificationDelayMs } from "@/lib/config/app";
import { dateKey, formatDateLabel } from "@/lib/dates";
import {
  canUseNativeNotifications,
  LocalNotifications,
  nativeNotificationId,
  normalizeNotificationOffsetRules,
  normalizeNotificationOffsets,
  notificationOffsetToMs,
  notificationOffsetToKey,
  notificationStorageKey,
  notificationTitle,
} from "@/lib/notifications";
import {
  bookingStartDateTime,
  isGroupBooking,
} from "@/lib/scheduling";
import type { Booking, FixedSchedule } from "@/lib/types/domain";

type UseGroupBookingNotificationsParams = {
  bookings: Booking[];
  fixedSchedules: FixedSchedule[];
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
  fixedSchedules,
  profile,
  user,
}: UseGroupBookingNotificationsParams) {
  useEffect(() => {
    if (!user || !profile || typeof window === "undefined") {
      return;
    }

    const offsets = normalizeNotificationOffsetRules(profile.notifyOffsets).length > 0
      ? normalizeNotificationOffsetRules(profile.notifyOffsets)
      : normalizeNotificationOffsets(profile.notifyOffsetsDays).map((value) => ({ value, unit: "days" as const }));
    const legacyOffsets = offsets.length > 0
      ? offsets
      : [
        ...(profile.notifyWeekBefore ? [{ value: 7, unit: "days" as const }] : []),
        ...(profile.notifyDayBefore ? [{ value: 1, unit: "days" as const }] : []),
      ];

    const groupBookings = profile.notifyGroupBookings && profile.groupName.trim()
      ? bookings.filter((booking) => isGroupBooking(booking, profile.groupName))
      : [];
    const personalBookingNotifications = bookings.flatMap((booking) => {
      if (!booking.notifyOnThisBooking || booking.notifyForUid !== user.uid) {
        return [];
      }

      const bookingOffsets = normalizeNotificationOffsetRules(booking.notifyOffsets);
      return bookingOffsets.map((offset) => ({ booking, offset }));
    });
    const recurringNotifications = profile.notifyGroupBookings && profile.notifyFixedGroupSchedules && profile.groupName.trim()
      ? fixedSchedules
        .filter((schedule) => schedule.group.trim().toLowerCase() === profile.groupName.trim().toLowerCase())
        .flatMap((schedule) => {
          const today = new Date();
          return Array.from({ length: 35 }, (_, dayOffset) => {
            const date = new Date(today);
            date.setDate(today.getDate() + dayOffset);
            return date;
          })
            .filter((date) => ((date.getDay() + 6) % 7) === schedule.dayIndex)
            .slice(0, 5)
            .flatMap((date) => legacyOffsets.map((offset) => ({ schedule, date, offset })));
        })
      : [];

    if (canUseNativeNotifications()) {
      void (async () => {
        const groupNotifications = groupBookings.flatMap((booking) =>
          legacyOffsets.flatMap((offset) => {
            const notifyAt = new Date(bookingStartDateTime(booking).getTime() - notificationOffsetToMs(offset));

            if (notifyAt.getTime() <= Date.now()) {
              return [];
            }

            return [
              {
                id: nativeNotificationId(user.uid, booking.id, offset),
                title: notificationTitle(offset),
                body: `${booking.group}, ${formatDateLabel(booking.startDate, { year: "numeric" })}, ${booking.startTime}-${booking.endTime}, ${booking.room}`,
                schedule: { at: notifyAt },
                iconColor: "#1da4fe",
                extra: { bookingId: booking.id, url: "/dashboard" },
              },
            ];
          })
        );
        const personalNotifications = personalBookingNotifications.flatMap(({ booking, offset }) => {
          const notifyAt = new Date(bookingStartDateTime(booking).getTime() - notificationOffsetToMs(offset));

          if (notifyAt.getTime() <= Date.now()) {
            return [];
          }

          return [{
            id: nativeNotificationId(user.uid, booking.id, offset),
            title: notificationTitle(offset),
            body: `${booking.group}, ${formatDateLabel(booking.startDate, { year: "numeric" })}, ${booking.startTime}-${booking.endTime}, ${booking.room}`,
            schedule: { at: notifyAt },
            iconColor: "#1da4fe",
            extra: { bookingId: booking.id, url: "/dashboard" },
          }];
        });
        const fixedNotifications = recurringNotifications.flatMap(({ schedule, date, offset }) => {
          const occurrenceDateKey = dateKey(date);
          const notifyAt = new Date(`${occurrenceDateKey}T${schedule.startTime}:00`);
          notifyAt.setTime(notifyAt.getTime() - notificationOffsetToMs(offset));

          if (notifyAt.getTime() <= Date.now()) {
            return [];
          }

          return [{
            id: nativeNotificationId(user.uid, `fixed:${schedule.id}:${occurrenceDateKey}`, offset),
            title: notificationTitle(offset),
            body: `${schedule.group}, ${formatDateLabel(occurrenceDateKey, { year: "numeric" })}, ${schedule.startTime}-${schedule.endTime}, ${schedule.room}`,
            schedule: { at: notifyAt },
            iconColor: "#1da4fe",
            extra: { bookingId: `fixed:${schedule.id}`, url: "/dashboard" },
          }];
        });
        const notifications: NativeGroupBookingNotification[] = [...groupNotifications, ...personalNotifications, ...fixedNotifications];

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

    const groupTimers = bookings
      .filter((booking) => profile.notifyGroupBookings && profile.groupName.trim() && isGroupBooking(booking, profile.groupName))
      .flatMap((booking) =>
        legacyOffsets.map((offset) => {
          const notifyAt = new Date(bookingStartDateTime(booking).getTime() - notificationOffsetToMs(offset));
          const delay = notifyAt.getTime() - Date.now();
          const storageKey = notificationStorageKey(user.uid, booking.id, offset);

          if (delay <= 0 || delay > maxNotificationDelayMs || window.localStorage.getItem(storageKey)) {
            return null;
          }

          return window.setTimeout(async () => {
            const body = `${booking.group}, ${formatDateLabel(booking.startDate, { year: "numeric" })}, ${booking.startTime}-${booking.endTime}, ${booking.room}`;
            window.localStorage.setItem(storageKey, "1");

            try {
              if ("serviceWorker" in navigator) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(notificationTitle(offset), {
                  body,
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  tag: storageKey,
                  data: { url: "/" },
                });
                return;
              }

              new Notification(notificationTitle(offset), {
                body,
                icon: "/icon-192.png",
                tag: notificationOffsetToKey(offset),
              });
            } catch (error) {
              console.warn("Notificarea nu a putut fi afisata:", error);
            }
          }, delay);
        })
      );
    const personalTimers = personalBookingNotifications.map(({ booking, offset }) => {
      const notifyAt = new Date(bookingStartDateTime(booking).getTime() - notificationOffsetToMs(offset));
      const delay = notifyAt.getTime() - Date.now();
      const storageKey = notificationStorageKey(user.uid, booking.id, offset);

      if (delay <= 0 || delay > maxNotificationDelayMs || window.localStorage.getItem(storageKey)) {
        return null;
      }

      return window.setTimeout(() => {
        const body = `${booking.group}, ${formatDateLabel(booking.startDate, { year: "numeric" })}, ${booking.startTime}-${booking.endTime}, ${booking.room}`;
        window.localStorage.setItem(storageKey, "1");
        new Notification(notificationTitle(offset), { body, icon: "/icon-192.png", tag: notificationOffsetToKey(offset) });
      }, delay);
    });
    const recurringTimers = recurringNotifications.map(({ schedule, date, offset }) => {
      const occurrenceDateKey = dateKey(date);
      const notifyAt = new Date(`${occurrenceDateKey}T${schedule.startTime}:00`);
      notifyAt.setTime(notifyAt.getTime() - notificationOffsetToMs(offset));
      const delay = notifyAt.getTime() - Date.now();
      const storageKey = notificationStorageKey(user.uid, `fixed:${schedule.id}:${occurrenceDateKey}`, offset);

      if (delay <= 0 || delay > maxNotificationDelayMs || window.localStorage.getItem(storageKey)) {
        return null;
      }

      return window.setTimeout(() => {
        const body = `${schedule.group}, ${formatDateLabel(occurrenceDateKey, { year: "numeric" })}, ${schedule.startTime}-${schedule.endTime}, ${schedule.room}`;
        window.localStorage.setItem(storageKey, "1");
        new Notification(notificationTitle(offset), { body, icon: "/icon-192.png", tag: notificationOffsetToKey(offset) });
      }, delay);
    });
    const timers = [...groupTimers, ...personalTimers, ...recurringTimers].filter((timer): timer is number => timer !== null);

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [bookings, fixedSchedules, profile, user]);
}
