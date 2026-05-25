import { httpsCallable } from "firebase/functions";
import { cloudFunctions, firebaseApp } from "@/lib/firebase";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export function hasKeluniaPushConfig() {
  return true;
}

export async function registerKeluniaPushToken(user, profile) {
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

    const registerToken = httpsCallable(cloudFunctions, "registerNotificationToken");
    await registerToken({
      token,
      locationId: profile.locationId,
      locationName: profile.locationName,
      groupName: profile.groupName,
      displayName: profile.displayName,
      email: profile.email || user.email || "",
      platform: "pwa",
    });

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
