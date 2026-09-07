"use client";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import type { GroupItem, RoomItem } from "@/lib/types/domain";

type ResourcesSummaryCardProps = {
  language: AppLanguage;
  title: string;
  roomsLabel: string;
  groupsLabel: string;
  rooms: RoomItem[];
  groups: GroupItem[];
  onOpenResourcesManager: () => void;
};

/** Organization panel: rooms / groups counts + a button into the manager modal. */
export function ResourcesSummaryCard({
  language,
  title,
  roomsLabel,
  groupsLabel,
  rooms,
  groups,
  onOpenResourcesManager,
}: ResourcesSummaryCardProps) {
  const t = (key: UiCopyKey) => appText(language, key);

  return (
    <article className="settings-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("settings.organization")}</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="owner-tool-grid">
        <div className="owner-tool-card">
          <div>
            <span className="eyebrow">{roomsLabel}</span>
            <h3>{rooms.length} {rooms.length === 1 ? "element" : "elemente"}</h3>
            <p>{rooms.length > 0 ? rooms.slice(0, 3).map((room) => room.name).join(", ") : t("settings.noItems")}</p>
          </div>
        </div>

        <div className="owner-tool-card">
          <div>
            <span className="eyebrow">{groupsLabel}</span>
            <h3>{groups.length} {groups.length === 1 ? "element" : "elemente"}</h3>
            <p>{groups.length > 0 ? groups.slice(0, 3).map((group) => group.name).join(", ") : t("settings.noItems")}</p>
          </div>
        </div>
      </div>

      <div className="modal-actions inline-actions">
        <button className="primary-button compact" onClick={onOpenResourcesManager} type="button">
          {t("settings.resourcesOpen")}
        </button>
      </div>
    </article>
  );
}
