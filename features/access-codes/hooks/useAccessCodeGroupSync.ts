"use client";

// Dacă utilizatorul s-a înregistrat cu un cod de acces dar profilul nu are încă grup, preia grupul și accesul la camere din cod.
// Se rulează după conectare, doar online și doar pentru utilizatorii care nu sunt manageri.
import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import type { AppLanguage, UserProfile } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";

// Ciorna setărilor personale (doar câmpurile folosite aici).
type PersonalDraft = {
  displayName: string;
  groupName: string;
  language: AppLanguage;
  lockOnHide: boolean;
  notifyDayBefore: boolean;
  notifyFixedGroupSchedules: boolean;
  notifyGroupBookings: boolean;
  notifyOffsets: string[];
  notifyOffsetsDays: number[];
  notifyWeekBefore: boolean;
  useBiometrics: boolean;
  usePin: boolean;
};

// Parametrii: starea conexiunii, profilul și funcțiile care actualizează ciornele.
type UseAccessCodeGroupSyncParams = {
  isManager: boolean;
  isOnline: boolean;
  profile: UserProfile | null;
  setGroupSetupCompleted: Dispatch<SetStateAction<boolean>>;
  setGroupSetupDraft: Dispatch<SetStateAction<string>>;
  setPersonalDraft: Dispatch<SetStateAction<PersonalDraft>>;
  user: User | null;
};

// Hook-ul de sincronizare.
export function useAccessCodeGroupSync({
  isManager,
  isOnline,
  profile,
  setGroupSetupCompleted,
  setGroupSetupDraft,
  setPersonalDraft,
  user,
}: UseAccessCodeGroupSyncParams) {
  // Condiții: online, profil fără grup, cu un cod de acces asociat și utilizator care nu e manager.
  useEffect(() => {
    if (!isOnline || !user || !profile || isManager || profile.groupName.trim() || !profile.accessCodeId) {
      return;
    }

    let cancelled = false;

    // Citește codul, apoi scrie grupul și accesul la camere în profil (merge); abandonează dacă efectul s-a oprit între timp.
    getDoc(doc(db, "accessCodes", profile.accessCodeId))
      .then(async (snapshot) => {
        const codeData = snapshot.data() ?? {};
        const codeGroupName = String(codeData.groupName ?? "").trim();
        const roomAccess = normalizeRoomAccessMode(codeData.roomAccess);
        const allowedRoomIds = roomAccess === "selected" ? normalizeAllowedRoomIds(codeData.allowedRoomIds) : [];

        if (!snapshot.exists() || !codeGroupName || cancelled) {
          return;
        }

        await setDoc(doc(db, "users", user.uid), { groupName: codeGroupName, group: codeGroupName, roomAccess, allowedRoomIds }, { merge: true });

        if (!cancelled) {
          setGroupSetupDraft(codeGroupName);
          setPersonalDraft((current) => ({ ...current, groupName: codeGroupName }));
          setGroupSetupCompleted(true);
        }
      })
      .catch((error) => {
        console.warn("Grupul din codul de acces nu a putut fi sincronizat:", error);
      });

    // La oprirea efectului răspunsurile întârziate sunt ignorate.
    return () => {
      cancelled = true;
    };
  }, [
    isManager,
    isOnline,
    profile,
    setGroupSetupCompleted,
    setGroupSetupDraft,
    setPersonalDraft,
    user,
  ]);
}
