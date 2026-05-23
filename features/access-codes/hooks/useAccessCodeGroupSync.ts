"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import type { UserProfile } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";

type PersonalDraft = {
  displayName: string;
  groupName: string;
  language: string;
  lockOnHide: boolean;
  notifyDayBefore: boolean;
  notifyGroupBookings: boolean;
  notifyOffsetsDays: number[];
  notifyWeekBefore: boolean;
  useBiometrics: boolean;
  usePin: boolean;
};

type UseAccessCodeGroupSyncParams = {
  isManager: boolean;
  isOnline: boolean;
  profile: UserProfile | null;
  setGroupSetupCompleted: Dispatch<SetStateAction<boolean>>;
  setGroupSetupDraft: Dispatch<SetStateAction<string>>;
  setPersonalDraft: Dispatch<SetStateAction<PersonalDraft>>;
  user: User | null;
};

export function useAccessCodeGroupSync({
  isManager,
  isOnline,
  profile,
  setGroupSetupCompleted,
  setGroupSetupDraft,
  setPersonalDraft,
  user,
}: UseAccessCodeGroupSyncParams) {
  useEffect(() => {
    if (!isOnline || !user || !profile || isManager || profile.groupName.trim() || !profile.accessCodeId) {
      return;
    }

    let cancelled = false;

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
