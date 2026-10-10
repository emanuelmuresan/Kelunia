"use client";

// Acțiuni asupra utilizatorilor locației din Setări: schimbarea rolului, a grupului, accesul la camere și ștergerea completă a contului.
// Proprietarul și propriul cont nu pot fi modificate de aici; fiecare acțiune cere drepturi și rețea, iar cele riscante cer confirmare.
import { useAuth } from "@/context/AuthContext";
import { useAppText } from "@/features/shell/hooks/useAppText";
import { useConfirm } from "@/features/shell/components/ConfirmDialog";
import { doc, updateDoc, type Firestore } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { cloudFunctions } from "@/lib/firebase";

import type { UserRole } from "@/context/AuthContext";
import type { RecordAuditLog } from "@/lib/audit";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import type { GroupItem, ManagedUser, RoomAccessMode, RoomItem, WriteTarget } from "@/lib/types/domain";

// Parametrii: utilizatorii, camerele, limita de manageri și funcțiile din dashboard.
type UseManagedUserActionsParams = {
  db: Firestore;
  managedUsers: ManagedUser[];
  rooms: RoomItem[];
  groups: GroupItem[];
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
// Hook-ul acțiunilor.
export function useManagedUserActions({
  db,
  managedUsers,
  rooms,
  groups,
  currentLocationId,
  locationName,
  canManageMembers,
  currentLocationManagerLimit,
  requireOnline,
  recordAuditLog,
  setSettingsError,
  setSettingsMessage,
}: UseManagedUserActionsParams) {
  const confirmAction = useConfirm();
  const msg = useAppText();
  const { user } = useAuth();

  // Schimbă rolul unui utilizator: blochează auto-retrogradarea, cere confirmare la retrogradarea unui manager și respectă limita de manageri a planului.
  async function updateManagedUserRole(managedUser: ManagedUser, nextRole: UserRole) {
    if (!canManageMembers || managedUser.isOwner || managedUser.locationId !== currentLocationId) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    // An administrator who demotes themselves would lock themselves out; only
    // another administrator may change their role (firestore.rules agree).
    if (managedUser.id === user?.uid) {
      setSettingsError(msg("msg.selfRoleChange"));
      return;
    }

    if (!requireOnline("settings")) {
      return;
    }

    if (managedUser.role === "manager" && nextRole !== "manager") {
      const confirmed = await confirmAction({
        message: msg("msg.confirmDemoteAdmin", { name: managedUser.displayName || managedUser.email }),
        confirmLabel: msg("msg.demoteAction"),
        tone: "danger",
      });

      if (!confirmed) {
        return;
      }
    }

    const otherSuperAdmins = managedUsers.filter(
      (item) =>
        item.locationId === currentLocationId &&
        item.role === "manager" &&
        !item.isOwner &&
        item.id !== managedUser.id
    ).length;

    if (nextRole === "manager" && otherSuperAdmins >= currentLocationManagerLimit) {
      setSettingsError(msg("msg.managerLimitMax", { count: currentLocationManagerLimit }));
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
      setSettingsMessage(msg("msg.roleUpdated"));
    } catch (error) {
      console.error("Rolul nu a putut fi actualizat:", error);
      setSettingsError(msg("msg.roleUpdateFailed"));
    }
  }

  // Schimbă accesul la camere: toate sau doar cele alese; managerii au mereu acces la toate.
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
      setSettingsError(msg("msg.chooseRoomOrAll"));
      return;
    }

    const validRoomIds = new Set(rooms.map((room) => room.id));

    if (allowedRoomIds.some((roomId) => !validRoomIds.has(roomId))) {
      setSettingsError(msg("msg.roomNoLongerExists"));
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
      setSettingsMessage(msg("msg.roomAccessUpdated"));
    } catch (error) {
      console.error("Accesul la sali nu a putut fi actualizat:", error);
      setSettingsError(msg("msg.roomAccessUpdateFailed"));
    }
  }

  // Mută un utilizator în alt grup al locației. Administratorii pot și să nu aibă grup; ceilalți trebuie să aibă unul.
  // Rezervările lui viitoare se fac pentru noul grup.
  async function updateManagedUserGroup(managedUser: ManagedUser, nextGroupName: string) {
    if (!canManageMembers || managedUser.isOwner || managedUser.locationId !== currentLocationId) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    if (!requireOnline("settings")) {
      return;
    }

    const groupName = nextGroupName.trim();

    if (!(groupName === "" && managedUser.role === "manager") && !groups.some((group) => group.name === groupName)) {
      setSettingsError(msg("msg.groupNoLongerExists"));
      return;
    }

    try {
      const updatedUser = { ...managedUser, groupName };
      await updateDoc(doc(db, "users", managedUser.id), { groupName, group: groupName });
      await recordAuditLog("user", "update", managedUser.id, managedUser, updatedUser, managedUser.locationId, managedUser.locationName || locationName);
      setSettingsMessage(msg("msg.groupUpdated"));
    } catch (error) {
      console.error("Grupul nu a putut fi actualizat:", error);
      setSettingsError(msg("msg.groupUpdateFailed"));
    }
  }

  // Șterge complet contul unui utilizator, după o confirmare cu avertisment, prin funcția cloud removeLocationUser: profil, cont Firebase Auth și jetoane push.
  // Nu poate șterge propriul cont; după ștergere emailul poate fi folosit din nou.
  async function removeManagedUser(managedUser: ManagedUser) {
    if (
      !canManageMembers ||
      managedUser.isOwner ||
      managedUser.locationId !== currentLocationId ||
      !requireOnline("settings")
    ) {
      return;
    }

    if (managedUser.id === user?.uid) {
      setSettingsError(msg("msg.cannotRemoveSelf"));
      return;
    }

    const confirmed = await confirmAction({
      message: msg("msg.confirmDeleteAccount", { email: managedUser.email }),
      confirmLabel: msg("settings.deleteAccount"),
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      // Funcția cloud șterge profilul, contul de autentificare și jetoanele; emailul poate fi folosit din nou.
      await httpsCallable(cloudFunctions, "removeLocationUser")({ userId: managedUser.id });
      await recordAuditLog("user", "delete", managedUser.id, managedUser, null, managedUser.locationId, managedUser.locationName || locationName);
      setSettingsMessage(msg("msg.accountDeleted"));
    } catch (error) {
      console.error("Contul nu a putut fi sters:", error);
      setSettingsError(msg("msg.accountDeleteFailed"));
    }
  }

  // Acțiunile expuse dashboard-ului.
  return { updateManagedUserRole, updateManagedUserGroup, updateManagedUserRoomAccess, removeManagedUser };
}
