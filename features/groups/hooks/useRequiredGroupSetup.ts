"use client";

import { useAppText } from "@/features/shell/hooks/useAppText";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { doc, setDoc, type Firestore } from "firebase/firestore";

import type { UserProfile, UserRole } from "@/context/AuthContext";
import type { RecordAuditLog } from "@/lib/audit";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import type { GroupItem, PersonalDraft, WriteTarget } from "@/lib/types/domain";

type UseRequiredGroupSetupParams = {
  db: Firestore;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isSuperAdmin: boolean;
  groups: GroupItem[];
  currentLocationId: string;
  locationName: string;
  requireOnline: (target?: WriteTarget) => boolean;
  recordAuditLog: RecordAuditLog;
  setPersonalDraft: Dispatch<SetStateAction<PersonalDraft>>;
  setGroupSetupError: (value: string) => void;
};

/**
 * The "choose your group" gate a non-super-admin must pass before using the app:
 * owns the draft / completed flags, derives `mustChooseGroup`, and writes the
 * chosen group (plus the role-appropriate room access) to the user doc.
 */
export function useRequiredGroupSetup({
  db,
  user,
  profile,
  role,
  isSuperAdmin,
  groups,
  currentLocationId,
  locationName,
  requireOnline,
  recordAuditLog,
  setPersonalDraft,
  setGroupSetupError,
}: UseRequiredGroupSetupParams) {
  const msg = useAppText();
  const [groupSetupDraft, setGroupSetupDraft] = useState("");
  const [groupSetupCompleted, setGroupSetupCompleted] = useState(false);

  const mustChooseGroup = useMemo(
    () => Boolean(user && profile && !isSuperAdmin && !profile.groupName.trim() && !groupSetupCompleted),
    [groupSetupCompleted, isSuperAdmin, profile, user]
  );

  async function saveRequiredGroup() {
    setGroupSetupError("");

    if (!requireOnline("group")) {
      return;
    }

    if (!user || !profile) {
      return;
    }

    if (!groupSetupDraft.trim()) {
      setGroupSetupError(msg("msg.chooseYourGroup"));
      return;
    }

    if (!currentLocationId) {
      setGroupSetupError(msg("msg.noLocationYet"));
      return;
    }

    if (!groups.some((group) => group.name === groupSetupDraft)) {
      setGroupSetupError(msg("msg.chooseExistingGroup"));
      return;
    }

    const requiredRoomAccess = role === "manager" ? "all" : normalizeRoomAccessMode(profile.roomAccess);
    const requiredAllowedRoomIds = requiredRoomAccess === "selected" ? normalizeAllowedRoomIds(profile.allowedRoomIds) : [];

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          displayName: profile.displayName,
          groupName: groupSetupDraft,
          role,
          locationId: profile.locationId,
          locationName: profile.locationName || locationName,
          roomAccess: requiredRoomAccess,
          allowedRoomIds: requiredAllowedRoomIds,
        },
        { merge: true }
      );
      await recordAuditLog(
        "user",
        "update",
        user.uid,
        profile,
        { groupName: groupSetupDraft, group: groupSetupDraft },
        profile.locationId,
        profile.locationName || locationName
      );
      setPersonalDraft((current) => ({ ...current, groupName: groupSetupDraft }));
      setGroupSetupCompleted(true);
    } catch (error) {
      console.error("Grupul nu a putut fi salvat:", error);
      setGroupSetupError(msg("msg.groupSaveFailed"));
    }
  }

  return {
    groupSetupDraft,
    setGroupSetupDraft,
    groupSetupCompleted,
    setGroupSetupCompleted,
    mustChooseGroup,
    saveRequiredGroup,
  };
}
