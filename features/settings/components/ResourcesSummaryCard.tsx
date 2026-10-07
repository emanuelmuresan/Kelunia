"use client";

import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
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
    <SettingsBlock title={title} action={<button className="secondary-button compact" onClick={onOpenResourcesManager} type="button">{t("settings.edit")}</button>}>

      <div className="settings-summary-list">
        <div>
          <span>{roomsLabel}</span>
          <strong>
            {rooms.length > 0 ? `${rooms.length} · ${rooms.slice(0, 3).map((room) => room.name).join(", ")}` : t("settings.noItems")}
          </strong>
        </div>
        <div>
          <span>{groupsLabel}</span>
          <strong>
            {groups.length > 0 ? `${groups.length} · ${groups.slice(0, 3).map((group) => group.name).join(", ")}` : t("settings.noItems")}
          </strong>
        </div>
      </div>
    </SettingsBlock>
  );
}
