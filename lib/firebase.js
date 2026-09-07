import { initializeApp, getApps } from "firebase/app";
import { CustomProvider, getToken as getAppCheckToken, initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { browserLocalPersistence, getAuth, indexedDBLocalPersistence, initializeAuth, setPersistence } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { isNativeAppShell } from "./app-shell";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Inițializare sigură pentru Next.js
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseApp = app;
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// Resolves once App Check has a real, usable token — not just once a provider is
// registered on the `app` instance. On native this means waiting out the Play
// Integrity handshake (a couple of seconds). Firestore/Auth reads that fire before
// this resolves can race ahead of App Check and get hard-denied once enforcement is
// on, so callers that read Firestore right after sign-in (see AuthContext) await
// this first. Falls back to resolving after a timeout so a slow/failed attestation
// never hangs the app forever — a request made after that will just fail once with
// the normal permission error instead of freezing the UI.
let resolveAppCheckReady;
export const appCheckReadyPromise = new Promise((resolve) => {
  resolveAppCheckReady = resolve;
});

if (typeof window === "undefined") {
  // SSR/build: nothing waits on this in practice (App Check only runs client-side),
  // but resolve anyway so the promise can never dangle.
  resolveAppCheckReady();
}

if (typeof window !== "undefined" && !window.__keluniaAppCheckInitialized) {
  const nativeShell = isNativeAppShell();
  // Capacitor's Android WebView is served from https://localhost (see capacitor.config.ts
  // androidScheme), so the hostname alone can't tell real browser-localhost dev apart from
  // the packaged native app. Only treat it as local dev when it's NOT the native shell —
  // otherwise every native build would wrongly fall back to the App Check debug provider
  // instead of the native Play Integrity / App Attest one below.
  const isLocalHost = !nativeShell && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  if (isLocalHost) {
    // Local dev: App Check is enforced on Firestore/Functions in production, so
    // localhost needs a debug token (register it in Firebase Console → App Check →
    // Manage debug tokens). Only runs on localhost.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  if (nativeShell) {
    // Android/iOS: attest the device natively (Play Integrity / App Attest) via
    // @capacitor-firebase/app-check, then bridge the native token into the JS SDK
    // through a CustomProvider so Firestore/Functions calls made from the WebView
    // (still on the JS SDK) carry it too.
    import("@capacitor-firebase/app-check")
      .then(async ({ FirebaseAppCheck }) => {
        await FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true });
        const appCheckInstance = initializeAppCheck(app, {
          provider: new CustomProvider({
            getToken: () =>
              FirebaseAppCheck.getToken().then((result) => ({
                token: result.token,
                expireTimeMillis: result.expireTimeMillis ?? Date.now() + 60_000,
              })),
          }),
          isTokenAutoRefreshEnabled: true,
        });

        // Force the first Play Integrity round trip to finish now, before anything
        // else in the app is allowed to touch Firestore/Functions.
        try {
          await getAppCheckToken(appCheckInstance);
        } catch (error) {
          console.warn("Primul token App Check nu a putut fi obtinut:", error);
        }
      })
      .catch((error) => {
        console.warn("App Check nativ nu a putut fi inițializat:", error);
      })
      .finally(() => {
        resolveAppCheckReady();
      });

    // Safety net: never block the app forever if the attestation hangs (e.g. a
    // rooted/unsupported device) — after this, requests just fail once instead of
    // the whole app freezing on a pending profile load.
    window.setTimeout(resolveAppCheckReady, 8000);
  } else if (recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    // Web/localhost: initializeAppCheck() itself is synchronous, so Firestore/Auth
    // already know to wait for a reCAPTCHA token on their own — no extra gate needed.
    resolveAppCheckReady();
  } else {
    // No site key configured at all: nothing to wait for.
    resolveAppCheckReady();
  }

  window.__keluniaAppCheckInitialized = true;
}

function isNativeShell() {
  return isNativeAppShell();
}

function createAuth() {
  if (typeof window === "undefined") {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const cloudFunctions = getFunctions(app, "europe-west1");
export const storage = getStorage(app);

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export function ensureAuthPersistence() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const nativeShell = isNativeShell();
  const persistence = nativeShell ? indexedDBLocalPersistence : browserLocalPersistence;

  return withTimeout(
    setPersistence(auth, persistence),
    3000,
    "Persistenta autentificarii nu a raspuns la timp."
  ).catch((error) => {
    console.warn("Persistenta autentificarii nu a putut fi setata:", error);

    if (nativeShell) {
      return withTimeout(
        setPersistence(auth, browserLocalPersistence),
        3000,
        "Persistenta alternativa nu a raspuns la timp."
      ).catch((fallbackError) => {
        console.warn("Persistenta alternativa nu a putut fi setata:", fallbackError);
      });
    }
  });
}

let firestoreDb;

if (typeof window !== "undefined") {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    firestoreDb = getFirestore(app);
  }
} else {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
