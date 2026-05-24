"use client";

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
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import { cloudFunctions } from "@/lib/firebase";
import {
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

export type CodeGeneratorState = {
  role: UserRole | "";
  groupName: string;
  locationId: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
  inviteEmail: string;
};

export type AccessInviteDraft = {
  code: string;
  email: string;
  groupName: string;
  locationName: string;
  message: string;
  role: UserRole;
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
  softDeletePayload: () => Record<string, unknown>;
  user: User | null;
};

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
  softDeletePayload,
  user,
}: UseAccessCodesParams) {
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [codesError, setCodesError] = useState("");
  const [codesMessage, setCodesMessage] = useState("");
  const [codesWorking, setCodesWorking] = useState(false);
  const [inviteDraft, setInviteDraft] = useState<AccessInviteDraft | null>(null);
  const [codeGenerator, setCodeGenerator] = useState<CodeGeneratorState>({
    role: "",
    groupName: "",
    locationId: "",
    roomAccess: "all",
    allowedRoomIds: [],
    inviteEmail: "",
  });

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

  function roleLabel(role: UserRole) {
    if (role === "manager") {
      return "Manager";
    }

    if (role === "member") {
      return "Membru";
    }

    return "Oaspete";
  }

  function defaultInviteMessage(params: {
    code: string;
    email: string;
    groupName: string;
    locationName: string;
    role: UserRole;
  }) {
    return [
      `Ai primit o invitatie pentru Kelunia, locatia ${params.locationName}.`,
      `Rol: ${roleLabel(params.role)}${params.role === "manager" ? "" : `, grup: ${params.groupName || "setat in invitatie"}`}.`,
      "",
      "Deschide linkul din email, creeaza contul sau intra in cont, apoi Kelunia va folosi codul pentru a te conecta la locatia potrivita.",
    ].join("\n");
  }

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
      message: defaultInviteMessage(params),
    });
  }

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
    setShowCodesModal(true);
  }

  async function copyAccessCode(code: string) {
    setCodesError("");
    setCodesMessage("");

    try {
      await navigator.clipboard.writeText(code);
      setCodesMessage(`Codul ${code} a fost copiat.`);
    } catch (error) {
      console.warn("Codul nu a putut fi copiat:", error);
      setCodesError(`Codul este ${code}. Copiaza-l manual daca browserul nu permite copierea automata.`);
    }
  }

  async function copyInviteLink(code: string) {
    setCodesError("");
    setCodesMessage("");

    const inviteUrl = inviteUrlForCode(code);

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCodesMessage("Linkul de invitatie a fost copiat.");
    } catch (error) {
      console.warn("Linkul nu a putut fi copiat:", error);
      setCodesError(`Linkul este ${inviteUrl}. Copiaza-l manual daca browserul nu permite copierea automata.`);
    }
  }

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

  async function sendInviteEmailFromModal() {
    if (!inviteDraft) {
      return;
    }

    const recipientEmail = inviteDraft.email.trim();

    if (!recipientEmail) {
      setCodesError("Scrie emailul persoanei invitate.");
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
      });
      setInviteDraft(null);
      setCodesMessage(`Invitatia a fost trimisa prin Kelunia catre ${recipientEmail}.`);
    } catch (error) {
      console.error("Invitatia nu a putut fi trimisa:", error);
      setCodesError(error instanceof Error ? error.message : "Invitatia nu a putut fi trimisa.");
    } finally {
      setCodesWorking(false);
    }
  }

  async function generateLocationCode() {
    const selectedRole = codeGenerator.role;
    const location = locations.find((item) => item.id === codeGenerator.locationId);

    if (!canEditCurrentLocation || !location || !selectedRole) {
      setCodesError("Alege locatia si rolul.");
      return;
    }

    if (!requireOnline("codes")) {
      return;
    }

    if (selectedRole === "manager" && currentLocationManagerCapacityUsed >= currentLocationManagerLimit) {
      setCodesError(`Aceasta locatie are deja limita de ${currentLocationManagerLimit} manageri sau invitatii active de manager.`);
      return;
    }

    if (selectedRole !== "manager" && !codeGenerator.groupName.trim()) {
      setCodesError("Alege grupul pentru acest cod.");
      return;
    }

    const roomAccess = selectedRole === "manager" ? "all" : normalizeRoomAccessMode(codeGenerator.roomAccess);
    const selectedRoomIds = roomAccess === "selected" ? normalizeAllowedRoomIds(codeGenerator.allowedRoomIds) : [];

    if (roomAccess === "selected" && selectedRoomIds.length === 0) {
      setCodesError("Alege cel putin o sala pentru acest cod sau lasa acces la toate salile.");
      return;
    }

    const validRoomIds = new Set(rooms.map((room) => room.id));

    if (selectedRoomIds.some((roomId) => !validRoomIds.has(roomId))) {
      setCodesError("Una dintre salile alese nu mai exista.");
      return;
    }

    setCodesError("");
    setCodesMessage("");
    setCodesWorking(true);

    try {
      let generatedCode = "";
      let generatedPayload: Record<string, unknown> | null = null;

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
        setCodesMessage(`Cod generat: ${generatedCode}. Verifica invitatia si apasa Trimite.`);
      } else {
        try {
          await navigator.clipboard.writeText(inviteUrlForCode(generatedCode));
          setCodesMessage(`Link de invitatie generat si copiat pentru codul ${generatedCode}.`);
        } catch {
          setCodesMessage(`Cod generat: ${generatedCode}`);
        }
      }
    } catch (error) {
      console.error("Codul nu a putut fi generat:", error);
      setCodesError(error instanceof Error ? error.message : "Codul nu a putut fi generat.");
    } finally {
      setCodesWorking(false);
    }
  }

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
      setCodesError(`Aceasta locatie are deja limita de ${currentLocationManagerLimit} manageri sau invitatii active de manager.`);
      return;
    }

    if (nextRole !== "manager" && !nextGroupName.trim()) {
      setCodesError("Alege grupul pentru acest cod.");
      return;
    }

    const roomAccess = nextRole === "manager" ? "all" : normalizeRoomAccessMode(nextRoomAccess);
    const selectedRoomIds = roomAccess === "selected" ? normalizeAllowedRoomIds(nextAllowedRoomIds) : [];

    if (roomAccess === "selected" && selectedRoomIds.length === 0) {
      setCodesError("Alege cel putin o sala pentru acest cod sau lasa acces la toate salile.");
      return;
    }

    const validRoomIds = new Set(rooms.map((room) => room.id));

    if (selectedRoomIds.some((roomId) => !validRoomIds.has(roomId))) {
      setCodesError("Una dintre salile alese nu mai exista.");
      return;
    }

    setCodesError("");
    setCodesMessage("");

    if (!item.active && item.role === "manager" && currentLocationManagerCapacityUsed >= currentLocationManagerLimit) {
      setCodesError(`Aceasta locatie are deja limita de ${currentLocationManagerLimit} manageri sau invitatii active de manager.`);
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
      setCodesMessage("Rolul codului a fost actualizat.");
    } catch (error) {
      console.error("Codul nu a putut fi actualizat:", error);
      setCodesError("Codul nu a putut fi actualizat. Verifica regulile Firebase.");
    }
  }

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
      setCodesMessage(!item.active ? "Codul a fost activat." : "Codul a fost oprit.");
    } catch (error) {
      console.error("Codul nu a putut fi schimbat:", error);
      setCodesError("Codul nu a putut fi schimbat. Verifica regulile Firebase.");
    }
  }

  async function removeAccessCode(item: LocationCode) {
    if (!canEditCurrentLocation || item.locationId !== currentLocationId || !requireOnline("codes") || !confirm(`Stergi codul ${item.code}?`)) {
      return;
    }

    setCodesError("");
    setCodesMessage("");

    try {
      const deletedPayload = { ...softDeletePayload(), active: false };
      await updateDoc(doc(db, "accessCodes", item.id), deletedPayload);
      await updateLocationCounterSafely(db, item.locationId, "accessCodeCount", -1);
      await recordAuditLog("accessCode", "delete", item.id, item, { ...item, ...deletedPayload }, item.locationId, item.locationName || locationName);
      setCodesMessage("Codul a fost sters.");
    } catch (error) {
      console.error("Codul nu a putut fi sters:", error);
      setCodesError("Codul nu a putut fi sters. Verifica regulile Firebase.");
    }
  }

  return {
    codeGenerator,
    codesError,
    codesMessage,
    codesWorking,
    copyAccessCode,
    copyInviteLink,
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
    toggleAccessCodeActive,
    updateAccessCodeDetails,
  };
}
