"use client";

// Fereastra „Coduri de acces”: lista codurilor active și a istoricului, generarea unui cod nou, editarea rolului/grupului/camerelor,
// copierea invitației, prelungirea, oprirea și ștergerea; plus fereastra de trimitere a invitației pe email.
// Logica (scrierile în Firestore) este în hook-ul useAccessCodes; aici sunt doar afișarea și ciornele de editare.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserRole } from "@/context/AuthContext";
import type { AccessInviteDraft, CodeGeneratorState } from "@/features/access-codes/hooks/useAccessCodes";
import { appText, supportedLocales, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import { roomAccessLabel } from "@/lib/room-access";
import type { GroupItem, LocationCode, LocationItem, RoomAccessMode, RoomItem } from "@/lib/types/domain";

// Proprietățile ferestrei: codurile, listele de grupuri și camere, starea hook-ului și funcțiile de acțiune.
interface AccessCodesModalProps {
  open: boolean;
  codeGenerator: CodeGeneratorState;
  groups: GroupItem[];
  rooms: RoomItem[];
  editableCodeLocations: Pick<LocationItem, "id" | "name">[];
  accessCodes: LocationCode[];
  codesWorking: boolean;
  codesError: string;
  inviteDraft: AccessInviteDraft | null;
  inviteLanguage: SupportedLocale;
  onInviteLanguageChange: (language: SupportedLocale) => void;
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
  onExtendExpiry: (item: LocationCode) => void;
  accessCodeUsageLabel: (item: LocationCode, language: SupportedLocale) => string;
  isAccessCodeFull: (item: LocationCode) => boolean;
  isAccessCodeExpired: (item: LocationCode) => boolean;
  accessCodeExpiryLabel: (item: LocationCode, language: SupportedLocale) => string;
  onCopyInviteLink: (item: LocationCode) => void;
  onSendInvite: (item: LocationCode) => void;
  onSendInviteEmail: () => void;
  language?: SupportedLocale;
}

// Ciorna de editare a unui cod (rol, grup, acces la camere), ținută local până la „Salvează”.
type AccessCodeDraft = {
  role: UserRole;
  groupName: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
};

// Componenta ferestrei.
export function AccessCodesModal({
  open,
  codeGenerator,
  groups,
  rooms,
  editableCodeLocations,
  accessCodes,
  codesWorking,
  codesError,
  inviteDraft,
  inviteLanguage,
  onInviteLanguageChange,
  onClose,
  onCodeGeneratorChange,
  onInviteDraftChange,
  onGenerate,
  onUpdateDetails,
  onCopy,
  onToggleActive,
  onRemove,
  onExtendExpiry,
  accessCodeUsageLabel,
  isAccessCodeFull,
  isAccessCodeExpired,
  accessCodeExpiryLabel,
  onCopyInviteLink,
  onSendInvite,
  onSendInviteEmail,
  language = "ro",
}: AccessCodesModalProps) {
  // Starea locală: formularul de creare, tab-ul (active/istoric), codurile în editare și ciornele lor.
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [view, setView] = useState<"active" | "history">("active");
  const [editingCodeIds, setEditingCodeIds] = useState<Record<string, boolean>>({});
  const [codeDrafts, setCodeDrafts] = useState<Record<string, AccessCodeDraft>>({});

  // La închiderea ferestrei se resetează tot ce era în curs.
  useEffect(() => {
    if (!open) {
      setShowCreateForm(false);
      setView("active");
      setEditingCodeIds({});
      setCodeDrafts({});
    }
  }, [open]);

  // Un cod este utilizabil dacă e activ, nu a atins numărul maxim de utilizări și nu a expirat; restul merg în istoric.
  const isUsableCode = useCallback(
    (item: LocationCode) => item.active !== false && !isAccessCodeFull(item) && !isAccessCodeExpired(item),
    [isAccessCodeFull, isAccessCodeExpired]
  );

  const activeCodes = useMemo(() => accessCodes.filter(isUsableCode), [accessCodes, isUsableCode]);
  const historyCodes = useMemo(() => accessCodes.filter((item) => !isUsableCode(item)), [accessCodes, isUsableCode]);
  const tabCodes = view === "active" ? activeCodes : historyCodes;

  const visibleAccessCodes = tabCodes;

  // Ciorna unui cod: cea în editare sau valorile din cod.
  function codeDraftFor(item: LocationCode): AccessCodeDraft {
    return codeDrafts[item.id] ?? {
      role: item.role,
      groupName: item.groupName || "",
      roomAccess: item.role === "manager" ? "all" : item.roomAccess,
      allowedRoomIds: item.role === "manager" ? [] : item.allowedRoomIds,
    };
  }

  // Deschide, închide și modifică ciorna unui cod; sameRoomIds compară listele de camere fără ordine.
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

  // Salvează modificările unui cod prin hook și închide editorul.
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

  // Fereastra închisă nu se randează.
  if (!open) {
    return null;
  }

  // Fereastra principală și, separat, fereastra de invitație pe email.
  return (
    <>
    {/* Fereastra codurilor. */}
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card manager-card" role="dialog" aria-modal="true" aria-label={appText(language, "settings.accessCodes")}>
        {/* Antetul ferestrei. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">{appText(language, "settings.access")}</span>
            <h2>{appText(language, "settings.accessCodes")}</h2>
          </div>
          <button className="secondary-button compact" onClick={onClose} type="button">
            {appText(language, "booking.close")}
          </button>
        </div>

        {/* Comutator între coduri active și istoric. */}
        <div className="segmented-control code-view-tabs" role="group" aria-label={appText(language, "access.activeCodes")}>
          <button className={view === "active" ? "active" : ""} onClick={() => setView("active")} type="button">
            {appText(language, "access.activeCodes")} ({activeCodes.length})
          </button>
          <button className={view === "history" ? "active" : ""} onClick={() => setView("history")} type="button">
            {appText(language, "access.historyCodes")} ({historyCodes.length})
          </button>
        </div>

        {/* Limba textului de invitație (email și mesajul copiat). */}
        <label className="invite-language-field">
          {appText(language, "invite.language")}
          <select className="code-filter-select" value={inviteLanguage} onChange={(event) => onInviteLanguageChange(event.target.value as SupportedLocale)}>
            {supportedLocales.map((locale) => (
              <option key={locale.code} value={locale.code}>{locale.label}</option>
            ))}
          </select>
        </label>

        {/* Butonul care deschide formularul de generare. */}
        <div className="code-toolbar">
          <button className="primary-button compact" onClick={() => setShowCreateForm((current) => !current)} type="button">
            {showCreateForm ? appText(language, "booking.close") : appText(language, "access.createCode")}
          </button>
        </div>

        <p className="muted-note">
          {appText(language, "access.closeKeepsHistory")}
        </p>

        {/* Formularul de generare: rolul decide ce câmpuri apar. */}
        {showCreateForm && (
          <div className="code-create-panel">
            <div className="mini-section-head">
              <h3>{appText(language, "access.generateCode")}</h3>
            </div>
            <div className="code-add-grid">
              <select
                value={codeGenerator.role}
                onChange={(event) => {
                  const nextRole = event.target.value as UserRole | "";
                  // Codes always belong to the location this modal is open for.
                  onCodeGeneratorChange({
                    ...codeGenerator,
                    role: nextRole,
                    groupName: "",
                    roomAccess: "all",
                    allowedRoomIds: [],
                    locationId: nextRole ? editableCodeLocations[0]?.id ?? "" : "",
                  });
                }}
              >
                <option value="">{appText(language, "access.role")}</option>
                <option value="guest">{appText(language, "role.guest")}</option>
                <option value="member">{appText(language, "role.collaborator")}</option>
                <option value="manager">{appText(language, "role.administrator")}</option>
              </select>

              {/* Administrator: doar emailul invitatului (opțional) și generarea. */}
              {codeGenerator.role === "manager" && (
                <>
                  <input
                    type="email"
                    value={codeGenerator.inviteEmail}
                    onChange={(event) => onCodeGeneratorChange({ ...codeGenerator, inviteEmail: event.target.value })}
                    placeholder={appText(language, "access.recipientEmail")}
                  />
                  <button className="secondary-button compact" disabled={codesWorking} onClick={onGenerate} type="button">
                    {codesWorking ? appText(language, "action.generating") : appText(language, "action.generate")}
                  </button>
                </>
              )}

              {/* Colaborator/Oaspete: grup, email, acces la camere (toate sau alese) și generarea. */}
              {(codeGenerator.role === "member" || codeGenerator.role === "guest") && codeGenerator.locationId && (
                <>
                  <select
                    value={codeGenerator.groupName}
                    onChange={(event) => onCodeGeneratorChange({ ...codeGenerator, groupName: event.target.value })}
                  >
                    <option value="">{appText(language, "booking.selectGroup")}</option>
                    {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
                  </select>
                  <input
                    type="email"
                    value={codeGenerator.inviteEmail}
                    onChange={(event) => onCodeGeneratorChange({ ...codeGenerator, inviteEmail: event.target.value })}
                    placeholder={appText(language, "access.recipientEmail")}
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
                  >
                    <option value="all">{appText(language, "settings.roomsAll")}</option>
                    <option value="selected">{appText(language, "settings.roomsSelected")}</option>
                  </select>
                  {codeGenerator.roomAccess === "selected" && (
                    <div className="room-check-grid">
                      {rooms.length === 0 ? (
                        <p className="empty-line">{appText(language, "settings.noItems")}</p>
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
                    {codesWorking ? appText(language, "action.generating") : appText(language, "action.generate")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Lista codurilor din tab-ul ales. */}
        <div className="mini-section-head code-list-head">
          <h3>{appText(language, "access.codesShown").replace("{{count}}", String(visibleAccessCodes.length))}</h3>
        </div>

        <div className="mini-list">
          {accessCodes.length === 0 ? (
            <p className="empty-line">{appText(language, "access.noCodes")}</p>
          ) : tabCodes.length === 0 ? (
            <p className="empty-line">{appText(language, view === "active" ? "access.noActiveCodes" : "access.noHistoryCodes")}</p>
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

              const roleLabel = (role: UserRole) =>
                role === "manager"
                  ? appText(language, "role.administrator")
                  : role === "member"
                    ? appText(language, "role.collaborator")
                    : appText(language, "role.guest");

              // Un rând din listă: codul, rolul și grupul (editabile), utilizările, expirarea și acțiunile.
              return (
                <div className={`code-row ${!item.active || isAccessCodeFull(item) || isAccessCodeExpired(item) ? "code-row-muted" : ""}`} key={item.id}>
                  {/* Codul afișat; în modul de editare apar selecturile de rol, grup și camere. */}
                  <span className="code-chip">{item.code}</span>
                  {isEditingCode ? (
                    <>
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
                      >
                        <option value="guest">{appText(language, "role.guest")}</option>
                        <option value="member">{appText(language, "role.collaborator")}</option>
                        <option value="manager">{appText(language, "role.administrator")}</option>
                      </select>
                      <select
                        value={draftGroupName}
                        onChange={(event) => setCodeDraft(item, { ...codeDraft, groupName: event.target.value })}
                        disabled={draftRole === "manager"}
                      >
                        <option value="">{draftRole === "manager" ? appText(language, "access.noGroup") : appText(language, "booking.selectGroup")}</option>
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
                          disabled={draftRole === "manager"}
                        >
                          <option value="all">{appText(language, "settings.roomsAll")}</option>
                          <option value="selected">{appText(language, "settings.roomsSelected")}</option>
                        </select>
                        {draftRole !== "manager" && draftRoomAccess === "selected" && (
                          <div className="room-check-grid code-room-check-grid">
                            {rooms.length === 0 ? (
                              <p className="empty-line">{appText(language, "settings.noItems")}</p>
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
                                    disabled={codesWorking}
                                  />
                                  {room.name}
                                </label>
                              ))
                            )}
                          </div>
                        )}
                        <small>{roomAccessLabel({ ...item, roomAccess: draftRoomAccess, allowedRoomIds: draftAllowedRoomIds }, rooms)}</small>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="code-role-label">{roleLabel(item.role)}</span>
                      <span className="code-group-label">{item.role === "manager" ? appText(language, "access.noGroup") : item.groupName || appText(language, "booking.selectGroup")}</span>
                      <span className="code-room-access-label">
                        <small>{roomAccessLabel(item, rooms)}</small>
                      </span>
                    </>
                  )}
                  {/* Utilizările și data expirării. */}
                  <span className="code-usage">
                    {accessCodeUsageLabel(item, language)}
                    {accessCodeExpiryLabel(item, language) && (
                      <small className={isAccessCodeExpired(item) ? "code-expiry-expired" : "code-expiry"}>
                        {" "}· {accessCodeExpiryLabel(item, language)}
                      </small>
                    )}
                  </span>
                  {/* Acțiuni: copiere, mesaj de invitație, email, prelungire (doar dacă a expirat), modificare, oprire/pornire și ștergere. */}
                  <div className="code-row-actions">
                    <button onClick={() => onCopy(item.code)} type="button">
                      {appText(language, "action.copy")}
                    </button>
                    <button onClick={() => onCopyInviteLink(item)} type="button">
                      {appText(language, "access.copyMessage")}
                    </button>
                    <button onClick={() => onSendInvite(item)} disabled={!item.active || isAccessCodeFull(item) || isAccessCodeExpired(item)} type="button">
                      {appText(language, "access.sendEmail")}
                    </button>
                    {isAccessCodeExpired(item) && (
                      <button onClick={() => onExtendExpiry(item)} type="button">
                        {appText(language, "access.extend")}
                      </button>
                    )}
                    {isEditingCode ? (
                      <>
                        <button className="secondary-button compact" onClick={() => closeCodeEditor(item.id)} type="button">
                          {appText(language, "action.cancel")}
                        </button>
                        <button
                          className="primary-button compact"
                          disabled={!codeChanged || (draftRoomAccess === "selected" && draftAllowedRoomIds.length === 0)}
                          onClick={() => saveCodeEditor(item)}
                          type="button"
                        >
                          {appText(language, "action.save")}
                        </button>
                      </>
                    ) : (
                      <button className="secondary-button compact" disabled={codesWorking} onClick={() => openCodeEditor(item)} type="button">
                        {appText(language, "access.modifyCode")}
                      </button>
                    )}
                    <button onClick={() => onToggleActive(item)} type="button">
                      {item.active ? appText(language, "action.deactivate") : appText(language, "action.activate")}
                    </button>
                    <button
                      onClick={() => onRemove(item)}
                      type="button"
                      aria-label={appText(language, "action.delete")}
                    >
                      {appText(language, "action.delete")}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Eroarea ultimei acțiuni. */}
        {codesError && <p className="error-line manager-alert">{codesError}</p>}

        {/* Închiderea ferestrei. */}
        <div className="modal-actions">
          <button className="primary-button" onClick={onClose} type="button">{appText(language, "action.done")}</button>
        </div>
      </div>
    </div>

    {/* Fereastra de invitație pe email: destinatar, mesaj editabil și limba. */}
    {inviteDraft && (
      <div className="modal-backdrop modal-backdrop-nested" role="presentation" onMouseDown={() => onInviteDraftChange(null)}>
        <section
          className="modal-card small-card"
          role="dialog"
          aria-modal="true"
          aria-label={appText(language, "access.emailInvite")}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Email Kelunia</span>
              <h2>{appText(language, "access.emailInvite")}</h2>
            </div>
          </div>

          <p className="muted-note">
            {appText(language, "access.emailNote")}
          </p>

          <div className="settings-form newsletter-compose">
            <label>
              {appText(language, "access.recipientEmail")}
              <input
                type="email"
                value={inviteDraft.email}
                onChange={(event) => onInviteDraftChange({ ...inviteDraft, email: event.target.value })}
                placeholder="persoana@email.com"
              />
            </label>
            <div className="settings-summary-grid">
              <span>{appText(language, "settings.codes")}</span>
              <strong>{inviteDraft.code}</strong>
              <span>{appText(language, "settings.location")}</span>
              <strong>{inviteDraft.locationName}</strong>
              <span>{appText(language, "settings.role")}</span>
              <strong>{inviteDraft.role === "manager" ? appText(language, "role.administrator") : inviteDraft.role === "member" ? appText(language, "role.collaborator") : appText(language, "role.guest")}</strong>
              {inviteDraft.role !== "manager" && (
                <>
                  <span>{appText(language, "settings.group")}</span>
                  <strong>{inviteDraft.groupName || appText(language, "settings.notSet")}</strong>
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
              {appText(language, "action.cancel")}
            </button>
            <button className="primary-button" onClick={onSendInviteEmail} disabled={codesWorking} type="button">
              {codesWorking ? appText(language, "booking.sending") : appText(language, "action.send")}
            </button>
          </div>
        </section>
      </div>
    )}
    </>
  );
}
