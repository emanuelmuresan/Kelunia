"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserRole } from "@/context/AuthContext";
import type { AccessInviteDraft, CodeGeneratorState } from "@/features/access-codes/hooks/useAccessCodes";
import { roomAccessLabel } from "@/lib/room-access";
import type { GroupItem, LocationCode, LocationItem, RoomAccessMode, RoomItem } from "@/lib/types/domain";

interface AccessCodesModalProps {
  open: boolean;
  codeGenerator: CodeGeneratorState;
  groups: GroupItem[];
  rooms: RoomItem[];
  editableCodeLocations: Pick<LocationItem, "id" | "name">[];
  accessCodes: LocationCode[];
  codesWorking: boolean;
  codesError: string;
  codesMessage: string;
  inviteDraft: AccessInviteDraft | null;
  onClose: () => void;
  onCodeGeneratorChange: (nextGenerator: CodeGeneratorState) => void;
  onInviteDraftChange: (nextDraft: AccessInviteDraft | null) => void;
  onGenerate: () => void;
  onUpdateDetails: (
    item: LocationCode,
    nextRole: UserRole,
    nextGroupName: string,
    nextRoomAccess?: RoomAccessMode,
    nextAllowedRoomIds?: string[]
  ) => void | Promise<void>;
  onCopy: (code: string) => void;
  onToggleActive: (item: LocationCode) => void;
  onRemove: (item: LocationCode) => void;
  accessCodeUsageLabel: (item: LocationCode) => string;
  isAccessCodeFull: (item: LocationCode) => boolean;
  onCopyInviteLink: (code: string) => void;
  onSendInvite: (item: LocationCode) => void;
  onSendInviteEmail: () => void;
}

type AccessCodeDraft = {
  role: UserRole;
  groupName: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
};

