"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import {
  defaultFixedSectionTitle,
  defaultGroupsLabel,
  defaultListViewTitle,
  defaultResourcesSectionTitle,
  defaultRoomsLabel,
} from "@/lib/config/app";
import { db } from "@/lib/firebase";

type UseCalendarSettingsParams = {
  userExists: boolean;
  locationId: string;
};

export function useCalendarSettings({
  userExists,
  locationId,
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
  };
}
