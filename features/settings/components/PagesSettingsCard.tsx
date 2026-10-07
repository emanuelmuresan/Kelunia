"use client";

// Secțiunea „Pagini” a locației, în trei blocuri (vizibilitate, numele paginilor, etichetele elementelor), fiecare cu propriul „Modifică”
// care deschide PagesEditorModal doar pentru blocul respectiv. Calendarul este mereu vizibil; lista și programele fixe pot fi ascunse.
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { PagesEditorModal, type PagesSection } from "@/features/settings/components/PagesEditorModal";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

// Proprietățile cardului: ciornele setărilor de navigare și funcțiile care le modifică, venite din dashboard.
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

// Componenta cardului; afișează valorile curente, iar modificarea se face în fereastră.
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

  // Numele afișate: valoarea scrisă de utilizator sau cea implicită.
  const fixedName = fixedSectionDraft.trim() || defaultFixedSectionTitle;
  const listName = listViewDraft.trim() || t("nav.list");
  const resourcesName = resourcesSectionDraft.trim() || defaultResourcesSectionTitle;
  const roomsName = roomsLabelDraft.trim() || defaultRoomsLabel;
  const groupsName = groupsLabelDraft.trim() || defaultGroupsLabel;

  // Butonul „Modifică” al unui bloc (doar cine poate edita locația) deschide editorul pentru acel bloc.
  const editButton = (section: PagesSection) =>
    canEditCurrentLocation ? (
      <button className="secondary-button compact" onClick={() => setEditorSection(section)} type="button">
        {t("settings.edit")}
      </button>
    ) : undefined;

  // Structura cardului.
  return (
    <>
      {/* Blocul „Vizibilitate”: calendarul este mereu activ, lista și programele fixe pot fi oprite. */}
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

      {/* Blocul „Numele paginilor”. */}
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

      {/* Blocul „Etichetele elementelor” (camere, grupuri). */}
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

      {/* Fereastra de modificare a blocului ales. */}
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
