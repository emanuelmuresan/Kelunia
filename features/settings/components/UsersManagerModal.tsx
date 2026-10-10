"use client";

// Fereastra „Utilizatori” din Setări > Acces: tabelul utilizatorilor locației, cu schimbarea rolului, a grupului, a accesului la camere și ștergerea profilului.
// Proprietarul și propriul cont nu pot fi modificate; scrierile sunt făcute de useManagedUserActions.
import { useState } from "react";

import type { AppLanguage, UserRole } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import { roomAccessLabel } from "@/lib/room-access";
import type { GroupItem, ManagedUser, RoomAccessMode, RoomItem } from "@/lib/types/domain";

// Ciorna modificărilor unui utilizator: rol, grup și acces la camere.
type ManagedUserDraft = {
  role: UserRole;
  groupName: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
};

// Proprietățile ferestrei: utilizatorii, camerele, permisiunile și acțiunile.
type UsersManagerModalProps = {
  language: AppLanguage;
  managedUsers: ManagedUser[];
  currentUserId: string;
  rooms: RoomItem[];
  groups: GroupItem[];
  groupsLabel: string;
  canManageMembers: boolean;
  currentLocationId: string;
  onClose: () => void;
  onUpdateManagedUserRole: (managedUser: ManagedUser, role: UserRole) => void | Promise<void>;
  onUpdateManagedUserRoomAccess: (
    managedUser: ManagedUser,
    roomAccess: RoomAccessMode,
    allowedRoomIds: string[]
  ) => void | Promise<void>;
  onUpdateManagedUserGroup: (managedUser: ManagedUser, groupName: string) => void | Promise<void>;
  onRemoveManagedUser: (managedUser: ManagedUser) => void;
};

// Compară două liste de camere fără să țină cont de ordine.
function sameRoomIds(first: string[], second: string[]) {
  if (first.length !== second.length) {
    return false;
  }

  const firstSet = new Set(first);
  return second.every((item) => firstSet.has(item));
}

