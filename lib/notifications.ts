import { Capacitor, registerPlugin } from "@capacitor/core";

type LocalNotificationSchedule = {
  notifications: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
    smallIcon?: string;
    iconColor?: string;
    channelId?: string;
    extra?: Record<string, unknown>;
  }>;
};

type LocalNotificationsPlugin = {
  checkPermissions: () => Promise<{ display?: string }>;
  requestPermissions: () => Promise<{ display?: string }>;
  schedule: (options: LocalNotificationSchedule) => Promise<unknown>;
};

export const LocalNotifications = registerPlugin<LocalNotificationsPlugin>("LocalNotifications");

export type NotificationOffsetUnit = "hours" | "days";

export type NotificationOffsetRule = {
  value: number;
  unit: NotificationOffsetUnit;
};

export function notificationOffsetToKey(offset: NotificationOffsetRule) {
  return `${offset.value}${offset.unit === "hours" ? "h" : "d"}`;
}

export function notificationStorageKey(uid: string, bookingId: string, offset: NotificationOffsetRule) {
  return `kelunia-notified:${uid}:${bookingId}:${notificationOffsetToKey(offset)}`;
}

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

    const match = item.trim().match(/^(\d+)(h|d)$/);

    if (!match) {
      return [];
    }

    const amount = Number(match[1]);
    const unit = match[2] === "h" ? "hours" : "days";

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

export function notificationOffsetToMs(offset: NotificationOffsetRule) {
  const hours = offset.unit === "hours" ? offset.value : offset.value * 24;
  return hours * 60 * 60 * 1000;
}

export function notificationTitle(offset: NotificationOffsetRule) {
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

export function nativeNotificationId(uid: string, bookingId: string, offset: NotificationOffsetRule) {
  const input = `${uid}:${bookingId}:${notificationOffsetToKey(offset)}`;
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) || 1;
}

export function canUseNativeNotifications() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

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
