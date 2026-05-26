import { httpsCallable } from "firebase/functions";
import { Capacitor } from "@capacitor/core";
import { cloudFunctions, firebaseApp } from "@/lib/firebase";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";
const nativeListenerState = {
  ready: false,
  registering: false,
};

export function hasKeluniaPushConfig() {
  return true;
}

function nativePlatform() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return "";
  }

  return Capacitor.getPlatform();
}

function notificationUrlFromPayload(notification) {
  const data = notification?.notification?.data || notification?.data || {};
  const bookingId = data.bookingId || notification?.notification?.id || "";

  if (data.url) {
    return data.url;
  }

  if (bookingId && !String(bookingId).startsWith("fixed:")) {
    return `/dashboard?booking=${encodeURIComponent(bookingId)}`;
  }

  return notification?.notification?.link || "/dashboard";
}

async function saveNotificationToken(user, profile, token, platform, tokenType) {
  const registerToken = httpsCallable(cloudFunctions, "registerNotificationToken");

  await registerToken({
    token,
    tokenType,
    locationId: profile.locationId,
    locationName: profile.locationName,
    groupName: profile.groupName,
    displayName: profile.displayName,
    email: profile.email || user.email || "",
    platform,
  });
}

async function registerNativePushToken(user, profile) {
  const platform = nativePlatform();

  if (!platform || !user || !profile) {
    return false;
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    if (!nativeListenerState.ready) {
      await PushNotifications.addListener("registration", (token) => {
        window.dispatchEvent(new CustomEvent("kelunia-native-push-token", { detail: token.value }));
      });
      await PushNotifications.addListener("registrationError", (error) => {
        console.warn("Inregistrarea push nativa a esuat:", error.error || error);
      });
      await PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
        const targetUrl = notificationUrlFromPayload(notification);
        window.location.assign(targetUrl);
      });
      nativeListenerState.ready = true;
    }

    let permission = await PushNotifications.checkPermissions();

    if (permission.receive === "prompt") {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== "granted" || nativeListenerState.registering) {
      return permission.receive === "granted";
    }

    nativeListenerState.registering = true;

    const tokenPromise = new Promise((resolve) => {
      const handleToken = (event) => {
        window.removeEventListener("kelunia-native-push-token", handleToken);
        resolve(event.detail);
      };

      window.addEventListener("kelunia-native-push-token", handleToken, { once: true });
      window.setTimeout(() => {
        window.removeEventListener("kelunia-native-push-token", handleToken);
        resolve("");
      }, 8000);
    });

    await PushNotifications.register();
    const token = await tokenPromise;
    nativeListenerState.registering = false;

    if (!token) {
      return false;
    }

    await saveNotificationToken(user, profile, token, `native-${platform}`, platform === "ios" ? "apns" : "fcm");
    return true;
  } catch (error) {
    nativeListenerState.registering = false;
    console.warn("Tokenul pentru push nativ nu a putut fi inregistrat:", error);
    return false;
  }
}

export async function registerKeluniaPushToken(user, profile) {
  if (nativePlatform()) {
    return registerNativePushToken(user, profile);
  }

  if (
    typeof window === "undefined" ||
    !user ||
    !profile ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator)
  ) {
    return false;
  }

  try {
    const [{ getMessaging, getToken, isSupported }] = await Promise.all([
      import("firebase/messaging"),
    ]);

    if (!(await isSupported())) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(firebaseApp);
    const tokenOptions = {
      serviceWorkerRegistration: registration,
      ...(vapidKey ? { vapidKey } : {}),
    };
    const token = await getToken(messaging, tokenOptions);

    if (!token) {
      return false;
    }

    await saveNotificationToken(user, profile, token, "pwa", "fcm");

    return true;
  } catch (error) {
    console.warn("Tokenul pentru notificari push nu a putut fi inregistrat:", error);
    return false;
  }
}

export async function listenKeluniaForegroundPush(onMessageReceived) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return () => undefined;
  }

  try {
    const { getMessaging, isSupported, onMessage } = await import("firebase/messaging");

    if (!(await isSupported())) {
      return () => undefined;
    }

    const messaging = getMessaging(firebaseApp);
    return onMessage(messaging, onMessageReceived);
  } catch (error) {
    console.warn("Ascultarea notificarilor push nu a putut fi pornita:", error);
    return () => undefined;
  }
}