/** Per-location user table: change role / room access / remove account. */
// Componenta ferestrei.
export function UsersManagerModal({
  language,
  managedUsers,
  currentUserId,
  rooms,
  groups,
  groupsLabel,
  canManageMembers,
  currentLocationId,
  onClose,
  onUpdateManagedUserRole,
  onUpdateManagedUserRoomAccess,
  onUpdateManagedUserGroup,
  onRemoveManagedUser,
}: UsersManagerModalProps) {
  // Starea: ce utilizatori sunt în editare și ciornele lor.
  const t = (key: UiCopyKey) => appText(language, key);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, ManagedUserDraft>>({});

  // Ciorna unui utilizator (cea în editare sau valorile curente), deschiderea și închiderea editorului și schimbarea ciornei.
  function draftFor(managedUser: ManagedUser): ManagedUserDraft {
    return drafts[managedUser.id] ?? {
      role: managedUser.role,
      groupName: managedUser.groupName,
      roomAccess: managedUser.role === "manager" ? "all" : managedUser.roomAccess,
      allowedRoomIds: managedUser.role === "manager" ? [] : managedUser.allowedRoomIds,
    };
  }

  function openEditor(managedUser: ManagedUser) {
    setDrafts((current) => ({
      ...current,
      [managedUser.id]: {
        role: managedUser.role,
        groupName: managedUser.groupName,
        roomAccess: managedUser.role === "manager" ? "all" : managedUser.roomAccess,
        allowedRoomIds: managedUser.role === "manager" ? [] : managedUser.allowedRoomIds,
      },
    }));
    setEditing((current) => ({ ...current, [managedUser.id]: true }));
  }

  function closeEditor(userId: string) {
    setEditing((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
  }

  function setDraft(managedUser: ManagedUser, nextDraft: ManagedUserDraft) {
    setDrafts((current) => ({ ...current, [managedUser.id]: nextDraft }));
  }

  // Salvează: întâi schimbă rolul (cu confirmările din hook), apoi accesul la camere dacă s-a modificat.
  async function saveEditor(managedUser: ManagedUser) {
    const draft = draftFor(managedUser);
    const nextRoomAccess = draft.role === "manager" ? "all" : draft.roomAccess;
    const nextAllowedRoomIds = nextRoomAccess === "selected" ? draft.allowedRoomIds : [];

    if (draft.role !== managedUser.role) {
      await onUpdateManagedUserRole(managedUser, draft.role);
    }

    if (
      draft.role === managedUser.role &&
      (nextRoomAccess !== managedUser.roomAccess || !sameRoomIds(nextAllowedRoomIds, managedUser.allowedRoomIds))
    ) {
      await onUpdateManagedUserRoomAccess(managedUser, nextRoomAccess, nextAllowedRoomIds);
    }

    if (draft.role !== managedUser.role && draft.role !== "manager") {
      await onUpdateManagedUserRoomAccess({ ...managedUser, role: draft.role }, nextRoomAccess, nextAllowedRoomIds);
    }

    // Grupul se schimbă la final, după rol, ca rolul nou să nu rescrie grupul vechi; administratorii nu au grup.
    if (draft.role !== "manager" && draft.groupName !== managedUser.groupName) {
      await onUpdateManagedUserGroup({ ...managedUser, role: draft.role }, draft.groupName);
    }

    closeEditor(managedUser.id);
  }

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card manager-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="users-manager-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Antetul ferestrei, cu numărul de utilizatori. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">{t("settings.users")}</span>
            <h2 id="users-manager-title">{t("settings.usersCount").replace("{{count}}", String(managedUsers.length))}</h2>
          </div>
        </div>

        {/* Tabelul utilizatorilor. */}
        <div className="users-table">
          {managedUsers.map((managedUser) => {
            const userDraft = draftFor(managedUser);
            const isEditingUser = Boolean(editing[managedUser.id]);
            const draftRole = isEditingUser ? userDraft.role : managedUser.role;
            const draftRoomAccess = draftRole === "manager" ? "all" : userDraft.roomAccess;
            const draftAllowedRoomIds = draftRoomAccess === "selected" ? userDraft.allowedRoomIds : [];
            const userDraftChanged =
              draftRole !== managedUser.role ||
              (draftRole !== "manager" && userDraft.groupName !== managedUser.groupName) ||
              draftRoomAccess !== managedUser.roomAccess ||
              !sameRoomIds(draftAllowedRoomIds, managedUser.allowedRoomIds);
            const accessDisabled =
              !isEditingUser ||
              managedUser.isOwner ||
              draftRole === "manager" ||
              !canManageMembers ||
              managedUser.locationId !== currentLocationId;
            const isSelf = managedUser.id === currentUserId;
            const canEditManagedUser =
              !managedUser.isOwner &&
              !isSelf &&
              canManageMembers &&
              managedUser.locationId === currentLocationId;

            // Un rând pe utilizator: date, rol și acces la camere (editabile doar în modul de editare), plus acțiunile.
            return (
              <div className="user-row" key={managedUser.id}>
                <div>
                  <strong>{managedUser.displayName || managedUser.email}</strong>
                  <span>
                    {managedUser.email} · {managedUser.locationName || t("settings.notSet")} · {managedUser.groupName || t("settings.notChosen")}
                  </span>
                  {isSelf && <small className="user-self-note">{t("settings.selfRoleLocked")}</small>}

                  {/* Grupul: se alege dintre grupurile locației (nu pentru administratori). */}
                  {isEditingUser && draftRole !== "manager" && (
                    <label className="user-group-edit">
                      <small>{groupsLabel}</small>
                      <select
                        value={userDraft.groupName}
                        onChange={(event) => setDraft(managedUser, { ...userDraft, groupName: event.target.value })}
                      >
                        {userDraft.groupName && !groups.some((group) => group.name === userDraft.groupName) && (
                          <option value={userDraft.groupName}>{userDraft.groupName}</option>
                        )}
                        {!userDraft.groupName && <option value="">{t("settings.notChosen")}</option>}
                        {groups.map((group) => (
                          <option key={group.id} value={group.name}>{group.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <select
                  value={draftRole}
                  onChange={(event) => {
                    const nextRole = event.target.value as UserRole;
                    setDraft(managedUser, {
                      role: nextRole,
                      groupName: userDraft.groupName,
                      roomAccess: nextRole === "manager" ? "all" : managedUser.roomAccess,
                      allowedRoomIds: nextRole === "manager" || managedUser.roomAccess === "all" ? [] : managedUser.allowedRoomIds,
                    });
                  }}
                  disabled={
                    !isEditingUser ||
                    isSelf ||
                    managedUser.isOwner ||
                    !canManageMembers ||
                    managedUser.locationId !== currentLocationId
                  }
                >
                  <option value="guest">{t("role.guest")}</option>
                  <option value="member">{t("role.collaborator")}</option>
                  <option value="manager">{t("role.administrator")}</option>
                </select>

                <div className="user-room-access">
                  <select
                    value={draftRoomAccess}
                    onChange={(event) => {
                      const nextRoomAccess = event.target.value as RoomAccessMode;

                      if (nextRoomAccess === "all") {
                        setDraft(managedUser, { ...userDraft, roomAccess: "all", allowedRoomIds: [] });
                        return;
                      }

                      setDraft(managedUser, {
                        ...userDraft,
                        roomAccess: "selected",
                        allowedRoomIds: managedUser.allowedRoomIds,
                      });
                    }}
                    disabled={accessDisabled}
                  >
                    <option value="all">{t("settings.roomsAll")}</option>
                    <option value="selected">{t("settings.roomsSelected")}</option>
                  </select>

                  {draftRole !== "manager" && draftRoomAccess === "selected" && (
                    <div className="room-check-grid user-room-check-grid">
                      {rooms.length === 0 ? (
                        <p className="empty-line">{t("settings.noItems")}</p>
                      ) : (
                        rooms.map((room) => (
                          <label className="toggle-row compact-toggle" key={room.id}>
                            <input
                              type="checkbox"
                              checked={draftAllowedRoomIds.includes(room.id)}
                              disabled={accessDisabled}
                              onChange={(event) => {
                                const allowedRoomIds = event.target.checked
                                  ? [...draftAllowedRoomIds, room.id]
                                  : draftAllowedRoomIds.filter((roomId) => roomId !== room.id);
                                setDraft(managedUser, { ...userDraft, roomAccess: "selected", allowedRoomIds });
                              }}
                            />
                            {room.name}
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  <small>{roomAccessLabel({ ...managedUser, roomAccess: draftRoomAccess, allowedRoomIds: draftAllowedRoomIds }, rooms)}</small>
                </div>

                <div className="row-actions">
                  {isEditingUser ? (
                    <>
                      <button className="secondary-button compact" onClick={() => closeEditor(managedUser.id)} type="button">
                        {t("action.cancel")}
                      </button>
                      <button
                        className="primary-button compact"
                        disabled={!userDraftChanged || (draftRoomAccess === "selected" && draftAllowedRoomIds.length === 0)}
                        onClick={() => saveEditor(managedUser)}
                        type="button"
                      >
                        {t("action.save")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="secondary-button compact" disabled={!canEditManagedUser} onClick={() => openEditor(managedUser)} type="button">
                        {t("settings.edit")}
                      </button>
                      <button
                        className="secondary-button compact danger-button"
                        disabled={!canEditManagedUser}
                        onClick={() => onRemoveManagedUser(managedUser)}
                        type="button"
                      >
                        {t("action.delete")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Închiderea ferestrei. */}
        <div className="modal-actions">
          <button className="primary-button" onClick={onClose} type="button">
            {t("action.done")}
          </button>
        </div>
      </section>
    </div>
  );
}
