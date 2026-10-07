// Notificări locale: reguli pentru momentele de reamintire (minute, ore, zile înainte), permisiuni și notificări native Capacitor.
// Un moment de notificare se păstrează ca text scurt: „15m”, „2h”, „7d”.
import { Capacitor, registerPlugin } from "@capacitor/core";

// Tipurile pluginului nativ LocalNotifications (programare și acțiunea de atingere a notificării).
type LocalNotificationSchedule = {
  notifications: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
    smallIcon?: string;
    iconColor?: string;
    channelId?: string;
    ongoing?: boolean;
    autoCancel?: boolean;
    extra?: Record<string, unknown>;
  }>;
};

type LocalNotificationsPlugin = {
  addListener: (
    eventName: "localNotificationActionPerformed",
    listener: (event: { notification?: { extra?: Record<string, unknown> } }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
  checkPermissions: () => Promise<{ display?: string }>;
  requestPermissions: () => Promise<{ display?: string }>;
  schedule: (options: LocalNotificationSchedule) => Promise<unknown>;
};

// Pluginul nativ; pe web nu face nimic.
export const LocalNotifications = registerPlugin<LocalNotificationsPlugin>("LocalNotifications");

// Un moment de notificare: valoare + unitate.
export type NotificationOffsetUnit = "minutes" | "hours" | "days";

export type NotificationOffsetRule = {
  value: number;
  unit: NotificationOffsetUnit;
};

// Transformă un moment în cheia text („15m”, „2h”, „7d”).
export function notificationOffsetToKey(offset: NotificationOffsetRule) {
  if (offset.unit === "minutes") {
    return `${offset.value}m`;
  }

  return `${offset.value}${offset.unit === "hours" ? "h" : "d"}`;
}

// Cheia din localStorage care reține că o notificare a fost deja afișată (evită repetările).
export function notificationStorageKey(uid: string, bookingId: string, offset: NotificationOffsetRule) {
  return `kelunia-notified:${uid}:${bookingId}:${notificationOffsetToKey(offset)}`;
}

// Formatul vechi: zile întregi între 1 și 30, fără dubluri, maximum 5, în ordine crescătoare.
export function normalizeNotificationOffsets(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 30))]
    .sort((first, second) => first - second)
    .slice(0, 5);
}

// Formatul curent: acceptă numere (zile) și texte „15m/2h/7d”, cu limite (120 minute, 48 ore, 30 zile); maximum 5, de la cel mai apropiat.
export function normalizeNotificationOffsetRules(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const offsets = value.flatMap((item): NotificationOffsetRule[] => {
    if (typeof item === "number" && Number.isInteger(item) && item >= 1 && item <= 30) {
      return [{ value: item, unit: "days" }];
    }

    if (typeof item !== "string") {
      return [];
    }

    const match = item.trim().match(/^(\d+)(m|h|d)$/);

    if (!match) {
      return [];
    }

    const amount = Number(match[1]);
    const unit = match[2] === "m" ? "minutes" : match[2] === "h" ? "hours" : "days";

    if (unit === "minutes" && amount >= 1 && amount <= 120) {
      return [{ value: amount, unit }];
    }

    if (unit === "hours" && amount >= 1 && amount <= 48) {
      return [{ value: amount, unit }];
    }

    if (unit === "days" && amount >= 1 && amount <= 30) {
      return [{ value: amount, unit }];
    }

    return [];
  });

  const unique = new Map<string, NotificationOffsetRule>();
  offsets.forEach((offset) => unique.set(notificationOffsetToKey(offset), offset));

  return [...unique.values()]
    .sort((first, second) => notificationOffsetToMs(first) - notificationOffsetToMs(second))
    .slice(0, 5);
}

// Momentul de notificare în milisecunde, pentru sortare și programare.
export function notificationOffsetToMs(offset: NotificationOffsetRule) {
  if (offset.unit === "minutes") {
    return offset.value * 60 * 1000;
  }

  const hours = offset.unit === "hours" ? offset.value : offset.value * 24;
  return hours * 60 * 60 * 1000;
}

// Titlul notificării, în funcție de cât timp mai este până la programare.
export function notificationTitle(offset: NotificationOffsetRule) {
  if (offset.unit === "minutes") {
    if (offset.value === 1) {
      return "Programare peste un minut";
    }

    return `Programare peste ${offset.value} minute`;
  }

  if (offset.unit === "hours") {
    if (offset.value === 1) {
      return "Programare peste o ora";
    }

    return `Programare peste ${offset.value} ore`;
  }

  if (offset.value === 1) {
    return "Programare maine";
  }

  if (offset.value === 7) {
    return "Programare peste o saptamana";
  }

  return `Programare peste ${offset.value} zile`;
}

// Id numeric stabil pentru notificarea nativă, derivat din utilizator, rezervare și moment (același id înlocuiește notificarea veche).
export function nativeNotificationId(uid: string, bookingId: string, offset: NotificationOffsetRule) {
  const input = `${uid}:${bookingId}:${notificationOffsetToKey(offset)}`;
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) || 1;
}

// Notificările native există doar în aplicația Capacitor.
export function canUseNativeNotifications() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

// Cere permisiunea de notificare: întâi cea nativă, apoi cea a browserului; returnează true dacă a fost acordată.
export async function requestKeluniaNotificationPermission() {
  if (canUseNativeNotifications()) {
    try {
      const current = await LocalNotifications.checkPermissions();

      if (current.display === "granted") {
        return true;
      }

      const requested = await LocalNotifications.requestPermissions();
      return requested.display === "granted";
    } catch (error) {
      console.warn("Permisiunea pentru notificari native nu a putut fi ceruta:", error);
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  return permission === "granted";
}

// Starea permisiunii: acordată, refuzată, neîntrebată sau neacceptată pe acest dispozitiv.
export type KeluniaNotificationPermission = "granted" | "denied" | "default" | "unsupported";

export async function getKeluniaNotificationPermission(): Promise<KeluniaNotificationPermission> {
  if (canUseNativeNotifications()) {
    try {
      const current = await LocalNotifications.checkPermissions();
      return current.display === "granted" ? "granted" : current.display === "denied" ? "denied" : "default";
    } catch {
      return "unsupported";
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}
