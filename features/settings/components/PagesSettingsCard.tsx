"use client";

import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { PagesEditorModal } from "@/features/settings/components/PagesEditorModal";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

type PagesSettingsCardProps = {
  language: AppLanguage;
  canEditCurrentLocation: boolean;
  fixedPageEnabledDraft: boolean;
  setFixedPageEnabledDraft: (value: boolean) => void;
  fixedSectionDraft: string;
  setFixedSectionDraft: (value: string) => void;
  defaultFixedSectionTitle: string;
  listViewDraft: string;
  setListViewDraft: (value: string) => void;
  resourcesSectionDraft: string;
  setResourcesSectionDraft: (value: string) => void;
  defaultResourcesSectionTitle: string;
  roomsLabelDraft: string;
  setRoomsLabelDraft: (value: string) => void;
  defaultRoomsLabel: string;
  groupsLabelDraft: string;
  setGroupsLabelDraft: (value: string) => void;
  defaultGroupsLabel: string;
  onSaveNavigationSettings: () => void;
};

/** "Pages" panel: read-only summary of the per-location navigation; editing happens in a modal. */
export function PagesSettingsCard(props: PagesSettingsCardProps) {
  const {
    language,
    canEditCurrentLocation,
    fixedPageEnabledDraft,
    fixedSectionDraft,
    defaultFixedSectionTitle,
    listViewDraft,
    resourcesSectionDraft,
    defaultResourcesSectionTitle,
    roomsLabelDraft,
    defaultRoomsLabel,
    groupsLabelDraft,
    defaultGroupsLabel,
    onSaveNavigationSettings,
  } = props;
  const t = (key: UiCopyKey) => appText(language, key);
  const [editorOpen, setEditorOpen] = useState(false);

  const fixedName = fixedSectionDraft.trim() || defaultFixedSectionTitle;
  const listName = listViewDraft.trim() || t("nav.list");
  const resourcesName = resourcesSectionDraft.trim() || defaultResourcesSectionTitle;
  const roomsName = roomsLabelDraft.trim() || defaultRoomsLabel;
  const groupsName = groupsLabelDraft.trim() || defaultGroupsLabel;

  return (
    <>
      <article className="settings-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("settings.navigation")}</span>
            <h2>{t("settings.pages")}</h2>
          </div>
        </div>

        <div className="settings-summary-list">
          <div>
            <span>{t("settings.blockVisibility")}</span>
            <strong>{fixedName}: {fixedPageEnabledDraft ? t("settings.active") : t("settings.inactive")}</strong>
          </div>
          <div>
            <span>{t("settings.blockSectionNames")}</span>
            <strong>{[fixedName, listName, resourcesName].join(" · ")}</strong>
          </div>
          <div>
            <span>{t("settings.blockItemNames")}</span>
            <strong>{roomsName} · {groupsName}</strong>
          </div>
        </div>

        {canEditCurrentLocation && (
          <div className="settings-card-actions">
            <button className="primary-button compact" onClick={() => setEditorOpen(true)} type="button">
              {t("settings.edit")}
            </button>
          </div>
        )}
      </article>

      {editorOpen && (
        <PagesEditorModal
          language={language}
          fixedPageEnabledDraft={props.fixedPageEnabledDraft}
          setFixedPageEnabledDraft={props.setFixedPageEnabledDraft}
          fixedSectionDraft={props.fixedSectionDraft}
          setFixedSectionDraft={props.setFixedSectionDraft}
          defaultFixedSectionTitle={props.defaultFixedSectionTitle}
          listViewDraft={props.listViewDraft}
          setListViewDraft={props.setListViewDraft}
          resourcesSectionDraft={props.resourcesSectionDraft}
          setResourcesSectionDraft={props.setResourcesSectionDraft}
          defaultResourcesSectionTitle={props.defaultResourcesSectionTitle}
          roomsLabelDraft={props.roomsLabelDraft}
          setRoomsLabelDraft={props.setRoomsLabelDraft}
          defaultRoomsLabel={props.defaultRoomsLabel}
          groupsLabelDraft={props.groupsLabelDraft}
          setGroupsLabelDraft={props.setGroupsLabelDraft}
          defaultGroupsLabel={props.defaultGroupsLabel}
          onSave={onSaveNavigationSettings}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}
