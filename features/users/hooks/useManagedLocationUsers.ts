"use client";

// Citește în timp real utilizatorii și codurile de acces ale unei locații, doar pentru manageri și proprietar.
import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";

import { normalizeAccessCode, normalizeRole } from "@/lib/access-codes";
import { defaultLocationName } from "@/lib/config/app";
import { db } from "@/lib/firebase";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import {
  accessCodesQueryLimit,
  buildLocationAccessCodesQuery,
  buildLocationUsersQuery,
  locationUsersQueryLimit,
} from "@/lib/queries/location";
import { isSoftDeleted } from "@/lib/soft-delete";
import type { LocationCode, ManagedUser } from "@/lib/types/domain";

// Parametrii: dacă utilizatorul poate gestiona locația și locația curentă.
type UseManagedLocationUsersParams = {
  isManager: boolean;
  locationId: string;
};

// Hook-ul listelor.
export function useManagedLocationUsers({
  isManager,
  locationId,
}: UseManagedLocationUsersParams) {
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [accessCodes, setAccessCodes] = useState<LocationCode[]>([]);

  // Fără drept de gestionare sau fără locație listele sunt goale; altfel urmărește utilizatorii (maximum 300) și codurile (maximum 200).
  useEffect(() => {
    if (!isManager || !locationId) {
      setManagedUsers([]);
      setAccessCodes([]);
      return;
    }

    const unsubUsers = onSnapshot(
      buildLocationUsersQuery(db, locationId),
      (snapshot) => {
        setManagedUsers(
          snapshot.docs.map((item) => {
            const data = item.data();
            return {
              id: item.id,
              email: String(data.email ?? ""),
              displayName: String(data.displayName ?? data.name ?? ""),
              groupName: String(data.groupName ?? data.group ?? ""),
              role: normalizeRole(data.role),
              isOwner: Boolean(data.isOwner),
              locationId: String(data.locationId ?? "main-location"),
              locationName: String(data.locationName ?? defaultLocationName),
              roomAccess: normalizeRoomAccessMode(data.roomAccess),
              allowedRoomIds: normalizeAllowedRoomIds(data.allowedRoomIds),
            };
          })
        );

        if (snapshot.docs.length >= locationUsersQueryLimit) {
          console.warn("Lista de utilizatori a atins limita de citire. Va fi nevoie de paginare avansata pentru aceasta locatie.");
        }
      },
      (error) => {
        console.warn("Utilizatorii nu au putut fi cititi:", error);
        setManagedUsers([]);
      }
    );

    // Codurile de acces, fără cele șterse logic, ordonate după rol și cod.
    const unsubCodes = onSnapshot(
      buildLocationAccessCodesQuery(db, locationId),
      (snapshot) => {
        setAccessCodes(
          snapshot.docs
            .filter((item) => !isSoftDeleted(item.data()))
            .map((item) => normalizeAccessCode(item.id, item.data()))
            .sort((a, b) => a.role.localeCompare(b.role) || a.code.localeCompare(b.code))
        );

        if (snapshot.docs.length >= accessCodesQueryLimit) {
          console.warn("Lista de coduri a atins limita de citire. Genereaza coduri noi doar cand este nevoie.");
        }
      },
      (error) => {
        console.warn("Codurile de acces nu au putut fi citite:", error);
        setAccessCodes([]);
      }
    );

    return () => {
      unsubUsers();
      unsubCodes();
    };
  }, [isManager, locationId]);

  return {
    accessCodes,
    managedUsers,
  };
}
