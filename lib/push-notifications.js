// Notificări push: înregistrează jetonul dispozitivului (FCM sau APNs) prin funcția cloud registerNotificationToken
// și ascultă mesajele primite cât timp aplicația este deschisă.
import { httpsCallable } from "firebase/functions";
import { Capacitor } from "@capacitor/core";
import { cloudFunctions, firebaseApp } from "@/lib/firebase";

// Cheia publică VAPID pentru push în browser și starea ascultătorilor nativi.
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";
const nativeListenerState = {
  ready: false,
  registering: false,
};

// Push este considerat mereu configurat; jetonul se cere la nevoie.
export function hasKeluniaPushConfig() {
  return true;
}

// Platforma nativă („android”, „ios”) sau șir gol în browser.
function nativePlatform() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return "";
  }

  return Capacitor.getPlatform();
}

// Adresa deschisă la atingerea unei notificări: o rezervare anume sau dashboard-ul.
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

// Preferința per dispozitiv pentru notificări la rezervări noi; pleacă împreună cu jetonul, ca serverul s-o respecte.
const newBookingPushKey = "kelunia.notifyNewBookings";

// Per-device choice (a phone may want new-booking pings, a laptop not); it rides
// along with the push token so the server can honour it.
export function getNewBookingPushPreference() {
  try {
    return window.localStorage.getItem(newBookingPushKey) !== "0";
  } catch {
    return true;
  }
}

export function setNewBookingPushPreference(enabled) {
  try {
    window.localStorage.setItem(newBookingPushKey, enabled ? "1" : "0");
  } catch {
    // Preference stays at its default when storage is unavailable.
  }
}

// Trimite jetonul și datele utilizatorului la serverul cloud care îl reține.
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
    notifyNewBookings: getNewBookingPushPreference(),
  });
}

// Push nativ: ascultători pentru jeton, eroare și atingere; cere permisiunea, se înregistrează și așteaptă jetonul (maximum 8 secunde).
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

// Limita de timp pentru tot fluxul push în browser.
const PUSH_REGISTRATION_TIMEOUT_MS = 10000;

function withPushTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      window.setTimeout(() => resolve("timeout"), PUSH_REGISTRATION_TIMEOUT_MS);
    }),
  ]);
}

// Înregistrare push: nativ sau web (service worker + Firebase Messaging); returnează true dacă jetonul a fost salvat.
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

  // `navigator.serviceWorker.ready` and `getToken` can hang indefinitely (e.g. no
  // service worker controls the page in local dev, or FCM is unreachable). Cap the
  // whole flow so callers such as savePersonalSettings never block on it.
  const result = await withPushTimeout(
    (async () => {
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
    })()
  );

  if (result === "timeout") {
    console.warn("Inregistrarea notificarilor push a expirat; continuam fara token.");
    return false;
  }

  return result;
}

// Ascultă mesajele push primite cât aplicația este în prim-plan; returnează funcția de oprire a ascultării.
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
