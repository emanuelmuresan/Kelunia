"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserRole } from "@/context/AuthContext";
import type { CodeGeneratorState } from "@/features/access-codes/hooks/useAccessCodes";
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
  onClose: () => void;
  onCodeGeneratorChange: (nextGenerator: CodeGeneratorState) => void;
  onGenerate: () => void;
  onUpdateDetails: (
    item: LocationCode,
    nextRole: UserRole,
    nextGroupName: string,
    nextRoomAccess?: RoomAccessMode,
    nextAllowedRoomIds?: string[]
  ) => void;
  onCopy: (code: string) => void;
  onToggleActive: (item: LocationCode) => void;
  onRemove: (item: LocationCode) => void;
  accessCodeUsageLabel: (item: LocationCode) => string;
  isAccessCodeFull: (item: LocationCode) => boolean;
  onCopyInviteLink: (code: string) => void;
  onSendInvite: (item: LocationCode) => void;
}

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
  onClose,
  onCodeGeneratorChange,
  onGenerate,
  onUpdateDetails,
  onCopy,
  onToggleActive,
  onRemove,
  accessCodeUsageLabel,
  isAccessCodeFull,
  onCopyInviteLink,
  onSendInvite,
}: AccessCodesModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupFilter, setGroupFilter] = useState("all");
  const [roomDrafts, setRoomDrafts] = useState<Record<string, { roomAccess: RoomAccessMode; allowedRoomIds: string[] }>>({});

  useEffect(() => {
    if (!open) {
      setShowCreateForm(false);
      setGroupFilter("all");
      setRoomDrafts({});
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

  function roomDraftFor(item: LocationCode) {
    return roomDrafts[item.id] ?? {
      roomAccess: item.role === "manager" ? "all" : item.roomAccess,
      allowedRoomIds: item.role === "manager" ? [] : item.allowedRoomIds,
    };
  }

  function setRoomDraft(item: LocationCode, nextDraft: { roomAccess: RoomAccessMode; allowedRoomIds: string[] }) {
    setRoomDrafts((current) => ({ ...current, [item.id]: nextDraft }));
  }

  function clearRoomDraft(codeId: string) {
    setRoomDrafts((current) => {
      const next = { ...current };
      delete next[codeId];
      return next;
    });
  }

  function sameRoomIds(first: string[], second: string[]) {
    if (first.length !== second.length) {
      return false;
    }

    const firstSet = new Set(first);
    return second.every((item) => firstSet.has(item));
  }

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card manager-card" role="dialog" aria-modal="true" aria-label="Coduri de acces">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Acces</span>
            <h2>Coduri de acces</h2>
          </div>
          <button onClick={onClose} type="button" aria-label="Închide">×</button>
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
              const roomDraft = roomDraftFor(item);
              const draftRoomAccess = item.role === "manager" ? "all" : roomDraft.roomAccess;
              const draftAllowedRoomIds = draftRoomAccess === "selected" ? roomDraft.allowedRoomIds : [];
              const roomSelectionChanged = draftRoomAccess !== item.roomAccess || !sameRoomIds(draftAllowedRoomIds, item.allowedRoomIds);

              return (
                <div className={`code-row ${!item.active || isAccessCodeFull(item) ? "code-row-muted" : ""}`} key={item.id}>
                  <span className="code-chip">{item.code}</span>
                  <select
                    value={item.role}
                    onChange={(event) => {
                      const nextRole = event.target.value as UserRole;
                      clearRoomDraft(item.id);
                      onUpdateDetails(item, nextRole, nextRole === "manager" ? "" : item.groupName || "", nextRole === "manager" ? "all" : item.roomAccess, nextRole === "manager" ? [] : item.allowedRoomIds);
                    }}
                  >
                    <option value="guest">Oaspete</option>
                    <option value="member">Membru</option>
                    <option value="manager">Manager</option>
                  </select>
                  <select
                    value={item.groupName}
                    onChange={(event) => onUpdateDetails(item, item.role, event.target.value, draftRoomAccess, draftAllowedRoomIds)}
                    disabled={item.role === "manager"}
                  >
                    <option value="">{item.role === "manager" ? "Fara grup" : "Alege grupul"}</option>
                    {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
                  </select>
                  <div className="code-room-access">
                    <select
                      value={draftRoomAccess}
                      onChange={(event) => {
                        const nextRoomAccess = event.target.value as RoomAccessMode;

                        if (nextRoomAccess === "all") {
                          clearRoomDraft(item.id);
                          onUpdateDetails(item, item.role, item.groupName, "all", []);
                          return;
                        }

                        setRoomDraft(item, {
                          roomAccess: "selected",
                          allowedRoomIds: item.allowedRoomIds,
                        });
                      }}
                      disabled={item.role === "manager"}
                    >
                      <option value="all">Toate salile</option>
                      <option value="selected">Sali alese</option>
                    </select>
                    {item.role !== "manager" && draftRoomAccess === "selected" && (
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
                                  setRoomDraft(item, { roomAccess: "selected", allowedRoomIds });
                                }}
                              />
                              {room.name}
                            </label>
                          ))
                        )}
                        <button
                          className="secondary-button compact"
                          disabled={codesWorking || !roomSelectionChanged || draftAllowedRoomIds.length === 0}
                          onClick={() => onUpdateDetails(item, item.role, item.groupName, "selected", draftAllowedRoomIds)}
                          type="button"
                        >
                          Salveaza salile
                        </button>
                      </div>
                    )}
                    <small>{roomAccessLabel({ ...item, roomAccess: draftRoomAccess, allowedRoomIds: draftAllowedRoomIds }, rooms)}</small>
                  </div>
                  <span className="code-usage">{accessCodeUsageLabel(item)}</span>
                  <button onClick={() => onCopy(item.code)} type="button">
                    Copiaza
                  </button>
                  <button onClick={() => onCopyInviteLink(item.code)} type="button">
                    Link
                  </button>
                  <button onClick={() => onSendInvite(item)} disabled={!item.active || isAccessCodeFull(item)} type="button">
                    Email
                  </button>
                  <button onClick={() => onToggleActive(item)} type="button">
                    {item.active ? "Opreste" : "Activeaza"}
                  </button>
                  <button
                    onClick={() => onRemove(item)}
                    type="button"
                    aria-label="Sterge codul"
                  >
                    x
                  </button>
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
  );
}
