"use client";

import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { PagesEditorModal, type PagesSection } from "@/features/settings/components/PagesEditorModal";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

type PagesSettingsCardProps = {
  language: AppLanguage;
  canEditCurrentLocation: boolean;
  fixedPageEnabledDraft: boolean;
  listPageEnabledDraft: boolean;
  setListPageEnabledDraft: (value: boolean) => void;
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
    listPageEnabledDraft,
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
  const [editorSection, setEditorSection] = useState<PagesSection | null>(null);

  const fixedName = fixedSectionDraft.trim() || defaultFixedSectionTitle;
  const listName = listViewDraft.trim() || t("nav.list");
  const resourcesName = resourcesSectionDraft.trim() || defaultResourcesSectionTitle;
  const roomsName = roomsLabelDraft.trim() || defaultRoomsLabel;
  const groupsName = groupsLabelDraft.trim() || defaultGroupsLabel;

  const editButton = (section: PagesSection) =>
    canEditCurrentLocation ? (
      <button className="secondary-button compact" onClick={() => setEditorSection(section)} type="button">
        {t("settings.edit")}
      </button>
    ) : undefined;

  return (
    <>
      <SettingsBlock title={t("settings.blockVisibility")} action={editButton("visibility")}>
        <div className="settings-summary-list">
          <div>
            <span>{t("nav.calendar")}</span>
            <strong>{t("settings.alwaysVisible")}</strong>
          </div>
          <div>
            <span>{listName}</span>
            <strong>{listPageEnabledDraft ? t("settings.active") : t("settings.inactive")}</strong>
          </div>
          <div>
            <span>{fixedName}</span>
            <strong>{fixedPageEnabledDraft ? t("settings.active") : t("settings.inactive")}</strong>
          </div>
        </div>
      </SettingsBlock>

      <SettingsBlock title={t("settings.blockSectionNames")} action={editButton("names")}>
        <div className="settings-summary-list">
          <div>
            <span>{t("nav.fixed")}</span>
            <strong>{fixedName}</strong>
          </div>
          <div>
            <span>{t("nav.list")}</span>
            <strong>{listName}</strong>
          </div>
          <div>
            <span>{t("settings.organization")}</span>
            <strong>{resourcesName}</strong>
          </div>
        </div>
      </SettingsBlock>

      <SettingsBlock title={t("settings.blockItemNames")} action={editButton("labels")}>
        <div className="settings-summary-list">
          <div>
            <span>{defaultRoomsLabel}</span>
            <strong>{roomsName}</strong>
          </div>
          <div>
            <span>{defaultGroupsLabel}</span>
            <strong>{groupsName}</strong>
          </div>
        </div>
      </SettingsBlock>

      {editorSection && (
        <PagesEditorModal
          section={editorSection}
          language={language}
          fixedPageEnabledDraft={props.fixedPageEnabledDraft}
          setFixedPageEnabledDraft={props.setFixedPageEnabledDraft}
          listPageEnabledDraft={props.listPageEnabledDraft}
          setListPageEnabledDraft={props.setListPageEnabledDraft}
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
          onClose={() => setEditorSection(null)}
        />
      )}
    </>
  );
}
