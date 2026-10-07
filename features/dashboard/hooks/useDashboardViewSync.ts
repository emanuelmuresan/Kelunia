"use client";

// Sincronizează ecranul activ și locația aleasă cu ce permit profilul și licența; apelat din app/dashboard/page.tsx.
import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { UserProfile } from "@/context/AuthContext";
import type { AppView, LocationItem } from "@/lib/types/domain";

// Parametrii: starea dashboard-ului și funcțiile care o modifică.
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
  listPageEnabled: boolean;
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
  listPageEnabled,
  currentLocationId,
}: UseDashboardViewSyncParams) {
  // Utilizatorul care nu este proprietar pornește pe locația din profil.
  useEffect(() => {
    if (!profile) {
      return;
    }

    if (isOwner || needsLocationSetup) {
      return;
    }

    setActiveLocationId((current) => current || profile.locationId || "main-location");
  }, [isOwner, needsLocationSetup, profile, setActiveLocationId]);

  // La configurarea locației, precompletează numele din profil.
  useEffect(() => {
    if (!profile || !needsLocationSetup) {
      return;
    }

    setLocationSetupName((current) => current || profile.locationName || "");
  }, [needsLocationSetup, profile, setLocationSetupName]);

  // Proprietarul: dacă locația aleasă nu mai există în listă, selecția se șterge.
  useEffect(() => {
    if (!isOwner || !activeLocationId || locations.some((location) => location.id === activeLocationId)) {
      return;
    }

    setActiveLocationId("");
  }, [activeLocationId, isOwner, locations, setActiveLocationId]);

  // Dacă pagina programului fix este oprită, utilizatorul revine la calendar.
  useEffect(() => {
    if (!fixedPageEnabled && activeView === "fixed") {
      setActiveView("calendar");
    }
  }, [activeView, fixedPageEnabled, setActiveView]);

  // The calendar is always there; a hidden list page falls back to it.
  useEffect(() => {
    if (!listPageEnabled && activeView === "list") {
      setActiveView("calendar");
    }
  }, [activeView, listPageEnabled, setActiveView]);

  // Proprietarul fără locație aleasă rămâne pe Setări (unde își gestionează locațiile).
  useEffect(() => {
    if (isOwner && !currentLocationId && activeView !== "settings") {
      setActiveView("settings");
    }
  }, [activeView, currentLocationId, isOwner, setActiveView]);
}
