"use client";

// Fereastra „Spații și grupuri”: două coloane (camere și grupuri) cu butoane de adăugare, modificare și ștergere pentru fiecare element.
// Cele temporare arată data până la care sunt valabile sau „expirat”. Scrierile sunt în useSpaceEditor.
import type { AppLanguage } from "@/context/AuthContext";
import { dateKey } from "@/lib/dates";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import { isSpaceExpired } from "@/lib/space-expiry";
import type { GroupItem, RoomItem, SpaceKind } from "@/lib/types/domain";

// Proprietățile ferestrei: listele, etichetele personalizate și acțiunile.
type ResourcesManagerModalProps = {
  language: AppLanguage;
  title: string;
  roomsLabel: string;
  groupsLabel: string;
  rooms: RoomItem[];
  groups: GroupItem[];
  canEditCurrentLocation: boolean;
  onClose: () => void;
  onOpenSpaceEditor: (kind: SpaceKind, item?: RoomItem | GroupItem) => void;
  onRemoveSpaceItem: (kind: SpaceKind, itemId: string) => void;
};

/** Rooms + groups manager: the two-column list with add/edit/delete per item. */
export function ResourcesManagerModal({
  language,
  title,
  roomsLabel,
  groupsLabel,
  rooms,
  groups,
  canEditCurrentLocation,
  onClose,
  onOpenSpaceEditor,
  onRemoveSpaceItem,
}: ResourcesManagerModalProps) {
  // Componenta ferestrei; ziua de azi servește la recunoașterea elementelor expirate.
  const t = (key: UiCopyKey) => appText(language, key);
  const todayKey = dateKey(new Date());
  // Nota de valabilitate a unui element temporar.
  const expiryNote = (item: { activeUntil?: string }) =>
    item.activeUntil ? (
      <small className={isSpaceExpired(item, todayKey) ? "code-expiry-expired" : "code-expiry"}>
        {" "}· {isSpaceExpired(item, todayKey)
          ? t("settings.expired")
          : t("settings.untilDate").replace("{{date}}", item.activeUntil)}
      </small>
    ) : null;

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card manager-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resources-manager-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Antetul ferestrei. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">{t("settings.organization")}</span>
            <h2 id="resources-manager-title">{title}</h2>
          </div>
        </div>

        {/* Cele două coloane: camere și grupuri. */}
        <div className="split-list">
          {/* Coloana camerelor: adăugare doar pentru cine poate edita locația. */}
          <div className="mini-column">
            <div className="mini-section-head">
              <h3>{roomsLabel}</h3>
              {canEditCurrentLocation && (
                <button className="secondary-button compact" onClick={() => onOpenSpaceEditor("room")} type="button">
                  + {roomsLabel}
                </button>
              )}
            </div>

            <div className="mini-list">
              {rooms.length === 0 ? (
                <p className="empty-line">{t("settings.noItems")}</p>
              ) : (
                rooms.map((room) => (
                  <div className="mini-row" key={room.id}>
                    <span>{room.name}{expiryNote(room)}</span>
                    {canEditCurrentLocation && (
                      <div className="row-actions">
                        <button className="secondary-button compact" onClick={() => onOpenSpaceEditor("room", room)} type="button">
                          {t("settings.edit")}
                        </button>
                        <button className="secondary-button compact danger-button" onClick={() => onRemoveSpaceItem("room", room.id)} type="button">
                          {t("action.delete")}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coloana grupurilor, cu pastila de culoare a fiecărui grup. */}
          <div className="mini-column">
            <div className="mini-section-head">
              <h3>{groupsLabel}</h3>
              {canEditCurrentLocation && (
                <button className="secondary-button compact" onClick={() => onOpenSpaceEditor("group")} type="button">
                  + {groupsLabel}
                </button>
              )}
            </div>

            <div className="mini-list">
              {groups.length === 0 ? (
                <p className="empty-line">{t("settings.noItems")}</p>
              ) : (
                groups.map((group) => (
                  <div className="mini-row" key={group.id}>
                    <span className="group-name-with-swatch">
                      {group.color && <i aria-hidden="true" style={{ backgroundColor: group.color }} />}
                      {group.name}
                      {expiryNote(group)}
                    </span>
                    {canEditCurrentLocation && (
                      <div className="row-actions">
                        <button className="secondary-button compact" onClick={() => onOpenSpaceEditor("group", group)} type="button">
                          {t("settings.edit")}
                        </button>
                        <button className="secondary-button compact danger-button" onClick={() => onRemoveSpaceItem("group", group.id)} type="button">
                          {t("action.delete")}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
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
