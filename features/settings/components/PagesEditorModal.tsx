"use client";

import { useDismissGuard } from "@/features/shell/components/ConfirmDialog";
import { useState } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

export type PagesSection = "visibility" | "names" | "labels";

type PagesEditorModalProps = {
  section: PagesSection;
  language: AppLanguage;
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
  onSave: () => void;
  onClose: () => void;
};

/** Per-location navigation: which pages show and what they are called. Cancel restores the previous values. */
export function PagesEditorModal({
  section,
  language,
  fixedPageEnabledDraft,
  listPageEnabledDraft,
  setListPageEnabledDraft,
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
    listPageEnabled: listPageEnabledDraft,
    fixedSection: fixedSectionDraft,
    listView: listViewDraft,
    resourcesSection: resourcesSectionDraft,
    roomsLabel: roomsLabelDraft,
    groupsLabel: groupsLabelDraft,
  }));
  const dirty =
    baseline.fixedPageEnabled !== fixedPageEnabledDraft ||
    baseline.listPageEnabled !== listPageEnabledDraft ||
    baseline.fixedSection !== fixedSectionDraft ||
    baseline.listView !== listViewDraft ||
    baseline.resourcesSection !== resourcesSectionDraft ||
    baseline.roomsLabel !== roomsLabelDraft ||
    baseline.groupsLabel !== groupsLabelDraft;

  function handleClose() {
    setFixedPageEnabledDraft(baseline.fixedPageEnabled);
    setListPageEnabledDraft(baseline.listPageEnabled);
    setFixedSectionDraft(baseline.fixedSection);
    setListViewDraft(baseline.listView);
    setResourcesSectionDraft(baseline.resourcesSection);
    setRoomsLabelDraft(baseline.roomsLabel);
    setGroupsLabelDraft(baseline.groupsLabel);
    onClose();
  }

  const requestClose = useDismissGuard(dirty, handleClose, language);

  function handleSave() {
    if (!dirty) {
      return;
    }

    onSave();
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={requestClose}>
      <section
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pages-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("settings.pages")}</span>
            <h2 id="pages-settings-title">
              {t(section === "visibility" ? "settings.blockVisibility" : section === "names" ? "settings.blockSectionNames" : "settings.blockItemNames")}
            </h2>
          </div>
        </div>

        <div className="settings-form">
          {section === "visibility" && (
          <div className="settings-form-section">
            <small className="muted-note">{t("settings.calendarAlwaysOn")}</small>
            <label className="toggle-row">
              <input type="checkbox" checked disabled />
              {t("settings.showPage").replace("{{page}}", t("nav.calendar"))}
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={listPageEnabledDraft}
                onChange={(event) => setListPageEnabledDraft(event.target.checked)}
              />
              {t("settings.showPage").replace("{{page}}", listViewDraft.trim() || t("nav.list"))}
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={fixedPageEnabledDraft}
                onChange={(event) => setFixedPageEnabledDraft(event.target.checked)}
              />
              {t("settings.showPage").replace("{{page}}", fixedSectionDraft.trim() || defaultFixedSectionTitle)}
            </label>
          </div>
          )}

          {section === "names" && (
          <div className="settings-form-section">
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
          </div>
          )}

          {section === "labels" && (
          <div className="settings-form-section">
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
          </div>
          )}

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
