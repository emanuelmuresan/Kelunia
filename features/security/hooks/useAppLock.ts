"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { registerPlugin } from "@capacitor/core";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, setDoc, type Firestore } from "firebase/firestore";

import type { UserProfile } from "@/context/AuthContext";
import { auth, cloudFunctions } from "@/lib/firebase";
import { clearBiometricCredential, verifyBiometricCredential } from "@/lib/security";
import type { PersonalDraft, PinIntent } from "@/lib/types/domain";

type CapacitorAppPlugin = {
  addListener: (
    eventName: "appStateChange",
    listener: (state: { isActive: boolean }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
};

const CapacitorApp = registerPlugin<CapacitorAppPlugin>("App");

type UseAppLockParams = {
  db: Firestore;
  user: User | null;
  profile: UserProfile | null;
  setPersonalDraft: Dispatch<SetStateAction<PersonalDraft>>;
  setSettingsError: (value: string) => void;
};

/**
 * Unlock lock screen + PIN/biometrics setup, extracted verbatim from
 * app/dashboard/page.tsx. Owns: the app-locked state, the session-storage
 * unlock marker, lock-on-hide / visibility listeners, biometric-prompt-on-launch,
 * and the PIN/biometrics toggles. confirmPinSetup stays in the page because it
 * bridges to savePersonalSettings.
 */
export function useAppLock({
  db,
  user,
  profile,
  setPersonalDraft,
  setSettingsError,
}: UseAppLockParams) {
  const [appLocked, setAppLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [biometricWorking, setBiometricWorking] = useState(false);
  const [pinIntent, setPinIntent] = useState<PinIntent | null>(null);
  const [pinDraft, setPinDraft] = useState({ pin: "", confirm: "" });
  const [pinError, setPinError] = useState("");
  // Set right after the setPin Cloud Function succeeds, so the settings-save guard
  // knows a PIN now exists even before the profile snapshot refreshes.
  const [pinConfiguredLocally, setPinConfiguredLocally] = useState(false);
  const biometricPromptedRef = useRef("");

  const lockSessionKey = user ? `kelunia-unlocked:${user.uid}` : "";
  const pinLockEnabled = Boolean(user && profile?.usePin && profile.hasPin);

  const markAppUnlocked = useCallback(() => {
    if (lockSessionKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(lockSessionKey, "1");
    }

    setAppLocked(false);
    setUnlockPin("");
    setUnlockError("");
    biometricPromptedRef.current = "";
  }, [lockSessionKey]);

  const markAppLocked = useCallback(() => {
    if (!pinLockEnabled || !lockSessionKey || typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(lockSessionKey);
    setAppLocked(true);
    setUnlockPin("");
    biometricPromptedRef.current = "";
  }, [lockSessionKey, pinLockEnabled]);

  async function confirmSignOut() {
    if (typeof window !== "undefined" && !window.confirm("Vrei sa iesi din cont?")) {
      return;
    }

    if (lockSessionKey && typeof window !== "undefined") {
      window.sessionStorage.removeItem(lockSessionKey);
    }

    setAppLocked(false);
    await signOut(auth);
  }

  // Recovery: the profile says the app is PIN-locked but the server has no PIN on
  // file (legacy pre-migration PIN, or migration hasn't run). Let the user in and
  // turn the lock flag off instead of trapping them out.
  async function clearStaleLock() {
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { usePin: false, useBiometrics: false }, { merge: true });
      } catch (error) {
        console.warn("Starea de blocare invechita nu a putut fi curatata:", error);
      }
    }

    setPersonalDraft((current) => ({ ...current, usePin: false, useBiometrics: false, lockOnHide: false }));
    markAppUnlocked();
    setSettingsError(
      "PIN-ul a fost resetat din motive de securitate. Activeaza din nou „Blocare cu PIN” din Setari si alege un cod nou."
    );
  }

  async function unlockWithPin() {
    if (!user) {
      return;
    }

    setUnlockError("");

    if (!/^\d{4,8}$/.test(unlockPin)) {
      setUnlockError("PIN-ul trebuie sa aiba intre 4 si 8 cifre.");
      return;
    }

    try {
      const verifyPin = httpsCallable<{ pin: string }, {
        ok: boolean;
        locked?: boolean;
        retryAfterSeconds?: number;
        remainingAttempts?: number;
      }>(cloudFunctions, "verifyPin");
      const result = (await verifyPin({ pin: unlockPin })).data;

      if (result.ok) {
        markAppUnlocked();
        return;
      }

      if (result.locked) {
        const wait = result.retryAfterSeconds ?? 0;
        const label = wait >= 60 ? `${Math.round(wait / 60)} minute` : `${wait} secunde`;
        setUnlockError(`Prea multe incercari gresite. Reincearca peste ${label}.`);
        return;
      }

      const remaining = result.remainingAttempts ?? 0;
      setUnlockError(remaining > 0 ? `PIN incorect. ${remaining} incercari ramase.` : "PIN incorect.");
    } catch (error) {
      const code = (error as { code?: string })?.code;

      if (code === "functions/failed-precondition") {
        await clearStaleLock();
        return;
      }

      console.error("PIN-ul nu a putut fi verificat:", error);
      setUnlockError(
        (error as { message?: string })?.message || "PIN-ul nu a putut fi verificat. Incearca din nou."
      );
    }
  }

  const unlockWithBiometrics = useCallback(async () => {
    if (!user || biometricWorking) {
      return;
    }

    setBiometricWorking(true);
    setUnlockError("");

    try {
      const unlocked = await verifyBiometricCredential(user.uid);

      if (unlocked) {
        markAppUnlocked();
        return;
      }

      setUnlockError("Deblocarea biometrica nu a mers. Foloseste PIN-ul.");
    } finally {
      setBiometricWorking(false);
    }
  }, [biometricWorking, markAppUnlocked, user]);

  useEffect(() => {
    if (!pinLockEnabled || !lockSessionKey || typeof window === "undefined") {
      setAppLocked(false);
      setUnlockPin("");
      setUnlockError("");
      return;
    }

    setAppLocked(window.sessionStorage.getItem(lockSessionKey) !== "1");
  }, [lockSessionKey, pinLockEnabled]);

  useEffect(() => {
    if (!pinLockEnabled || !profile?.lockOnHide || typeof document === "undefined") {
      return;
    }

    let nativeListener: { remove: () => Promise<void> } | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markAppLocked();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", markAppLocked);
    void CapacitorApp.addListener("appStateChange", (state) => {
      if (!state.isActive) {
        markAppLocked();
      }
    })
      .then((listener) => {
        nativeListener = listener;
      })
      .catch(() => {
        nativeListener = null;
      });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", markAppLocked);
      void nativeListener?.remove();
    };
  }, [lockSessionKey, markAppLocked, pinLockEnabled, profile?.lockOnHide]);

  useEffect(() => {
    if (!appLocked || !profile?.useBiometrics || !user) {
      return;
    }

    const promptKey = `${user.uid}:${lockSessionKey}`;

    if (biometricPromptedRef.current === promptKey) {
      return;
    }

    biometricPromptedRef.current = promptKey;
    const timer = window.setTimeout(() => {
      void unlockWithBiometrics();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [appLocked, lockSessionKey, profile?.useBiometrics, unlockWithBiometrics, user]);

  function openPinSetup(intent: PinIntent) {
    setPinIntent(intent);
    setPinDraft({ pin: "", confirm: "" });
    setPinError("");
  }

  function closePinSetup() {
    setPinIntent(null);
    setPinDraft({ pin: "", confirm: "" });
    setPinError("");
  }

  function handlePinToggle(checked: boolean) {
    if (checked) {
      openPinSetup("pin");
      return;
    }

    setPersonalDraft((current) => ({
      ...current,
      usePin: false,
      useBiometrics: false,
      lockOnHide: false,
    }));

    if (user) {
      clearBiometricCredential(user.uid);
      void httpsCallable(cloudFunctions, "disablePin")({}).catch((error) => {
        console.warn("PIN-ul nu a putut fi dezactivat pe server:", error);
      });
    }
  }

  function handleBiometricsToggle(checked: boolean) {
    if (!checked) {
      setPersonalDraft((current) => ({ ...current, useBiometrics: false }));
      if (user) {
        clearBiometricCredential(user.uid);
      }
      return;
    }

    openPinSetup("biometrics");
  }

  return {
    appLocked,
    unlockPin,
    setUnlockPin,
    unlockError,
    biometricWorking,
    pinIntent,
    pinDraft,
    setPinDraft,
    pinError,
    setPinError,
    pinConfiguredLocally,
    setPinConfiguredLocally,
    markAppLocked,
    markAppUnlocked,
    confirmSignOut,
    clearStaleLock,
    unlockWithPin,
    unlockWithBiometrics,
    openPinSetup,
    closePinSetup,
    handlePinToggle,
    handleBiometricsToggle,
  };
}
