"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { UserProfile } from "@/context/AuthContext";
import type { AppView, LocationItem } from "@/lib/types/domain";

type UseDashboardViewSyncParams = {
  profile: UserProfile | null;
  isOwner: boolean;
  needsLocationSetup: boolean;
  activeLocationId: string;
  setActiveLocationId: Dispatch<SetStateAction<string>>;
  locations: LocationItem[];
  setLocationSetupName: Dispatch<SetStateAction<string>>;
  activeView: AppView;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  fixedPageEnabled: boolean;
  currentLocationId: string;
};

/**
 * Keeps the active view / active location in sync with what the profile and license
 * context allow: bootstraps a non-owner's location, clears a stale selection, and
 * bounces the user off a view that is no longer available to them.
 */
export function useDashboardViewSync({
  profile,
  isOwner,
  needsLocationSetup,
  activeLocationId,
  setActiveLocationId,
  locations,
  setLocationSetupName,
  activeView,
  setActiveView,
  fixedPageEnabled,
  currentLocationId,
}: UseDashboardViewSyncParams) {
  useEffect(() => {
    if (!profile) {
      return;
    }

    if (isOwner || needsLocationSetup) {
      return;
    }

    setActiveLocationId((current) => current || profile.locationId || "main-location");
  }, [isOwner, needsLocationSetup, profile, setActiveLocationId]);

  useEffect(() => {
    if (!profile || !needsLocationSetup) {
      return;
    }

    setLocationSetupName((current) => current || profile.locationName || "");
  }, [needsLocationSetup, profile, setLocationSetupName]);

  useEffect(() => {
    if (!isOwner || !activeLocationId || locations.some((location) => location.id === activeLocationId)) {
      return;
    }

    setActiveLocationId("");
  }, [activeLocationId, isOwner, locations, setActiveLocationId]);

  useEffect(() => {
    if (!fixedPageEnabled && activeView === "fixed") {
      setActiveView("calendar");
    }
  }, [activeView, fixedPageEnabled, setActiveView]);

  useEffect(() => {
    if (isOwner && !currentLocationId && activeView !== "settings") {
      setActiveView("settings");
    }
  }, [activeView, currentLocationId, isOwner, setActiveView]);
}
