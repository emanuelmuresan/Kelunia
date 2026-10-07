"use client";

// Pune pe elementul <html> clase CSS care descriu modul în care rulează aplicația (browser, instalată, nativă, Android/iOS).
// Stilurile din globals.css le folosesc pentru a adapta marginile și bara de sus (ex. zonele sigure de pe iPhone).
import { useEffect } from "react";
import { isInstalledAppShell, isNativeAppShell, nativeAppPlatform } from "@/lib/app-shell";

// Calculează modul curent și actualizează clasele de pe <html>.
function applyShellClasses() {
  const root = document.documentElement;
  const installed = isInstalledAppShell();
  const native = isNativeAppShell();
  const platform = nativeAppPlatform();

  root.classList.toggle("kelunia-installed-shell", installed);
  root.classList.toggle("kelunia-browser-shell", !installed);
  root.classList.toggle("kelunia-native-shell", native);
  root.classList.toggle("kelunia-android-shell", native && platform === "android");
  root.classList.toggle("kelunia-ios-shell", native && platform === "ios");
}

// Componentă fără interfață: aplică clasele la montare și la schimbarea modului „standalone” (aplicație instalată).
export function ShellModeClass() {
  useEffect(() => {
    applyShellClasses();

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onModeChange = () => applyShellClasses();
    // A doua aplicare, întârziată, prinde cazurile în care Capacitor/PWA devine detectabil după încărcare.
    const delayedApply = window.setTimeout(applyShellClasses, 250);

    mediaQuery.addEventListener?.("change", onModeChange);

    return () => {
      window.clearTimeout(delayedApply);
      mediaQuery.removeEventListener?.("change", onModeChange);
    };
  }, []);

  return null;
}
