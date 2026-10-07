"use client";

// Schimbarea parolei: validează parola nouă, reautentifică utilizatorul cu parola curentă, o schimbă și scrie în audit;
// trimite și emailul de resetare prin funcția cloud sendAuthPasswordResetEmail.
import { useAppText } from "@/features/shell/hooks/useAppText";
import { useState } from "react";
import type { User } from "firebase/auth";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import type { UserProfile } from "@/context/AuthContext";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import { cloudFunctions } from "@/lib/firebase";
import { passwordSecurityError } from "@/lib/security/password";

// Ciorna parolelor și forma funcției de audit.
type PasswordDraft = {
  current: string;
  next: string;
  confirm: string;
};

type RecordAuditLog = (
  entityType: AuditEntityType,
  action: AuditAction,
  entityId: string,
  before: unknown,
  after: unknown,
  auditLocationId?: string,
  auditLocationName?: string
) => Promise<void>;

// Parametrii: utilizatorul, profilul și funcțiile din dashboard.
type UsePasswordManagementParams = {
  currentLocationId: string;
  isOnline: boolean;
  locationName: string;
  offlineMessage: string;
  profile: UserProfile | null;
  recordAuditLog: RecordAuditLog;
  setIsOnline: (value: boolean) => void;
  user: User | null;
};

const emptyPasswordDraft: PasswordDraft = { current: "", next: "", confirm: "" };

// Trimite emailul de resetare prin funcția cloud, în limba aleasă.
async function sendCustomPasswordResetEmail(email: string, language = "ro") {
  const sendPasswordReset = httpsCallable(cloudFunctions, "sendAuthPasswordResetEmail");
  await sendPasswordReset({ email, language });
}

// Hook-ul parolei.
export function usePasswordManagement({
  currentLocationId,
  isOnline,
  locationName,
  offlineMessage,
  profile,
  recordAuditLog,
  setIsOnline,
  user,
}: UsePasswordManagementParams) {
  // Starea ferestrei: deschisă, ciorna, eroarea și mesajul.
  const msg = useAppText();
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>(emptyPasswordDraft);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  // Deschide fereastra cu câmpurile goale.
  function openPasswordModal() {
    setPasswordDraft(emptyPasswordDraft);
    setPasswordError("");
    setPasswordMessage("");
    setPasswordModal(true);
  }

  // Fără internet operațiunea nu pornește și afișează mesajul offline.
  function requirePasswordOnline() {
    const connected = typeof navigator === "undefined" ? isOnline : navigator.onLine;

    if (connected) {
      return true;
    }

    setIsOnline(false);
    setPasswordError(offlineMessage);
    return false;
  }

  // Schimbă parola: regulile parolei noi, confirmarea, reautentificarea (cerută de Firebase pentru operațiuni sensibile) și apoi schimbarea.
  async function savePasswordChange() {
    if (!user?.email) {
      return;
    }

    setPasswordError("");
    setPasswordMessage("");

    if (!requirePasswordOnline()) {
      return;
    }

    const nextPasswordError = passwordSecurityError(passwordDraft.next, user.email);

    if (nextPasswordError) {
      setPasswordError(nextPasswordError);
      return;
    }

    if (passwordDraft.next !== passwordDraft.confirm) {
      setPasswordError(msg("msg.passwordMismatch"));
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, passwordDraft.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordDraft.next);
      await recordAuditLog(
        "user",
        "update",
        user.uid,
        null,
        { passwordChanged: true },
        profile?.locationId || currentLocationId || "owner",
        profile?.locationName || locationName
      );
      setPasswordMessage(msg("msg.passwordChanged"));
      setPasswordDraft(emptyPasswordDraft);
    } catch (error) {
      console.error("Parola nu a putut fi schimbată:", error);
      setPasswordError(msg("msg.passwordChangeFailed"));
    }
  }

  // Trimite emailul de resetare a parolei către adresa contului.
  async function sendPasswordReset() {
    if (!user?.email) {
      return;
    }

    setPasswordError("");

    if (!requirePasswordOnline()) {
      return;
    }

    try {
      await sendCustomPasswordResetEmail(user.email, profile?.language ?? "ro");
      setPasswordMessage(msg("msg.resetEmailSent"));
    } catch (error) {
      console.error("Emailul de resetare nu a putut fi trimis:", error);
      setPasswordError(msg("msg.resetEmailFailed"));
    }
  }

  // Starea și acțiunile expuse dashboard-ului.
  return {
    openPasswordModal,
    passwordDraft,
    passwordError,
    passwordMessage,
    passwordModal,
    savePasswordChange,
    sendPasswordReset,
    setPasswordDraft,
    setPasswordModal,
  };
}
