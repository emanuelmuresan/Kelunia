"use client";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { GroupItem, RoomItem, SpaceKind } from "@/lib/types/domain";

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
  const t = (key: UiCopyKey) => appText(language, key);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card manager-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resources-manager-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">{t("settings.organization")}</span>
            <h2 id="resources-manager-title">{title}</h2>
          </div>
        </div>

        <div className="split-list">
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
                    <span>{room.name}</span>
                    {canEditCurrentLocation && (
                      <div className="row-actions">
                        <button onClick={() => onOpenSpaceEditor("room", room)} type="button" aria-label={t("settings.edit")}>
                          ✎
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
                    </span>
                    {canEditCurrentLocation && (
                      <div className="row-actions">
                        <button onClick={() => onOpenSpaceEditor("group", group)} type="button" aria-label={t("settings.edit")}>
                          ✎
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

        <div className="modal-actions">
          <button className="primary-button" onClick={onClose} type="button">
            {t("action.done")}
          </button>
        </div>
      </section>
    </div>
  );
}
