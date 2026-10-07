"use client";

// Notificări locale ale utilizatorului pentru rezervările grupului lui, rezervările la care a cerut notificare personală
// și programele fixe ale grupului: pe dispozitive native se programează la sistem, în browser cu cronometre cât pagina e deschisă.
// Momentele (cu cât timp înainte) vin din profil sau din rezervare; fiecare notificare afișată se reține în localStorage ca să nu se repete.
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

// Parametrii: rezervările, programele fixe, profilul și utilizatorul.
type UseGroupBookingNotificationsParams = {
  bookings: Booking[];
  fixedSchedules: FixedSchedule[];
  profile: UserProfile | null;
  user: User | null;
};

// Forma unei notificări native programate.
type NativeGroupBookingNotification = {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date };
  iconColor: string;
  ongoing: boolean;
  autoCancel: boolean;
  extra: { bookingId: string; url: string };
};

// Adresa deschisă la atingerea notificării (rezervarea în dashboard).
function bookingUrl(bookingId: string) {
  return `/dashboard?booking=${encodeURIComponent(bookingId)}`;
}

// Notificarea din browser deschide rezervarea la clic.
function openBookingFromWebNotification(notification: Notification, bookingId: string) {
  notification.onclick = () => {
    window.focus();
    window.location.assign(bookingUrl(bookingId));
    notification.close();
  };
}

// Textul notificării: grupul, data, ora și camera.
function notificationBody(booking: Booking) {
  return `${booking.group}, ${formatDateLabel(booking.startDate, { year: "numeric" })}, ${booking.startTime}-${booking.endTime}, ${booking.room}`;
}

// Construiește o notificare nativă pentru o rezervare.
function nativeBookingNotification(
  id: number,
  title: string,
  body: string,
  at: Date,
  bookingId: string
): NativeGroupBookingNotification {
  return {
    id,
    title,
    body,
    schedule: { at },
    iconColor: "#1da4fe",
    ongoing: true,
    autoCancel: false,
    extra: { bookingId, url: bookingUrl(bookingId) },
  };
}

// Transformă un Timestamp Firestore sau un Date în Date.
function timestampToDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }

  return null;
}

