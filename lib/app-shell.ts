// Detectează mediul în care rulează aplicația: browser, PWA instalată sau aplicație nativă Capacitor (Android/iOS).
// Obiectul global pe care Capacitor îl adaugă în aplicațiile native.
type CapacitorWindow = Window & {
  Capacitor?: {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
};

// Platforma nativă („android”, „ios” sau „web”), sau șir gol în afara browserului.
export function nativeAppPlatform() {
  if (typeof window === "undefined") {
    return "";
  }

  const capacitor = (window as CapacitorWindow).Capacitor;
  const platform = capacitor?.getPlatform?.();

  return typeof platform === "string" ? platform.toLowerCase() : "";
}

// Aplicație nativă: după Capacitor sau după protocolul paginii (capacitor:, ionic:).
export function isNativeAppShell() {
  if (typeof window === "undefined") {
    return false;
  }

  const capacitor = (window as CapacitorWindow).Capacitor;

  if (capacitor?.isNativePlatform?.()) {
    return true;
  }

  const platform = nativeAppPlatform();

  if (platform && platform !== "web") {
    return true;
  }

  return window.location.protocol === "capacitor:" || window.location.protocol === "ionic:";
}

// PWA instalată pe ecranul principal (display-mode: standalone, inclusiv iOS).
export function isStandaloneShell() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

// Orice formă de aplicație instalată (nativă sau PWA).
export function isInstalledAppShell() {
  return isNativeAppShell() || isStandaloneShell();
}
