"use client";

import { useEffect } from "react";
import { isInstalledAppShell, isNativeAppShell, nativeAppPlatform } from "@/lib/app-shell";

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

export function ShellModeClass() {
  useEffect(() => {
    applyShellClasses();

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onModeChange = () => applyShellClasses();
    const delayedApply = window.setTimeout(applyShellClasses, 250);

    mediaQuery.addEventListener?.("change", onModeChange);

    return () => {
      window.clearTimeout(delayedApply);
      mediaQuery.removeEventListener?.("change", onModeChange);
    };
  }, []);

  return null;
}
