"use client";

// Codurile de acces și invitațiile unei locații: generare, editare, oprire/pornire, prelungire, ștergere cu „Anulează”,
// copierea textului de invitație și trimiterea invitației pe email prin funcția cloud sendAccessInviteEmail.
// Folosit în dashboard și afișat în AccessCodesModal; fiecare modificare se scrie în jurnalul de audit.
import { useAppText } from "@/features/shell/hooks/useAppText";
import { useState } from "react";
import type { User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  doc,
  runTransaction,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

import type { UserRole } from "@/context/AuthContext";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import { cloudFunctions } from "@/lib/firebase";
import { accessCodeExpiryDays } from "@/lib/config/app";
import {
  buildAccessInviteShareText,
  generateAccessCode,
  isAccessCodeFull,
  maxUsesForAccessRole,
} from "@/lib/access-codes";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import { updateLocationCounterSafely } from "@/lib/usage-counters";
import type {
  LocationCode,
  LocationItem,
  RoomAccessMode,
  RoomItem,
  WriteTarget,
} from "@/lib/types/domain";

// Starea formularului de generare a unui cod (rol, grup, locație, camere permise, emailul invitatului).
export type CodeGeneratorState = {
  role: UserRole | "";
  groupName: string;
  locationId: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
  inviteEmail: string;
};

// Ciorna invitației: codul, destinatarul, grupul, locația, mesajul și rolul.
export type AccessInviteDraft = {
  code: string;
  email: string;
  groupName: string;
  locationName: string;
  message: string;
  role: UserRole;
};

// Forma funcției de audit.
type RecordAuditLog = (
  entityType: AuditEntityType,
  action: AuditAction,
  entityId: string,
  before: unknown,
  after: unknown,
  auditLocationId?: string,
  auditLocationName?: string
) => Promise<void>;

// Parametrii hook-ului: permisiuni, limita de manageri, listele de locații și camere și funcțiile din dashboard.
type UseAccessCodesParams = {
  canEditCurrentLocation: boolean;
  currentLocationId: string;
  currentLocationManagerCapacityUsed: number;
  currentLocationManagerLimit: number;
  db: Firestore;
  locationName: string;
  locations: LocationItem[];
  recordAuditLog: RecordAuditLog;
  requireOnline: (target: WriteTarget) => boolean;
  rooms: RoomItem[];
  pushToast: (input: { message: string; actionLabel?: string; onAction?: () => void | Promise<void>; tone?: "default" | "error" }) => string;
  softDeletePayload: () => Record<string, unknown>;
  user: User | null;
  language?: SupportedLocale;
};

// Hook-ul codurilor de acces.
export function useAccessCodes({
  canEditCurrentLocation,
  currentLocationId,
  currentLocationManagerCapacityUsed,
  currentLocationManagerLimit,
  db,
  locationName,
  locations,
  recordAuditLog,
  requireOnline,
  rooms,
  pushToast,
  softDeletePayload,
  user,
  language = "ro",
}: UseAccessCodesParams) {
  const msg = useAppText();
  // Starea ferestrei: deschisă, eroare, lucru în curs, ciorna invitației și formularul de generare.
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [codesError, setCodesError] = useState("");
  // Success confirmations are toasts; only errors stay inline in the modal.
  const setCodesMessage = (value: string) => {
    if (value) {
      pushToast({ message: value });
    }
  };
  const [codesWorking, setCodesWorking] = useState(false);
  const [inviteDraft, setInviteDraft] = useState<AccessInviteDraft | null>(null);
  // Language of the invitation text (email + copied message); starts as the app language.
  const [inviteLanguage, setInviteLanguage] = useState<SupportedLocale>(language);
  const [codeGenerator, setCodeGenerator] = useState<CodeGeneratorState>({
    role: "",
    groupName: "",
    locationId: "",
    roomAccess: "all",
    allowedRoomIds: [],
    inviteEmail: "",
  });

  // Linkul de invitație: /login?invite=COD (&email=...), cu adresa publică a aplicației când rulează local.
  function inviteUrlForCode(code: string, recipientEmail = "") {
    const fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://kelunia.com";
    const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const isUsableWebOrigin =
      browserOrigin.startsWith("http")
      && !browserOrigin.includes("localhost")
      && !browserOrigin.includes("127.0.0.1");
    const origin = isUsableWebOrigin ? browserOrigin : fallbackOrigin;
    const url = new URL("/login", origin);
    url.searchParams.set("invite", code);

    if (recipientEmail.trim()) {
      url.searchParams.set("email", recipientEmail.trim());
    }

    return url.toString();
  }

  // Textul implicit al invitației, în limba aleasă.
  function defaultInviteMessage(
    params: {
      code: string;
      email: string;
      groupName: string;
      locationName: string;
      role: UserRole;
    },
    messageLanguage: SupportedLocale
  ) {
    const roleKey = params.role === "manager" ? "role.administrator" : params.role === "member" ? "role.collaborator" : "role.guest";
    const role = appText(messageLanguage, roleKey);
    const roleLine = params.role === "manager"
      ? appText(messageLanguage, "invite.composerRole").replace("{{role}}", role)
      : appText(messageLanguage, "invite.composerRoleGroup")
        .replace("{{role}}", role)
        .replace("{{group}}", params.groupName || appText(messageLanguage, "invite.groupFallback"));

    return [
      appText(messageLanguage, "invite.defaultIntro").replace("{{location}}", params.locationName),
      roleLine,
      "",
      appText(messageLanguage, "invite.composerBody"),
    ].join("\n");
  }

  // Switching language regenerates the composer text, unless it was edited by hand.
  function changeInviteLanguage(nextLanguage: SupportedLocale) {
    if (inviteDraft && inviteDraft.message === defaultInviteMessage(inviteDraft, inviteLanguage)) {
      setInviteDraft({ ...inviteDraft, message: defaultInviteMessage(inviteDraft, nextLanguage) });
    }

    setInviteLanguage(nextLanguage);
  }

  // Deschide editorul de invitație cu textul implicit.
  function openInviteComposer(params: {
    code: string;
    email: string;
    groupName: string;
    locationName: string;
    role: UserRole;
  }) {
    setCodesError("");
    setCodesMessage("");
    setInviteDraft({
      ...params,
      email: params.email.trim(),
      message: defaultInviteMessage(params, inviteLanguage),
    });
  }

  // Deschide fereastra codurilor cu formularul gol.
  function openCodesEditor() {
    if (!canEditCurrentLocation) {
      return;
    }

    setCodeGenerator({
      role: "",
      groupName: "",
      locationId: "",
      roomAccess: "all",
      allowedRoomIds: [],
      inviteEmail: "",
    });
    setCodesError("");
    setCodesMessage("");
    setInviteDraft(null);
    setInviteLanguage(language);
    setShowCodesModal(true);
  }

  // Copiază codul în clipboard; dacă nu merge, afișează codul pentru copiere manuală.
  async function copyAccessCode(code: string) {
    setCodesError("");
    setCodesMessage("");

    try {
      await navigator.clipboard.writeText(code);
      setCodesMessage(msg("msg.codeCopied", { code }));
    } catch (error) {
      console.warn("Codul nu a putut fi copiat:", error);
      setCodesError(msg("msg.codeCopyManual", { code }));
    }
  }

  // Copiază textul complet de invitație (cod, link, pași), gata de lipit în WhatsApp sau SMS.
  async function copyInviteLink(item: LocationCode) {
    setCodesError("");
    setCodesMessage("");

    const inviteUrl = inviteUrlForCode(item.code);
    const shareText = buildAccessInviteShareText(item, inviteUrl, undefined, inviteLanguage);

    try {
      await navigator.clipboard.writeText(shareText);
      setCodesMessage(msg("msg.inviteCopied"));
    } catch (error) {
      console.warn("Mesajul nu a putut fi copiat:", error);
      setCodesError(msg("msg.linkCopyManual", { url: inviteUrl }));
    }
  }

  // Deschide editorul de invitație pentru un cod existent.
  function sendAccessInvite(item: LocationCode) {
    if (!canEditCurrentLocation || item.locationId !== currentLocationId) {
      return;
    }

    openInviteComposer({
      code: item.code,
      email: item.lastInviteEmailSentTo || "",
      groupName: item.groupName,
      locationName: item.locationName || locationName,
      role: item.role,
    });
  }

  // Trimite invitația pe email prin funcția cloud, cu mesajul editat și limba aleasă.
  async function sendInviteEmailFromModal() {
    if (!inviteDraft) {
      return;
    }

    const recipientEmail = inviteDraft.email.trim();

    if (!recipientEmail) {
      setCodesError(msg("msg.inviteEmailRequired"));
      return;
    }

    if (!requireOnline("codes")) {
      return;
    }

    setCodesError("");
    setCodesMessage("");
    setCodesWorking(true);

    try {
      const callable = httpsCallable(cloudFunctions, "sendAccessInviteEmail");
      await callable({
        code: inviteDraft.code,
        toEmail: recipientEmail,
        message: inviteDraft.message,
        language: inviteLanguage,
      });
      setInviteDraft(null);
      setCodesMessage(msg("msg.inviteSent", { email: recipientEmail }));
    } catch (error) {
      console.error("Invitatia nu a putut fi trimisa:", error);
      setCodesError(error instanceof Error ? error.message : msg("msg.inviteSendFailed"));
    } finally {
      setCodesWorking(false);
    }
  }

  // Generează un cod nou: validează rolul, grupul, camerele și limita de manageri, apoi îl scrie într-o tranzacție.
  async function generateLocationCode() {
    const selectedRole = codeGenerator.role;
    const location = locations.find((item) => item.id === codeGenerator.locationId);

    if (!canEditCurrentLocation || !location || !selectedRole) {
      setCodesError(msg("msg.chooseLocationRole"));
      return;
    }

    if (!requireOnline("codes")) {
      return;
    }

    if (selectedRole === "manager" && currentLocationManagerCapacityUsed >= currentLocationManagerLimit) {
      setCodesError(msg("msg.managerLimit", { count: currentLocationManagerLimit }));
      return;
    }

    if (selectedRole !== "manager" && !codeGenerator.groupName.trim()) {
      setCodesError(msg("msg.chooseGroupForCode"));
      return;
    }

    const roomAccess = selectedRole === "manager" ? "all" : normalizeRoomAccessMode(codeGenerator.roomAccess);
    const selectedRoomIds = roomAccess === "selected" ? normalizeAllowedRoomIds(codeGenerator.allowedRoomIds) : [];

    if (roomAccess === "selected" && selectedRoomIds.length === 0) {
      setCodesError(msg("msg.chooseRoomForCode"));
      return;
    }

    const validRoomIds = new Set(rooms.map((room) => room.id));

    if (selectedRoomIds.some((roomId) => !validRoomIds.has(roomId))) {
      setCodesError(msg("msg.roomNoLongerExists"));
      return;
    }

    setCodesError("");
    setCodesMessage("");
    setCodesWorking(true);

    try {
      let generatedCode = "";
      let generatedPayload: Record<string, unknown> | null = null;

      // Până la 6 încercări dacă un cod generat există deja (coliziune), apoi se oprește cu eroare.
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const code = generateAccessCode();
        const codeRef = doc(db, "accessCodes", code);
        let collision = false;

        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(codeRef);

          if (snapshot.exists()) {
            collision = true;
            return;
          }

          // Codul este valabil 7 zile, are număr maxim de utilizări după rol și este activ de la început.
          const codePayload = {
            code,
            role: selectedRole,
            groupName: selectedRole === "manager" ? "" : codeGenerator.groupName.trim(),
            roomAccess,
            allowedRoomIds: selectedRoomIds,
            locationId: location.id,
            locationName: location.name,
            maxUses: maxUsesForAccessRole(selectedRole),
            usedCount: 0,
            active: true,
            createdBy: user?.email ?? "",
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromMillis(Date.now() + accessCodeExpiryDays * 24 * 60 * 60 * 1000),
            deleted: false,
          };

          transaction.set(codeRef, codePayload);
          generatedPayload = codePayload;
        });

        if (!collision) {
          generatedCode = code;
          break;
        }
      }

      if (!generatedCode) {
        throw new Error("Nu s-a putut genera un cod unic.");
      }

      // După creare: audit, contor și, fără email, textul de invitație se copiază automat; cu email se deschide editorul.
      await recordAuditLog("accessCode", "create", generatedCode, null, generatedPayload, location.id, location.name);
      await updateLocationCounterSafely(db, location.id, "accessCodeCount", 1);
      const inviteEmail = codeGenerator.inviteEmail.trim();
      setCodeGenerator({ role: "", groupName: "", locationId: "", roomAccess: "all", allowedRoomIds: [], inviteEmail: "" });

      if (inviteEmail) {
        openInviteComposer({
          code: generatedCode,
          email: inviteEmail,
          groupName: selectedRole === "manager" ? "" : codeGenerator.groupName.trim(),
          locationName: location.name,
          role: selectedRole,
        });
        setCodesMessage(msg("msg.codeGeneratedVerify", { code: generatedCode }));
      } else {
        try {
          const shareText = buildAccessInviteShareText(
            {
              code: generatedCode,
              role: selectedRole,
              groupName: selectedRole === "manager" ? "" : codeGenerator.groupName.trim(),
              locationName: location.name,
              expiresAt: (generatedPayload as { expiresAt?: unknown } | null)?.expiresAt,
            },
            inviteUrlForCode(generatedCode),
            undefined,
            inviteLanguage
          );
          await navigator.clipboard.writeText(shareText);
          setCodesMessage(msg("msg.inviteGeneratedCopied", { code: generatedCode }));
        } catch {
          setCodesMessage(msg("msg.codeGenerated", { code: generatedCode }));
        }
      }
    } catch (error) {
      console.error("Codul nu a putut fi generat:", error);
      setCodesError(error instanceof Error ? error.message : msg("msg.codeGenerateFailed"));
    } finally {
      setCodesWorking(false);
    }
  }

  // Schimbă rolul, grupul sau camerele unui cod; managerii sunt limitați de planul locației.
  async function updateAccessCodeDetails(
    item: LocationCode,
    nextRole: UserRole,
    nextGroupName: string,
    nextRoomAccess: RoomAccessMode = item.roomAccess,
    nextAllowedRoomIds: string[] = item.allowedRoomIds
  ) {
    if (!canEditCurrentLocation || item.locationId !== currentLocationId) {
      return;
    }

    if (!requireOnline("codes")) {
      return;
    }

    const currentCodeUsesManagerSlot = item.role === "manager" && item.active && !isAccessCodeFull(item);
    const managerCapacityAfterCurrentCode = currentLocationManagerCapacityUsed - (currentCodeUsesManagerSlot ? 1 : 0);

    if (nextRole === "manager" && managerCapacityAfterCurrentCode >= currentLocationManagerLimit) {
      setCodesError(msg("msg.managerLimit", { count: currentLocationManagerLimit }));
      return;
    }

    if (nextRole !== "manager" && !nextGroupName.trim()) {
      setCodesError(msg("msg.chooseGroupForCode"));
      return;
    }

    const roomAccess = nextRole === "manager" ? "all" : normalizeRoomAccessMode(nextRoomAccess);
    const selectedRoomIds = roomAccess === "selected" ? normalizeAllowedRoomIds(nextAllowedRoomIds) : [];

    if (roomAccess === "selected" && selectedRoomIds.length === 0) {
      setCodesError(msg("msg.chooseRoomForCode"));
      return;
    }

    const validRoomIds = new Set(rooms.map((room) => room.id));

    if (selectedRoomIds.some((roomId) => !validRoomIds.has(roomId))) {
      setCodesError(msg("msg.roomNoLongerExists"));
      return;
    }

    setCodesError("");
    setCodesMessage("");

    if (!item.active && item.role === "manager" && currentLocationManagerCapacityUsed >= currentLocationManagerLimit) {
      setCodesError(msg("msg.managerLimit", { count: currentLocationManagerLimit }));
      return;
    }

    try {
      const updatedCode = {
        ...item,
        role: nextRole,
        groupName: nextRole === "manager" ? "" : nextGroupName.trim(),
        roomAccess,
        allowedRoomIds: selectedRoomIds,
        maxUses: maxUsesForAccessRole(nextRole),
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      };
      await updateDoc(doc(db, "accessCodes", item.id), {
        role: nextRole,
        groupName: nextRole === "manager" ? "" : nextGroupName.trim(),
        roomAccess,
        allowedRoomIds: selectedRoomIds,
        locationId: item.locationId,
        locationName: item.locationName || locationName,
        maxUses: maxUsesForAccessRole(nextRole),
        usedCount: item.usedCount,
        active: item.active,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      });
      await recordAuditLog("accessCode", "update", item.id, item, updatedCode, item.locationId, item.locationName || locationName);
      setCodesMessage(msg("msg.codeRoleUpdated"));
    } catch (error) {
      console.error("Codul nu a putut fi actualizat:", error);
      setCodesError(msg("msg.codeUpdateFailed"));
    }
  }

  // Oprește sau pornește un cod (un cod oprit nu mai poate fi folosit la înregistrare).
  async function toggleAccessCodeActive(item: LocationCode) {
    if (!canEditCurrentLocation || item.locationId !== currentLocationId) {
      return;
    }

    if (!requireOnline("codes")) {
      return;
    }

    setCodesError("");
    setCodesMessage("");

    try {
      const updatedCode = {
        ...item,
        active: !item.active,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      };
      await updateDoc(doc(db, "accessCodes", item.id), {
        role: item.role,
        groupName: item.role === "manager" ? "" : item.groupName,
        roomAccess: item.role === "manager" ? "all" : item.roomAccess,
        allowedRoomIds: item.role === "manager" || item.roomAccess === "all" ? [] : item.allowedRoomIds,
        locationId: item.locationId,
        locationName: item.locationName || locationName,
        active: !item.active,
        maxUses: item.maxUses,
        usedCount: item.usedCount,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      });
      await recordAuditLog("accessCode", "update", item.id, item, updatedCode, item.locationId, item.locationName || locationName);
      setCodesMessage(!item.active ? msg("msg.codeActivated") : msg("msg.codeStopped"));
    } catch (error) {
      console.error("Codul nu a putut fi schimbat:", error);
      setCodesError(msg("msg.codeToggleFailed"));
    }
  }

  // Prelungește valabilitatea codului cu încă 7 zile.
  async function extendAccessCodeExpiry(item: LocationCode) {
    if (!canEditCurrentLocation || item.locationId !== currentLocationId) {
      return;
    }

    if (!requireOnline("codes")) {
      return;
    }

    setCodesError("");
    setCodesMessage("");

    const nextExpiresAt = Timestamp.fromMillis(Date.now() + accessCodeExpiryDays * 24 * 60 * 60 * 1000);

    try {
      const updatedCode = { ...item, expiresAt: nextExpiresAt, updatedBy: user?.email ?? "", updatedAt: Timestamp.now() };
      await updateDoc(doc(db, "accessCodes", item.id), {
        role: item.role,
        groupName: item.role === "manager" ? "" : item.groupName,
        roomAccess: item.role === "manager" ? "all" : item.roomAccess,
        allowedRoomIds: item.role === "manager" || item.roomAccess === "all" ? [] : item.allowedRoomIds,
        locationId: item.locationId,
        locationName: item.locationName || locationName,
        active: item.active,
        maxUses: item.maxUses,
        usedCount: item.usedCount,
        expiresAt: nextExpiresAt,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      });
      await recordAuditLog("accessCode", "update", item.id, item, updatedCode, item.locationId, item.locationName || locationName);
      setCodesMessage(msg("msg.codeExtended", { days: accessCodeExpiryDays }));
    } catch (error) {
      console.error("Codul nu a putut fi prelungit:", error);
      setCodesError(msg("msg.codeExtendFailed"));
    }
  }

  // Șterge logic codul (rămâne în Firestore, marcat ca șters), cu posibilitate de „Anulează”.
  async function removeAccessCode(item: LocationCode) {
    if (!canEditCurrentLocation || item.locationId !== currentLocationId || !requireOnline("codes")) {
      return;
    }

    setCodesError("");
    setCodesMessage("");

    try {
      const deletedPayload = { ...softDeletePayload(), active: false };
      await updateDoc(doc(db, "accessCodes", item.id), deletedPayload);
      await updateLocationCounterSafely(db, item.locationId, "accessCodeCount", -1);
      await recordAuditLog("accessCode", "delete", item.id, item, { ...item, ...deletedPayload }, item.locationId, item.locationName || locationName);
      pushToast({
        message: msg("msg.codeDeleted"),
        actionLabel: msg("msg.undo"),
        onAction: () => restoreAccessCode(item),
      });
    } catch (error) {
      console.error("Codul nu a putut fi sters:", error);
      setCodesError(msg("msg.codeDeleteFailed"));
    }
  }

  // Anulează ștergerea unui cod.
  async function restoreAccessCode(item: LocationCode) {
    try {
      const restoredPayload = {
        deleted: false,
        deletedAt: null,
        deletedBy: "",
        deletedByUid: "",
        active: item.active,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      };
      await updateDoc(doc(db, "accessCodes", item.id), restoredPayload);
      await updateLocationCounterSafely(db, item.locationId, "accessCodeCount", 1);
      await recordAuditLog("accessCode", "update", item.id, { ...item, deleted: true }, { ...item, ...restoredPayload }, item.locationId, item.locationName || locationName);
    } catch (error) {
      console.error("Anularea ștergerii nu a reușit:", error);
      setCodesError(msg("msg.undoFailed"));
    }
  }

  // Starea și acțiunile expuse dashboard-ului.
  return {
    changeInviteLanguage,
    codeGenerator,
    codesError,
    codesWorking,
    copyAccessCode,
    copyInviteLink,
    extendAccessCodeExpiry,
    generateLocationCode,
    openCodesEditor,
    removeAccessCode,
    sendAccessInvite,
    sendInviteEmailFromModal,
    setCodeGenerator,
    setCodesError,
    setInviteDraft,
    setShowCodesModal,
    showCodesModal,
    inviteDraft,
    inviteLanguage,
    toggleAccessCodeActive,
    updateAccessCodeDetails,
  };
}
