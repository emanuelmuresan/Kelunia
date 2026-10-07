"use client";

// Alegerea obligatorie a grupului: un utilizator care nu e manager nu intră în aplicație până nu alege un grup din locația lui.
import { useAppText } from "@/features/shell/hooks/useAppText";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { doc, setDoc, type Firestore } from "firebase/firestore";

import type { UserProfile, UserRole } from "@/context/AuthContext";
import type { RecordAuditLog } from "@/lib/audit";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import type { GroupItem, PersonalDraft, WriteTarget } from "@/lib/types/domain";

// Parametrii: utilizatorul, profilul, grupurile locației și funcțiile din dashboard.
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
  // Starea: grupul ales și dacă alegerea a fost deja făcută.
  const msg = useAppText();
  const [groupSetupDraft, setGroupSetupDraft] = useState("");
  const [groupSetupCompleted, setGroupSetupCompleted] = useState(false);

  // Ecranul de alegere se afișează doar dacă utilizatorul nu e manager, nu are grup și nu l-a ales deja.
  const mustChooseGroup = useMemo(
    () => Boolean(user && profile && !isSuperAdmin && !profile.groupName.trim() && !groupSetupCompleted),
    [groupSetupCompleted, isSuperAdmin, profile, user]
  );

  // Salvează grupul ales în profil (cu merge), scrie în audit și actualizează ciorna setărilor personale.
  // Validări: conexiune, locație existentă și grup care există în lista locației.
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

    // Accesul la camere se păstrează din profil (managerii au mereu acces la toate).
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

  // Starea și acțiunile expuse dashboard-ului.
  return {
    groupSetupDraft,
    setGroupSetupDraft,
    groupSetupCompleted,
    setGroupSetupCompleted,
    mustChooseGroup,
    saveRequiredGroup,
  };
}
