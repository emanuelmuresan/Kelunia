"use client";

import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
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

/** "Pages" panel: per-location navigation labels + visibility, with inline edit mode. */
export function PagesSettingsCard({
  language,
  canEditCurrentLocation,
  fixedPageEnabledDraft,
  setFixedPageEnabledDraft,
  fixedSectionDraft,
  setFixedSectionDraft,
  defaultFixedSectionTitle,
  listViewDraft,
  setListViewDraft,
  resourcesSectionDraft,
  setResourcesSectionDraft,
  defaultResourcesSectionTitle,
  roomsLabelDraft,
  setRoomsLabelDraft,
  defaultRoomsLabel,
  groupsLabelDraft,
  setGroupsLabelDraft,
  defaultGroupsLabel,
  onSaveNavigationSettings,
}: PagesSettingsCardProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [pagesEditing, setPagesEditing] = useState(false);

  return (
    <article className="settings-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("settings.navigation")}</span>
          <h2>{t("settings.pages")}</h2>
        </div>
        {canEditCurrentLocation && !pagesEditing && (
          <button className="secondary-button compact" onClick={() => setPagesEditing(true)} type="button">
            {t("settings.edit")}
          </button>
        )}
      </div>

      <div className="settings-form">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={fixedPageEnabledDraft}
            disabled={!canEditCurrentLocation || !pagesEditing}
            onChange={(event) => setFixedPageEnabledDraft(event.target.checked)}
          />
          Afișează pagina {fixedSectionDraft.trim() || defaultFixedSectionTitle}
        </label>

        <label>
          {t("nav.fixed")}
          <input
            value={fixedSectionDraft}
            disabled={!canEditCurrentLocation || !pagesEditing}
            onChange={(event) => setFixedSectionDraft(event.target.value)}
          />
        </label>

        <label>
          {t("nav.list")}
          <input
            value={listViewDraft}
            disabled={!canEditCurrentLocation || !pagesEditing}
            onChange={(event) => setListViewDraft(event.target.value)}
          />
        </label>

        <label>
          {t("settings.organization")}
          <input
            value={resourcesSectionDraft}
            disabled={!canEditCurrentLocation || !pagesEditing}
            placeholder={defaultResourcesSectionTitle}
            onChange={(event) => setResourcesSectionDraft(event.target.value)}
          />
        </label>

        <label>
          {defaultRoomsLabel}
          <input
            value={roomsLabelDraft}
            disabled={!canEditCurrentLocation || !pagesEditing}
            placeholder={defaultRoomsLabel}
            onChange={(event) => setRoomsLabelDraft(event.target.value)}
          />
        </label>

        <label>
          {defaultGroupsLabel}
          <input
            value={groupsLabelDraft}
            disabled={!canEditCurrentLocation || !pagesEditing}
            placeholder={defaultGroupsLabel}
            onChange={(event) => setGroupsLabelDraft(event.target.value)}
          />
        </label>

        {canEditCurrentLocation && pagesEditing && (
          <div className="modal-actions inline-actions">
            <button className="secondary-button" onClick={() => setPagesEditing(false)} type="button">
              {t("action.cancel")}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                onSaveNavigationSettings();
                setPagesEditing(false);
              }}
              type="button"
            >
              {t("action.save")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
