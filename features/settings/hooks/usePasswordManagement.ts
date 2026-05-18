"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";

import type { UserProfile } from "@/context/AuthContext";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import { auth } from "@/lib/firebase";

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
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>(emptyPasswordDraft);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  function openPasswordModal() {
    setPasswordDraft(emptyPasswordDraft);
    setPasswordError("");
    setPasswordMessage("");
    setPasswordModal(true);
  }

  function requirePasswordOnline() {
    const connected = typeof navigator === "undefined" ? isOnline : navigator.onLine;

    if (connected) {
      return true;
    }

    setIsOnline(false);
    setPasswordError(offlineMessage);
    return false;
  }

  async function savePasswordChange() {
    if (!user?.email) {
      return;
    }

    setPasswordError("");
    setPasswordMessage("");

    if (!requirePasswordOnline()) {
      return;
    }

    if (passwordDraft.next.length < 6) {
      setPasswordError("Parola nouă trebuie să aibă cel puțin 6 caractere.");
      return;
    }

    if (passwordDraft.next !== passwordDraft.confirm) {
      setPasswordError("Confirmarea parolei nu se potrivește.");
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
      setPasswordMessage("Parola a fost schimbată.");
      setPasswordDraft(emptyPasswordDraft);
    } catch (error) {
      console.error("Parola nu a putut fi schimbată:", error);
      setPasswordError("Parola nu a putut fi schimbată. Verifică parola actuală sau folosește emailul de resetare.");
    }
  }

  async function sendPasswordReset() {
    if (!user?.email) {
      return;
    }

    setPasswordError("");

    if (!requirePasswordOnline()) {
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordMessage("Ți-am trimis emailul pentru resetarea parolei.");
    } catch (error) {
      console.error("Emailul de resetare nu a putut fi trimis:", error);
      setPasswordError("Emailul de resetare nu a putut fi trimis.");
    }
  }

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
