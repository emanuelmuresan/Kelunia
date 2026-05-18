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

export function notificationStorageKey(uid: string, bookingId: string, offsetDays: number) {
  return `kelunia-notified:${uid}:${bookingId}:${offsetDays}`;
}

export function notificationTitle(offsetDays: number) {
  return offsetDays === 7 ? "Programare peste o saptamana" : "Programare maine";
}

export function nativeNotificationId(uid: string, bookingId: string, offsetDays: number) {
  const input = `${uid}:${bookingId}:${offsetDays}`;
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