// Hook-ul notificărilor de rezervări.
export function useGroupBookingNotifications({
  bookings,
  fixedSchedules,
  profile,
  user,
}: UseGroupBookingNotificationsParams) {
  // Se reface la orice schimbare a rezervărilor, programelor fixe, profilului sau utilizatorului.
  useEffect(() => {
    if (!user || !profile || typeof window === "undefined") {
      return;
    }

    // Momentele de notificare ale utilizatorului (formatul curent sau cel vechi, cu zile).
    const offsets = normalizeNotificationOffsetRules(profile.notifyOffsets).length > 0
      ? normalizeNotificationOffsetRules(profile.notifyOffsets)
      : normalizeNotificationOffsets(profile.notifyOffsetsDays).map((value) => ({ value, unit: "days" as const }));
    const legacyOffsets = offsets.length > 0
      ? offsets
      : [
        ...(profile.notifyWeekBefore ? [{ value: 7, unit: "days" as const }] : []),
        ...(profile.notifyDayBefore ? [{ value: 1, unit: "days" as const }] : []),
      ];

    // Rezervările grupului propriu și cele la care utilizatorul este destinatar (grup întreg sau persoane alese).
    const groupBookings = profile.notifyGroupBookings && profile.groupName.trim()
      ? bookings.filter((booking) => isGroupBooking(booking, profile.groupName))
      : [];
    const isTargetedGroupBooking = (booking: Booking) => {
      if (!profile.groupName.trim() || !isGroupBooking(booking, profile.groupName)) {
        return false;
      }

      if (booking.notifyGroupAudience !== "selected") {
        return true;
      }

      return booking.notifyGroupRecipients?.some((email) => email.trim().toLowerCase() === user.email?.trim().toLowerCase());
    };
    // Reamintirile de grup: din setările utilizatorului și din cele alese pe rezervare, fără dubluri.
    const groupBookingReminders = Array.from(
      [
        ...groupBookings.flatMap((booking) => legacyOffsets.map((offset) => ({ booking, offset }))),
        ...bookings
          .filter((booking) => booking.notifyGroupOnThisBooking && isTargetedGroupBooking(booking))
          .flatMap((booking) => normalizeNotificationOffsetRules(booking.notifyGroupOffsets).map((offset) => ({ booking, offset }))),
      ]
        .reduce((unique, reminder) => {
          unique.set(`${reminder.booking.id}:${notificationOffsetToKey(reminder.offset)}`, reminder);
          return unique;
        }, new Map<string, { booking: Booking; offset: { value: number; unit: "minutes" | "hours" | "days" } }>())
        .values()
    );
    // Notificările personale cerute pe rezervări de utilizator.
    const personalBookingNotifications = bookings.flatMap((booking) => {
      if (!booking.notifyOnThisBooking || booking.notifyForUid !== user.uid) {
        return [];
      }

      const bookingOffsets = normalizeNotificationOffsetRules(booking.notifyOffsets);
      return bookingOffsets.map((offset) => ({ booking, offset }));
    });
    // Programele fixe ale grupului: următoarele (maximum 5) apariții din următoarele 35 de zile.
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
    // Reamintirile trimise „acum” de un manager, care trebuie afișate o singură dată.
    const instantGroupReminders = bookings
      .filter((booking) => booking.notifyGroupNowAt && isTargetedGroupBooking(booking))
      .map((booking) => {
        const sentAt = timestampToDate(booking.notifyGroupNowAt);
        return sentAt ? { booking, sentAt } : null;
      })
      .filter((item): item is { booking: Booking; sentAt: Date } => item !== null);

    // Dispozitiv nativ: programează notificările la sistem, doar pe cele din viitor.
    if (canUseNativeNotifications()) {
      void (async () => {
        const groupNotifications = groupBookingReminders.flatMap(({ booking, offset }) => {
            const notifyAt = new Date(bookingStartDateTime(booking).getTime() - notificationOffsetToMs(offset));

            if (notifyAt.getTime() <= Date.now()) {
              return [];
            }

            return [
              {
                id: nativeNotificationId(user.uid, booking.id, offset),
                title: notificationTitle(offset),
                body: notificationBody(booking),
                schedule: { at: notifyAt },
                iconColor: "#1da4fe",
                ongoing: true,
                autoCancel: false,
                extra: { bookingId: booking.id, url: bookingUrl(booking.id) },
              },
            ];
        });
        // Notificările personale, ale programelor fixe și cele trimise acum; cele „acum” se afișează o singură dată (reținut în localStorage).
        const personalNotifications = personalBookingNotifications.flatMap(({ booking, offset }) => {
          const notifyAt = new Date(bookingStartDateTime(booking).getTime() - notificationOffsetToMs(offset));

          if (notifyAt.getTime() <= Date.now()) {
            return [];
          }

          return [
            nativeBookingNotification(
              nativeNotificationId(user.uid, booking.id, offset),
              notificationTitle(offset),
              notificationBody(booking),
              notifyAt,
              booking.id
            ),
          ];
        });
        const fixedNotifications = recurringNotifications.flatMap(({ schedule, date, offset }) => {
          const occurrenceDateKey = dateKey(date);
          const notifyAt = new Date(`${occurrenceDateKey}T${schedule.startTime}:00`);
          notifyAt.setTime(notifyAt.getTime() - notificationOffsetToMs(offset));

          if (notifyAt.getTime() <= Date.now()) {
            return [];
          }

          return [
            nativeBookingNotification(
              nativeNotificationId(user.uid, `fixed:${schedule.id}:${occurrenceDateKey}`, offset),
              notificationTitle(offset),
              `${schedule.group}, ${formatDateLabel(occurrenceDateKey, { year: "numeric" })}, ${schedule.startTime}-${schedule.endTime}, ${schedule.room}`,
              notifyAt,
              `fixed:${schedule.id}`
            ),
          ];
        });
        const notifications: NativeGroupBookingNotification[] = [...groupNotifications, ...personalNotifications, ...fixedNotifications];
        const instantNotifications = instantGroupReminders.flatMap(({ booking, sentAt }) => {
          const storageKey = `kelunia-group-now:${user.uid}:${booking.id}:${sentAt.getTime()}`;

          if (window.localStorage.getItem(storageKey)) {
            return [];
          }

          window.localStorage.setItem(storageKey, "1");

          return [
            nativeBookingNotification(
              nativeNotificationId(user.uid, `group-now:${booking.id}:${sentAt.getTime()}`, { value: 1, unit: "hours" }),
              "Reminder grup",
              notificationBody(booking),
              new Date(Date.now() + 1000),
              booking.id
            ),
          ];
        });
        notifications.push(...instantNotifications);

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

    // Browser: fără permisiune nu se afișează nimic; reamintirile „acum” apar imediat, o singură dată.
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    instantGroupReminders.forEach(({ booking, sentAt }) => {
      const storageKey = `kelunia-group-now:${user.uid}:${booking.id}:${sentAt.getTime()}`;

      if (window.localStorage.getItem(storageKey)) {
        return;
      }

      window.localStorage.setItem(storageKey, "1");
      const notification = new Notification("Reminder grup", {
        body: notificationBody(booking),
        icon: "/icon-192.png",
        tag: storageKey,
        requireInteraction: true,
      });
      openBookingFromWebNotification(notification, booking.id);
    });

    // Browser: cronometre pentru reamintirile viitoare, doar dacă nu au fost afișate și intră în limita unui setTimeout.
    const groupTimers = groupBookingReminders
      .map(({ booking, offset }) => {
          const notifyAt = new Date(bookingStartDateTime(booking).getTime() - notificationOffsetToMs(offset));
          const delay = notifyAt.getTime() - Date.now();
          const storageKey = notificationStorageKey(user.uid, booking.id, offset);

          if (delay <= 0 || delay > maxNotificationDelayMs || window.localStorage.getItem(storageKey)) {
            return null;
          }

          return window.setTimeout(async () => {
            const body = notificationBody(booking);
            window.localStorage.setItem(storageKey, "1");

            try {
              if ("serviceWorker" in navigator) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(notificationTitle(offset), {
                  body,
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  tag: storageKey,
                  requireInteraction: true,
                  data: { url: bookingUrl(booking.id) },
                });
                return;
              }

              const notification = new Notification(notificationTitle(offset), {
                body,
                icon: "/icon-192.png",
                tag: notificationOffsetToKey(offset),
                requireInteraction: true,
              });
              openBookingFromWebNotification(notification, booking.id);
            } catch (error) {
              console.warn("Notificarea nu a putut fi afisata:", error);
            }
          }, delay);
      });
    // Cronometre pentru notificările personale și pentru programele fixe.
    const personalTimers = personalBookingNotifications.map(({ booking, offset }) => {
      const notifyAt = new Date(bookingStartDateTime(booking).getTime() - notificationOffsetToMs(offset));
      const delay = notifyAt.getTime() - Date.now();
      const storageKey = notificationStorageKey(user.uid, booking.id, offset);

      if (delay <= 0 || delay > maxNotificationDelayMs || window.localStorage.getItem(storageKey)) {
        return null;
      }

      return window.setTimeout(() => {
        const body = notificationBody(booking);
        window.localStorage.setItem(storageKey, "1");
        const notification = new Notification(notificationTitle(offset), { body, icon: "/icon-192.png", tag: notificationOffsetToKey(offset), requireInteraction: true });
        openBookingFromWebNotification(notification, booking.id);
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
        new Notification(notificationTitle(offset), { body, icon: "/icon-192.png", tag: notificationOffsetToKey(offset), requireInteraction: true });
      }, delay);
    });
    // La reîncărcarea efectului sau la ieșire cronometrele se opresc.
    const timers = [...groupTimers, ...personalTimers, ...recurringTimers].filter((timer): timer is number => timer !== null);

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [bookings, fixedSchedules, profile, user]);
}
