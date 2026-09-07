"use client";

import { deleteDoc, doc, updateDoc, type Firestore } from "firebase/firestore";

import type { UserRole } from "@/context/AuthContext";
import type { RecordAuditLog } from "@/lib/audit";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import type { ManagedUser, RoomAccessMode, RoomItem, WriteTarget } from "@/lib/types/domain";

type UseManagedUserActionsParams = {
  db: Firestore;
  managedUsers: ManagedUser[];
  rooms: RoomItem[];
  currentLocationId: string;
  locationName: string;
  canManageMembers: boolean;
  currentLocationManagerLimit: number;
  requireOnline: (target?: WriteTarget) => boolean;
  recordAuditLog: RecordAuditLog;
  setSettingsError: (value: string) => void;
  setSettingsMessage: (value: string) => void;
};

/**
 * Managed-user actions from the settings screen: change role, change room
 * access, remove account. Extracted verbatim from app/dashboard/page.tsx —
 * behaviour unchanged.
 */
export function useManagedUserActions({
  db,
  managedUsers,
  rooms,
  currentLocationId,
  locationName,
  canManageMembers,
  currentLocationManagerLimit,
  requireOnline,
  recordAuditLog,
  setSettingsError,
  setSettingsMessage,
}: UseManagedUserActionsParams) {
  async function updateManagedUserRole(managedUser: ManagedUser, nextRole: UserRole) {
    if (!canManageMembers || managedUser.isOwner || managedUser.locationId !== currentLocationId) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    if (!requireOnline("settings")) {
      return;
    }

    const otherSuperAdmins = managedUsers.filter(
      (item) =>
        item.locationId === currentLocationId &&
        item.role === "manager" &&
        !item.isOwner &&
        item.id !== managedUser.id
    ).length;

    if (nextRole === "manager" && otherSuperAdmins >= currentLocationManagerLimit) {
      setSettingsError(`Aceasta locatie poate avea maximum ${currentLocationManagerLimit} administratori.`);
      return;
    }

    try {
      const roomAccess = nextRole === "manager" ? "all" : managedUser.roomAccess;
      const allowedRoomIds = nextRole === "manager" || roomAccess === "all" ? [] : managedUser.allowedRoomIds;
      const updatedUser = {
        ...managedUser,
        role: nextRole,
        groupName: managedUser.groupName,
        roomAccess,
        allowedRoomIds,
      };
      await updateDoc(doc(db, "users", managedUser.id), {
        role: nextRole,
        groupName: managedUser.groupName,
        roomAccess,
        allowedRoomIds,
      });
      await recordAuditLog("user", "update", managedUser.id, managedUser, updatedUser, managedUser.locationId, managedUser.locationName || locationName);
      setSettingsMessage("Rolul a fost actualizat.");
    } catch (error) {
      console.error("Rolul nu a putut fi actualizat:", error);
      setSettingsError("Rolul nu a putut fi actualizat. Verifica regulile Firebase.");
    }
  }

  async function updateManagedUserRoomAccess(managedUser: ManagedUser, nextRoomAccess: RoomAccessMode, nextAllowedRoomIds: string[]) {
    if (!canManageMembers || managedUser.isOwner || managedUser.locationId !== currentLocationId) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    if (!requireOnline("settings")) {
      return;
    }

    const roomAccess = managedUser.role === "manager" ? "all" : normalizeRoomAccessMode(nextRoomAccess);
    const allowedRoomIds = roomAccess === "selected" ? normalizeAllowedRoomIds(nextAllowedRoomIds) : [];

    if (roomAccess === "selected" && allowedRoomIds.length === 0) {
      setSettingsError("Alege cel putin o sala sau lasa acces la toate salile.");
      return;
    }

    const validRoomIds = new Set(rooms.map((room) => room.id));

    if (allowedRoomIds.some((roomId) => !validRoomIds.has(roomId))) {
      setSettingsError("Una dintre salile alese nu mai exista.");
      return;
    }

    try {
      const updatedUser = {
        ...managedUser,
        roomAccess,
        allowedRoomIds,
      };
      await updateDoc(doc(db, "users", managedUser.id), {
        roomAccess,
        allowedRoomIds,
      });
      await recordAuditLog("user", "update", managedUser.id, managedUser, updatedUser, managedUser.locationId, managedUser.locationName || locationName);
      setSettingsMessage("Accesul la sali a fost actualizat.");
    } catch (error) {
      console.error("Accesul la sali nu a putut fi actualizat:", error);
      setSettingsError("Accesul la sali nu a putut fi actualizat. Verifica regulile Firebase.");
    }
  }

  async function removeManagedUser(managedUser: ManagedUser) {
    if (
      !canManageMembers ||
      managedUser.isOwner ||
      managedUser.locationId !== currentLocationId ||
      !requireOnline("settings") ||
      !confirm(`Stergi contul ${managedUser.email}?`)
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", managedUser.id));
      await recordAuditLog("user", "delete", managedUser.id, managedUser, null, managedUser.locationId, managedUser.locationName || locationName);
      setSettingsMessage("Contul a fost sters.");
    } catch (error) {
      console.error("Contul nu a putut fi sters:", error);
      setSettingsError("Contul nu a putut fi sters. Verifica regulile Firebase.");
    }
  }

  return { updateManagedUserRole, updateManagedUserRoomAccess, removeManagedUser };
}
