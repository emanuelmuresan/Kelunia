"use client";

import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

type PagesEditorModalProps = {
  language: AppLanguage;
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
  onSave: () => void;
  onClose: () => void;
};

/** Per-location navigation: which pages show and what they are called. Cancel restores the previous values. */
export function PagesEditorModal({
  language,
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
  onSave,
  onClose,
}: PagesEditorModalProps) {
  const t = (key: UiCopyKey) => appText(language, key);
  const [baseline] = useState(() => ({
    fixedPageEnabled: fixedPageEnabledDraft,
    fixedSection: fixedSectionDraft,
    listView: listViewDraft,
    resourcesSection: resourcesSectionDraft,
    roomsLabel: roomsLabelDraft,
    groupsLabel: groupsLabelDraft,
  }));
  const dirty =
    baseline.fixedPageEnabled !== fixedPageEnabledDraft ||
    baseline.fixedSection !== fixedSectionDraft ||
    baseline.listView !== listViewDraft ||
    baseline.resourcesSection !== resourcesSectionDraft ||
    baseline.roomsLabel !== roomsLabelDraft ||
    baseline.groupsLabel !== groupsLabelDraft;

  function handleClose() {
    setFixedPageEnabledDraft(baseline.fixedPageEnabled);
    setFixedSectionDraft(baseline.fixedSection);
    setListViewDraft(baseline.listView);
    setResourcesSectionDraft(baseline.resourcesSection);
    setRoomsLabelDraft(baseline.roomsLabel);
    setGroupsLabelDraft(baseline.groupsLabel);
    onClose();
  }

  function handleSave() {
    if (!dirty) {
      return;
    }

    onSave();
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={handleClose}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pages-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("settings.navigation")}</span>
            <h2 id="pages-settings-title">{t("settings.pages")}</h2>
          </div>
        </div>

        <div className="settings-form">
          <SettingsBlock title={t("settings.blockVisibility")}>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={fixedPageEnabledDraft}
                onChange={(event) => setFixedPageEnabledDraft(event.target.checked)}
              />
              {t("settings.showPage").replace("{{page}}", fixedSectionDraft.trim() || defaultFixedSectionTitle)}
            </label>
          </SettingsBlock>

          <SettingsBlock title={t("settings.blockSectionNames")}>
            <label>
              {t("nav.fixed")}
              <input value={fixedSectionDraft} onChange={(event) => setFixedSectionDraft(event.target.value)} />
            </label>

            <label>
              {t("nav.list")}
              <input value={listViewDraft} onChange={(event) => setListViewDraft(event.target.value)} />
            </label>

            <label>
              {t("settings.organization")}
              <input
                value={resourcesSectionDraft}
                placeholder={defaultResourcesSectionTitle}
                onChange={(event) => setResourcesSectionDraft(event.target.value)}
              />
            </label>
          </SettingsBlock>

          <SettingsBlock title={t("settings.blockItemNames")}>
            <label>
              {defaultRoomsLabel}
              <input
                value={roomsLabelDraft}
                placeholder={defaultRoomsLabel}
                onChange={(event) => setRoomsLabelDraft(event.target.value)}
              />
            </label>

            <label>
              {defaultGroupsLabel}
              <input
                value={groupsLabelDraft}
                placeholder={defaultGroupsLabel}
                onChange={(event) => setGroupsLabelDraft(event.target.value)}
              />
            </label>
          </SettingsBlock>

          <div className="modal-actions">
            <button className="secondary-button" onClick={handleClose} type="button">
              {t("action.cancel")}
            </button>
            <button className="primary-button" disabled={!dirty} onClick={handleSave} type="button">
              {t("action.save")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