export function AccessCodesModal({
  open,
  codeGenerator,
  groups,
  rooms,
  editableCodeLocations,
  accessCodes,
  codesWorking,
  codesError,
  codesMessage,
  inviteDraft,
  onClose,
  onCodeGeneratorChange,
  onInviteDraftChange,
  onGenerate,
  onUpdateDetails,
  onCopy,
  onToggleActive,
  onRemove,
  accessCodeUsageLabel,
  isAccessCodeFull,
  onCopyInviteLink,
  onSendInvite,
  onSendInviteEmail,
}: AccessCodesModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupFilter, setGroupFilter] = useState("all");
  const [editingCodeIds, setEditingCodeIds] = useState<Record<string, boolean>>({});
  const [codeDrafts, setCodeDrafts] = useState<Record<string, AccessCodeDraft>>({});

  useEffect(() => {
    if (!open) {
      setShowCreateForm(false);
      setGroupFilter("all");
      setEditingCodeIds({});
      setCodeDrafts({});
    }
  }, [open]);

  const visibleAccessCodes = useMemo(() => {
    if (groupFilter === "all") {
      return accessCodes;
    }

    if (groupFilter === "__manager__") {
      return accessCodes.filter((item) => item.role === "manager");
    }

    if (groupFilter === "__without_group__") {
      return accessCodes.filter((item) => item.role !== "manager" && !item.groupName.trim());
    }

    return accessCodes.filter((item) => item.groupName === groupFilter);
  }, [accessCodes, groupFilter]);

  function codeDraftFor(item: LocationCode): AccessCodeDraft {
    return codeDrafts[item.id] ?? {
      role: item.role,
      groupName: item.groupName || "",
      roomAccess: item.role === "manager" ? "all" : item.roomAccess,
      allowedRoomIds: item.role === "manager" ? [] : item.allowedRoomIds,
    };
  }

  function openCodeEditor(item: LocationCode) {
    setCodeDrafts((current) => ({
      ...current,
      [item.id]: {
        role: item.role,
        groupName: item.groupName || "",
        roomAccess: item.role === "manager" ? "all" : item.roomAccess,
        allowedRoomIds: item.role === "manager" ? [] : item.allowedRoomIds,
      },
    }));
    setEditingCodeIds((current) => ({ ...current, [item.id]: true }));
  }

  function closeCodeEditor(itemId: string) {
    setEditingCodeIds((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setCodeDrafts((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }

  function setCodeDraft(item: LocationCode, nextDraft: AccessCodeDraft) {
    setCodeDrafts((current) => ({ ...current, [item.id]: nextDraft }));
  }

  function sameRoomIds(first: string[], second: string[]) {
    if (first.length !== second.length) {
      return false;
    }

    const firstSet = new Set(first);
    return second.every((item) => firstSet.has(item));
  }

  async function saveCodeEditor(item: LocationCode) {
    const draft = codeDraftFor(item);
    const nextRoomAccess = draft.role === "manager" ? "all" : draft.roomAccess;
    const nextAllowedRoomIds = nextRoomAccess === "selected" ? draft.allowedRoomIds : [];

    await onUpdateDetails(
      item,
      draft.role,
      draft.role === "manager" ? "" : draft.groupName,
      nextRoomAccess,
      nextAllowedRoomIds
    );
    closeCodeEditor(item.id);
  }

  if (!open) {
    return null;
  }

  return (
    <>
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card manager-card" role="dialog" aria-modal="true" aria-label="Coduri de acces">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Acces</span>
            <h2>Coduri de acces</h2>
          </div>
        </div>

        <div className="code-toolbar">
          <label>
            Filtreaza dupa grup
            <select className="code-filter-select" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              <option value="all">Toate codurile</option>
              <option value="__manager__">Manageri</option>
              <option value="__without_group__">Fara grup</option>
              {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
            </select>
          </label>

          <button className="primary-button compact" onClick={() => setShowCreateForm((current) => !current)} type="button">
            {showCreateForm ? "Inchide" : "Cod nou"}
          </button>
        </div>

        <p className="muted-note">
          Opreste pastreaza codul in istoric, dar nu mai poate fi folosit. Sterge il ascunde din lista activa si il scoate din evidenta curenta.
        </p>

        {showCreateForm && (
          <div className="code-create-panel">
            <div className="mini-section-head">
              <h3>Genereaza cod</h3>
            </div>
            <div className="code-add-grid">
              <select
                value={codeGenerator.role}
                onChange={(event) => {
                  const nextRole = event.target.value as UserRole | "";
                  onCodeGeneratorChange({
                    ...codeGenerator,
                    role: nextRole,
                    groupName: "",
                    roomAccess: "all",
                    allowedRoomIds: [],
                  });
                }}
              >
                <option value="">Alege rolul</option>
                <option value="guest">Oaspete</option>
                <option value="member">Membru</option>
                <option value="manager">Manager</option>
              </select>
              <select
                value={codeGenerator.groupName}
                onChange={(event) => onCodeGeneratorChange({ ...codeGenerator, groupName: event.target.value })}
                disabled={!codeGenerator.role || codeGenerator.role === "manager"}
              >
                <option value="">{codeGenerator.role === "manager" ? "Fara grup" : "Alege grupul"}</option>
                {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
              </select>
              <select
                value={codeGenerator.locationId}
                onChange={(event) => onCodeGeneratorChange({ ...codeGenerator, locationId: event.target.value })}
              >
                <option value="">Alege locatia</option>
                {editableCodeLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <input
                type="email"
                value={codeGenerator.inviteEmail}
                onChange={(event) => onCodeGeneratorChange({ ...codeGenerator, inviteEmail: event.target.value })}
                placeholder="email pentru invitatie - optional"
              />
              <select
                value={codeGenerator.roomAccess}
                onChange={(event) =>
                  onCodeGeneratorChange({
                    ...codeGenerator,
                    roomAccess: event.target.value as RoomAccessMode,
                    allowedRoomIds: [],
                  })
                }
                disabled={!codeGenerator.role || codeGenerator.role === "manager"}
              >
                <option value="all">Toate salile</option>
                <option value="selected">Doar sali alese</option>
              </select>
              {codeGenerator.roomAccess === "selected" && codeGenerator.role && codeGenerator.role !== "manager" && (
                <div className="room-check-grid">
                  {rooms.length === 0 ? (
                    <p className="empty-line">Adauga intai sali pentru aceasta locatie.</p>
                  ) : (
                    rooms.map((room) => (
                      <label className="toggle-row compact-toggle" key={room.id}>
                        <input
                          type="checkbox"
                          checked={codeGenerator.allowedRoomIds.includes(room.id)}
                          onChange={(event) => {
                            const allowedRoomIds = event.target.checked
                              ? [...codeGenerator.allowedRoomIds, room.id]
                              : codeGenerator.allowedRoomIds.filter((roomId) => roomId !== room.id);
                            onCodeGeneratorChange({ ...codeGenerator, allowedRoomIds });
                          }}
                        />
                        {room.name}
                      </label>
                    ))
                  )}
                </div>
              )}
              <button className="secondary-button compact" disabled={codesWorking} onClick={onGenerate} type="button">
                {codesWorking ? "Se genereaza..." : "Genereaza"}
              </button>
            </div>
          </div>
        )}

        <div className="mini-section-head code-list-head">
          <h3>{visibleAccessCodes.length} coduri afisate</h3>
        </div>

        <div className="mini-list">
          {accessCodes.length === 0 ? (
            <p className="empty-line">Nu exista coduri pe locatii.</p>
          ) : visibleAccessCodes.length === 0 ? (
            <p className="empty-line">Nu exista coduri pentru filtrul ales.</p>
          ) : (
            visibleAccessCodes.map((item) => {
              const codeDraft = codeDraftFor(item);
              const isEditingCode = Boolean(editingCodeIds[item.id]);
              const draftRole = isEditingCode ? codeDraft.role : item.role;
              const draftGroupName = isEditingCode ? codeDraft.groupName : item.groupName;
              const draftRoomAccess = draftRole === "manager" ? "all" : codeDraft.roomAccess;
              const draftAllowedRoomIds = draftRoomAccess === "selected" ? codeDraft.allowedRoomIds : [];
              const codeChanged =
                draftRole !== item.role ||
                draftGroupName !== item.groupName ||
                draftRoomAccess !== item.roomAccess ||
                !sameRoomIds(draftAllowedRoomIds, item.allowedRoomIds);
              const editDisabled = codesWorking || !isEditingCode;

              return (
                <div className={`code-row ${!item.active || isAccessCodeFull(item) ? "code-row-muted" : ""}`} key={item.id}>
                  <span className="code-chip">{item.code}</span>
                  <select
                    value={draftRole}
                    onChange={(event) => {
                      const nextRole = event.target.value as UserRole;
                      setCodeDraft(item, {
                        role: nextRole,
                        groupName: nextRole === "manager" ? "" : codeDraft.groupName,
                        roomAccess: nextRole === "manager" ? "all" : item.roomAccess,
                        allowedRoomIds: nextRole === "manager" || item.roomAccess === "all" ? [] : item.allowedRoomIds,
                      });
                    }}
                    disabled={editDisabled}
                  >
                    <option value="guest">Oaspete</option>
                    <option value="member">Membru</option>
                    <option value="manager">Manager</option>
                  </select>
                  <select
                    value={draftGroupName}
                    onChange={(event) => setCodeDraft(item, { ...codeDraft, groupName: event.target.value })}
                    disabled={editDisabled || draftRole === "manager"}
                  >
                    <option value="">{draftRole === "manager" ? "Fara grup" : "Alege grupul"}</option>
                    {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
                  </select>
                  <div className="code-room-access">
                    <select
                      value={draftRoomAccess}
                      onChange={(event) => {
                        const nextRoomAccess = event.target.value as RoomAccessMode;

                        if (nextRoomAccess === "all") {
                          setCodeDraft(item, {
                            ...codeDraft,
                            roomAccess: "all",
                            allowedRoomIds: [],
                          });
                          return;
                        }

                        setCodeDraft(item, {
                          ...codeDraft,
                          roomAccess: "selected",
                          allowedRoomIds: item.allowedRoomIds,
                        });
                      }}
                      disabled={editDisabled || draftRole === "manager"}
                    >
                      <option value="all">Toate salile</option>
                      <option value="selected">Sali alese</option>
                    </select>
                    {draftRole !== "manager" && draftRoomAccess === "selected" && (
                      <div className="room-check-grid code-room-check-grid">
                        {rooms.length === 0 ? (
                          <p className="empty-line">Adauga intai sali pentru aceasta locatie.</p>
                        ) : (
                          rooms.map((room) => (
                            <label className="toggle-row compact-toggle" key={room.id}>
                              <input
                                type="checkbox"
                                checked={draftAllowedRoomIds.includes(room.id)}
                                onChange={(event) => {
                                  const allowedRoomIds = event.target.checked
                                    ? [...draftAllowedRoomIds, room.id]
                                    : draftAllowedRoomIds.filter((roomId) => roomId !== room.id);
                                  setCodeDraft(item, { ...codeDraft, roomAccess: "selected", allowedRoomIds });
                                }}
                                disabled={editDisabled}
                              />
                              {room.name}
                            </label>
                          ))
                        )}
                      </div>
                    )}
                    <small>{roomAccessLabel({ ...item, roomAccess: draftRoomAccess, allowedRoomIds: draftAllowedRoomIds }, rooms)}</small>
                  </div>
                  <span className="code-usage">{accessCodeUsageLabel(item)}</span>
                  <div className="code-row-actions">
                    <button onClick={() => onCopy(item.code)} type="button">
                      Copiaza
                    </button>
                    <button onClick={() => onCopyInviteLink(item.code)} type="button">
                      Link
                    </button>
                    <button onClick={() => onSendInvite(item)} disabled={!item.active || isAccessCodeFull(item)} type="button">
                      Email
                    </button>
                    {isEditingCode ? (
                      <>
                        <button className="secondary-button compact" onClick={() => closeCodeEditor(item.id)} type="button">
                          Renunta
                        </button>
                        <button
                          className="primary-button compact"
                          disabled={!codeChanged || (draftRoomAccess === "selected" && draftAllowedRoomIds.length === 0)}
                          onClick={() => saveCodeEditor(item)}
                          type="button"
                        >
                          Salveaza
                        </button>
                      </>
                    ) : (
                      <button className="secondary-button compact" disabled={codesWorking} onClick={() => openCodeEditor(item)} type="button">
                        Editeaza
                      </button>
                    )}
                    <button onClick={() => onToggleActive(item)} type="button">
                      {item.active ? "Opreste" : "Activeaza"}
                    </button>
                    <button
                      onClick={() => onRemove(item)}
                      type="button"
                      aria-label="Sterge codul"
                    >
                      Sterge
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {codesError && <p className="error-line manager-alert">{codesError}</p>}
        {codesMessage && <p className="success-line manager-alert">{codesMessage}</p>}

        <div className="modal-actions">
          <button className="primary-button" onClick={onClose} type="button">Gata</button>
        </div>
      </div>
    </div>

    {inviteDraft && (
      <div className="modal-backdrop modal-backdrop-nested" role="presentation" onMouseDown={() => onInviteDraftChange(null)}>
        <section
          className="modal-card small-card"
          role="dialog"
          aria-modal="true"
          aria-label="Trimite invitatie prin email"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Email Kelunia</span>
              <h2>Trimite invitatia</h2>
            </div>
          </div>

          <p className="muted-note">
            Emailul pleaca de la Kelunia, cu domeniul configurat in Resend. Nu se deschide aplicatia ta de email.
          </p>

          <div className="settings-form newsletter-compose">
            <label>
              Email destinatar
              <input
                type="email"
                value={inviteDraft.email}
                onChange={(event) => onInviteDraftChange({ ...inviteDraft, email: event.target.value })}
                placeholder="persoana@email.com"
              />
            </label>
            <div className="settings-summary-grid">
              <span>Cod</span>
              <strong>{inviteDraft.code}</strong>
              <span>Locatie</span>
              <strong>{inviteDraft.locationName}</strong>
              <span>Rol</span>
              <strong>{inviteDraft.role === "manager" ? "Manager" : inviteDraft.role === "member" ? "Membru" : "Oaspete"}</strong>
              {inviteDraft.role !== "manager" && (
                <>
                  <span>Grup</span>
                  <strong>{inviteDraft.groupName || "setat in invitatie"}</strong>
                </>
              )}
            </div>
            <label>
              Mesaj
              <textarea
                value={inviteDraft.message}
                onChange={(event) => onInviteDraftChange({ ...inviteDraft, message: event.target.value })}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button className="secondary-button" onClick={() => onInviteDraftChange(null)} disabled={codesWorking} type="button">
              Renunta
            </button>
            <button className="primary-button" onClick={onSendInviteEmail} disabled={codesWorking} type="button">
              {codesWorking ? "Se trimite..." : "Trimite"}
            </button>
          </div>
        </section>
      </div>
    )}
    </>
  );
}
