"use client";

// Setările de navigare ale unei locații (documentul settings/calendar_<locationId>): numele paginilor, ce pagini se văd (programul fix și lista;
// calendarul e mereu vizibil) și etichetele camerelor și grupurilor. Păstrează valorile salvate și ciornele din ferestrele de editare.
import { useAppText } from "@/features/shell/hooks/useAppText";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, onSnapshot, setDoc, Timestamp } from "firebase/firestore";

import type { RecordAuditLog } from "@/lib/audit";
import {
  defaultFixedSectionTitle,
  defaultGroupsLabel,
  defaultListViewTitle,
  defaultResourcesSectionTitle,
  defaultRoomsLabel,
} from "@/lib/config/app";
import { db } from "@/lib/firebase";
import type { WriteTarget } from "@/lib/types/domain";

// Parametrii: locația, permisiunile și funcțiile din dashboard.
type UseCalendarSettingsParams = {
  userExists: boolean;
  locationId: string;
  locationName: string;
  user: User | null;
  canEditCurrentLocation: boolean;
  requireOnline: (target?: WriteTarget) => boolean;
  recordAuditLog: RecordAuditLog;
  setSettingsError: (value: string) => void;
  setSettingsMessage: (value: string) => void;
};

// Hook-ul setărilor de navigare.
export function useCalendarSettings({
  userExists,
  locationId,
  locationName,
  user,
  canEditCurrentLocation,
  requireOnline,
  recordAuditLog,
  setSettingsError,
  setSettingsMessage,
}: UseCalendarSettingsParams) {
  const msg = useAppText();
  // Pentru fiecare setare există valoarea salvată și o ciornă pe care o modifică ferestrele de editare.
  const [fixedSectionTitle, setFixedSectionTitle] = useState(defaultFixedSectionTitle);
  const [fixedSectionDraft, setFixedSectionDraft] = useState(defaultFixedSectionTitle);
  const [fixedPageEnabled, setFixedPageEnabled] = useState(true);
  const [fixedPageEnabledDraft, setFixedPageEnabledDraft] = useState(true);
  const [listPageEnabled, setListPageEnabled] = useState(true);
  const [listPageEnabledDraft, setListPageEnabledDraft] = useState(true);
  const [listViewTitle, setListViewTitle] = useState(defaultListViewTitle);
  const [listViewDraft, setListViewDraft] = useState(defaultListViewTitle);
  const [resourcesSectionTitle, setResourcesSectionTitle] = useState(defaultResourcesSectionTitle);
  const [resourcesSectionDraft, setResourcesSectionDraft] = useState(defaultResourcesSectionTitle);
  const [roomsLabel, setRoomsLabel] = useState(defaultRoomsLabel);
  const [roomsLabelDraft, setRoomsLabelDraft] = useState(defaultRoomsLabel);
  const [groupsLabel, setGroupsLabel] = useState(defaultGroupsLabel);
  const [groupsLabelDraft, setGroupsLabelDraft] = useState(defaultGroupsLabel);

  // Fără utilizator sau fără locație se folosesc valorile implicite.
  useEffect(() => {
    if (!userExists || !locationId) {
      setFixedSectionTitle(defaultFixedSectionTitle);
      setFixedSectionDraft(defaultFixedSectionTitle);
      setFixedPageEnabled(true);
      setFixedPageEnabledDraft(true);
      setListPageEnabled(true);
      setListPageEnabledDraft(true);
      setListViewTitle(defaultListViewTitle);
      setListViewDraft(defaultListViewTitle);
      setResourcesSectionTitle(defaultResourcesSectionTitle);
      setResourcesSectionDraft(defaultResourcesSectionTitle);
      setRoomsLabel(defaultRoomsLabel);
      setRoomsLabelDraft(defaultRoomsLabel);
      setGroupsLabel(defaultGroupsLabel);
      setGroupsLabelDraft(defaultGroupsLabel);
      return;
    }

    // Urmărește documentul de setări în timp real; valorile lipsă sau goale devin cele implicite, iar paginile sunt vizibile dacă nu sunt oprite explicit.
    return onSnapshot(
      doc(db, "settings", `calendar_${locationId}`),
      (snapshot) => {
        const data = snapshot.data() ?? {};
        const title = String(data.fixedSectionTitle ?? defaultFixedSectionTitle).trim() || defaultFixedSectionTitle;
        const listTitle = String(data.listViewTitle ?? defaultListViewTitle).trim() || defaultListViewTitle;
        const resourcesTitle = String(data.resourcesSectionTitle ?? defaultResourcesSectionTitle).trim() || defaultResourcesSectionTitle;
        const nextRoomsLabel = String(data.roomsLabel ?? defaultRoomsLabel).trim() || defaultRoomsLabel;
        const nextGroupsLabel = String(data.groupsLabel ?? defaultGroupsLabel).trim() || defaultGroupsLabel;
        const enabled = data.fixedPageEnabled !== false;
        const listEnabled = data.listPageEnabled !== false;

        setFixedSectionTitle(title);
        setFixedSectionDraft(title);
        setFixedPageEnabled(enabled);
        setFixedPageEnabledDraft(enabled);
        setListPageEnabled(listEnabled);
        setListPageEnabledDraft(listEnabled);
        setListViewTitle(listTitle);
        setListViewDraft(listTitle);
        setResourcesSectionTitle(resourcesTitle);
        setResourcesSectionDraft(resourcesTitle);
        setRoomsLabel(nextRoomsLabel);
        setRoomsLabelDraft(nextRoomsLabel);
        setGroupsLabel(nextGroupsLabel);
        setGroupsLabelDraft(nextGroupsLabel);
      },
      // La eroare de citire se revine la valorile implicite.
      (error) => {
        console.warn("Numele sectiunii din calendar nu a putut fi citit:", error);
        setFixedSectionTitle(defaultFixedSectionTitle);
        setFixedSectionDraft(defaultFixedSectionTitle);
        setFixedPageEnabled(true);
        setFixedPageEnabledDraft(true);
        setListPageEnabled(true);
        setListPageEnabledDraft(true);
        setListViewTitle(defaultListViewTitle);
        setListViewDraft(defaultListViewTitle);
        setResourcesSectionTitle(defaultResourcesSectionTitle);
        setResourcesSectionDraft(defaultResourcesSectionTitle);
        setRoomsLabel(defaultRoomsLabel);
        setRoomsLabelDraft(defaultRoomsLabel);
        setGroupsLabel(defaultGroupsLabel);
        setGroupsLabelDraft(defaultGroupsLabel);
      }
    );
  }, [locationId, userExists]);

  // Salvează setările: numele nu pot fi goale; scrie documentul complet și înregistrează în audit starea de dinainte și de după.
  async function saveNavigationSettings() {
    if (!canEditCurrentLocation) {
      return;
    }

    if (!requireOnline("settings")) {
      return;
    }

    const title = fixedSectionDraft.trim();
    const listTitle = listViewDraft.trim();
    const resourcesTitle = resourcesSectionDraft.trim();
    const nextRoomsLabel = roomsLabelDraft.trim();
    const nextGroupsLabel = groupsLabelDraft.trim();

    if (!title) {
      setSettingsError(msg("msg.fixedPageNameRequired"));
      return;
    }

    if (!listTitle) {
      setSettingsError(msg("msg.listButtonNameRequired"));
      return;
    }

    if (!resourcesTitle || !nextRoomsLabel || !nextGroupsLabel) {
      setSettingsError(msg("msg.resourcesSectionNameRequired"));
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    try {
      const beforeSettings = {
        fixedSectionTitle,
        fixedPageEnabled,
        listPageEnabled,
        listViewTitle,
        resourcesSectionTitle,
        roomsLabel,
        groupsLabel,
        locationId,
        locationName,
      };
      const afterSettings = {
        fixedSectionTitle: title,
        fixedPageEnabled: fixedPageEnabledDraft,
        listPageEnabled: listPageEnabledDraft,
        listViewTitle: listTitle,
        resourcesSectionTitle: resourcesTitle,
        roomsLabel: nextRoomsLabel,
        groupsLabel: nextGroupsLabel,
        locationId,
        locationName,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, "settings", `calendar_${locationId}`), afterSettings);
      await recordAuditLog("settings", "update", `calendar_${locationId}`, beforeSettings, afterSettings);
      setSettingsMessage(msg("msg.pagesSaved"));
    } catch (error) {
      console.error("Paginile nu au putut fi salvate:", error);
      setSettingsError(msg("msg.pagesSaveFailed"));
    }
  }

  // Valorile salvate, ciornele și acțiunile expuse dashboard-ului.
  return {
    fixedPageEnabled,
    fixedPageEnabledDraft,
    fixedSectionDraft,
    fixedSectionTitle,
    groupsLabel,
    groupsLabelDraft,
    listPageEnabled,
    listPageEnabledDraft,
    listViewDraft,
    listViewTitle,
    resourcesSectionDraft,
    resourcesSectionTitle,
    roomsLabel,
    roomsLabelDraft,
    setFixedPageEnabledDraft,
    setFixedSectionDraft,
    setGroupsLabelDraft,
    setListPageEnabledDraft,
    setListViewDraft,
    setResourcesSectionDraft,
    setRoomsLabelDraft,
    saveNavigationSettings,
  };
}
