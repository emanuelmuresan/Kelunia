"use client";

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
  const [fixedSectionTitle, setFixedSectionTitle] = useState(defaultFixedSectionTitle);
  const [fixedSectionDraft, setFixedSectionDraft] = useState(defaultFixedSectionTitle);
  const [fixedPageEnabled, setFixedPageEnabled] = useState(true);
  const [fixedPageEnabledDraft, setFixedPageEnabledDraft] = useState(true);
  const [listViewTitle, setListViewTitle] = useState(defaultListViewTitle);
  const [listViewDraft, setListViewDraft] = useState(defaultListViewTitle);
  const [resourcesSectionTitle, setResourcesSectionTitle] = useState(defaultResourcesSectionTitle);
  const [resourcesSectionDraft, setResourcesSectionDraft] = useState(defaultResourcesSectionTitle);
  const [roomsLabel, setRoomsLabel] = useState(defaultRoomsLabel);
  const [roomsLabelDraft, setRoomsLabelDraft] = useState(defaultRoomsLabel);
  const [groupsLabel, setGroupsLabel] = useState(defaultGroupsLabel);
  const [groupsLabelDraft, setGroupsLabelDraft] = useState(defaultGroupsLabel);

  useEffect(() => {
    if (!userExists || !locationId) {
      setFixedSectionTitle(defaultFixedSectionTitle);
      setFixedSectionDraft(defaultFixedSectionTitle);
      setFixedPageEnabled(true);
      setFixedPageEnabledDraft(true);
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

        setFixedSectionTitle(title);
        setFixedSectionDraft(title);
        setFixedPageEnabled(enabled);
        setFixedPageEnabledDraft(enabled);
        setListViewTitle(listTitle);
        setListViewDraft(listTitle);
        setResourcesSectionTitle(resourcesTitle);
        setResourcesSectionDraft(resourcesTitle);
        setRoomsLabel(nextRoomsLabel);
        setRoomsLabelDraft(nextRoomsLabel);
        setGroupsLabel(nextGroupsLabel);
        setGroupsLabelDraft(nextGroupsLabel);
      },
      (error) => {
        console.warn("Numele sectiunii din calendar nu a putut fi citit:", error);
        setFixedSectionTitle(defaultFixedSectionTitle);
        setFixedSectionDraft(defaultFixedSectionTitle);
        setFixedPageEnabled(true);
        setFixedPageEnabledDraft(true);
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
      setSettingsError("Scrie numele paginii de programări fixe.");
      return;
    }

    if (!listTitle) {
      setSettingsError("Scrie numele butonului pentru listă.");
      return;
    }

    if (!resourcesTitle || !nextRoomsLabel || !nextGroupsLabel) {
      setSettingsError("Completeaza numele pentru sectiunea de sali si grupuri.");
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    try {
      const beforeSettings = {
        fixedSectionTitle,
        fixedPageEnabled,
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
      setSettingsMessage("Paginile au fost salvate.");
    } catch (error) {
      console.error("Paginile nu au putut fi salvate:", error);
      setSettingsError("Paginile nu au putut fi salvate. Verifică regulile Firebase.");
    }
  }

  return {
    fixedPageEnabled,
    fixedPageEnabledDraft,
    fixedSectionDraft,
    fixedSectionTitle,
    groupsLabel,
    groupsLabelDraft,
    listViewDraft,
    listViewTitle,
    resourcesSectionDraft,
    resourcesSectionTitle,
    roomsLabel,
    roomsLabelDraft,
    setFixedPageEnabledDraft,
    setFixedSectionDraft,
    setGroupsLabelDraft,
    setListViewDraft,
    setResourcesSectionDraft,
    setRoomsLabelDraft,
    saveNavigationSettings,
  };
}
