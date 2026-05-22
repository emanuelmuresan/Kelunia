type CapacitorWindow = Window & {
  Capacitor?: {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
};

export function nativeAppPlatform() {
  if (typeof window === "undefined") {
    return "";
  }

  const capacitor = (window as CapacitorWindow).Capacitor;
  const platform = capacitor?.getPlatform?.();

  return typeof platform === "string" ? platform.toLowerCase() : "";
}

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

export function isStandaloneShell() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function isInstalledAppShell() {
  return isNativeAppShell() || isStandaloneShell();
}
