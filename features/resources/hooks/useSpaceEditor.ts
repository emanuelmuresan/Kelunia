"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, deleteField, doc, Timestamp, updateDoc, type Firestore } from "firebase/firestore";

import type { RecordAuditLog } from "@/lib/audit";
import { dateKey } from "@/lib/dates";
import { normalizeGroupColor } from "@/lib/group-colors";
import { readActiveUntil } from "@/lib/space-expiry";
import { updateLocationCounterSafely } from "@/lib/usage-counters";
import type { GroupItem, RoomItem, SpaceEditor, SpaceKind, WriteTarget } from "@/lib/types/domain";

type UseSpaceEditorParams = {
  db: Firestore;
  user: User | null;
  rooms: RoomItem[];
  groups: GroupItem[];
  currentLocationId: string;
  locationName: string;
  canEditCurrentLocation: boolean;
  requireOnline: (target?: WriteTarget) => boolean;
  softDeletePayload: () => Record<string, unknown>;
  recordAuditLog: RecordAuditLog;
  pushToast: (input: { message: string; actionLabel?: string; onAction?: () => void | Promise<void>; tone?: "default" | "error" }) => string;
  setSettingsError: (value: string) => void;
  setSettingsMessage: (value: string) => void;
};

/**
 * Rooms/groups editor: open/save/soft-delete a room or a group from the settings
 * screen. Extracted verbatim from app/dashboard/page.tsx — behaviour unchanged.
 */
export function useSpaceEditor({
  db,
  user,
  rooms,
  groups,
  currentLocationId,
  locationName,
  canEditCurrentLocation,
  requireOnline,
  softDeletePayload,
  recordAuditLog,
  pushToast,
  setSettingsError,
  setSettingsMessage,
}: UseSpaceEditorParams) {
  const [spaceEditor, setSpaceEditor] = useState<SpaceEditor | null>(null);
  const [spaceError, setSpaceError] = useState("");

  function openSpaceEditor(kind: SpaceKind, item?: RoomItem | GroupItem) {
    if (!canEditCurrentLocation) {
      return;
    }

    setSpaceEditor({
      kind,
      id: item?.id ?? null,
      name: item?.name ?? "",
      color: kind === "group" ? normalizeGroupColor((item as GroupItem | undefined)?.color) : "",
      activeUntil: readActiveUntil(item?.activeUntil) ?? "",
    });
    setSpaceError("");
    setSettingsError("");
    setSettingsMessage("");
  }

  async function saveSpaceItem() {
    if (!canEditCurrentLocation || !spaceEditor) {
      return;
    }

    if (!requireOnline("space")) {
      return;
    }

    const name = spaceEditor.name.trim();
    const collectionName = spaceEditor.kind === "room" ? "rooms" : "groups";
    const label = spaceEditor.kind === "room" ? "Sala" : "Grupul";

    if (!name) {
      setSpaceError(spaceEditor.kind === "room" ? "Scrie numele sălii." : "Scrie numele grupului.");
      return;
    }

    const activeUntil = spaceEditor.activeUntil?.trim() ?? "";

    if (activeUntil && !readActiveUntil(activeUntil)) {
      setSpaceError("Alege o dată validă pentru perioada provizorie.");
      return;
    }

    const unchangedActiveUntil = spaceEditor.id
      ? (spaceEditor.kind === "room" ? rooms : groups).find((item) => item.id === spaceEditor.id)?.activeUntil === activeUntil
      : false;

    if (activeUntil && !unchangedActiveUntil && activeUntil < dateKey(new Date())) {
      setSpaceError("Data limită nu poate fi în trecut.");
      return;
    }

    setSettingsError("");
    setSpaceError("");

    try {
      const previousItem = spaceEditor.id
        ? (spaceEditor.kind === "room" ? rooms : groups).find((item) => item.id === spaceEditor.id) ?? null
        : null;
      const payload = {
        name,
        locationId: currentLocationId,
        locationName,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
        ...(spaceEditor.kind === "group" ? { color: normalizeGroupColor(spaceEditor.color) } : {}),
      };

      if (spaceEditor.id) {
        await updateDoc(doc(db, collectionName, spaceEditor.id), {
          ...payload,
          activeUntil: activeUntil || deleteField(),
        });
        await recordAuditLog(spaceEditor.kind, "update", spaceEditor.id, previousItem, { ...payload, activeUntil: activeUntil || null });
      } else {
        const createdPayload = {
          ...payload,
          ...(activeUntil ? { activeUntil } : {}),
          createdBy: user?.email ?? "",
          createdAt: Timestamp.now(),
          deleted: false,
        };
        const created = await addDoc(collection(db, collectionName), createdPayload);
        await updateLocationCounterSafely(db, currentLocationId, spaceEditor.kind === "room" ? "roomCount" : "groupCount", 1);
        await recordAuditLog(spaceEditor.kind, "create", created.id, null, createdPayload);
      }

      setSpaceEditor(null);
      setSettingsMessage(
        spaceEditor.kind === "room"
          ? `Sala a fost ${spaceEditor.id ? "actualizată" : "adăugată"}.`
          : `Grupul a fost ${spaceEditor.id ? "actualizat" : "adăugat"}.`
      );
    } catch (error) {
      console.error(`${label} nu a putut fi salvată:`, error);
      setSpaceError("Firebase nu permite încă această modificare. Actualizează regulile Firestore pentru administrator.");
    }
  }

  async function removeSpaceItem(kind: SpaceKind, itemId: string) {
    const collectionName = kind === "room" ? "rooms" : "groups";

    if (!canEditCurrentLocation || !requireOnline("settings")) {
      return;
    }

    setSettingsError("");

    try {
      const previousItem = (kind === "room" ? rooms : groups).find((item) => item.id === itemId) ?? null;
      const deletedPayload = softDeletePayload();
      await updateDoc(doc(db, collectionName, itemId), deletedPayload);
      await updateLocationCounterSafely(db, currentLocationId, kind === "room" ? "roomCount" : "groupCount", -1);
      await recordAuditLog(kind, "delete", itemId, previousItem, previousItem ? { ...previousItem, ...deletedPayload } : deletedPayload);
      pushToast({
        message: kind === "room" ? "Sala a fost ștearsă" : "Grupul a fost șters",
        actionLabel: "Anulează",
        onAction: () => restoreSpaceItem(kind, itemId),
      });
    } catch (error) {
      console.error("Elementul nu a putut fi șters:", error);
      setSettingsError("Firebase nu permite încă ștergerea. Actualizează regulile Firestore pentru administrator.");
    }
  }

  async function restoreSpaceItem(kind: SpaceKind, itemId: string) {
    const collectionName = kind === "room" ? "rooms" : "groups";

    try {
      await updateDoc(doc(db, collectionName, itemId), {
        deleted: false,
        deletedAt: null,
        deletedBy: "",
        deletedByUid: "",
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      });
      await updateLocationCounterSafely(db, currentLocationId, kind === "room" ? "roomCount" : "groupCount", 1);
    } catch (error) {
      console.error("Anularea ștergerii nu a reușit:", error);
      setSettingsError("Anularea ștergerii nu a reușit. Reîncarcă și încearcă din nou.");
    }
  }

  return {
    spaceEditor,
    spaceError,
    setSpaceEditor,
    setSpaceError,
    openSpaceEditor,
    saveSpaceItem,
    removeSpaceItem,
  };
}
