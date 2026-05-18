"use client";

import { useMemo } from "react";
import type { User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { UserProfile } from "@/context/AuthContext";
import { defaultLocationName } from "@/lib/config/app";
import { locationLicenseAccess } from "@/lib/licensing";
import { useLocations } from "@/features/locations/hooks/useLocations";

type UseCurrentLocationContextParams = {
  activeLocationId: string;
  db: Firestore;
  isOwner: boolean;
  isSuperAdmin: boolean;
  profile: UserProfile | null;
  user: User | null;
};

export function useCurrentLocationContext({
  activeLocationId,
  db,
  isOwner,
  isSuperAdmin,
  profile,
  user,
}: UseCurrentLocationContextParams) {
  const needsLocationSetup = Boolean(
    user &&
    profile &&
    !isOwner &&
    isSuperAdmin &&
    !profile.locationId &&
    profile.locationSetupRequired
  );
  const fallbackLocationId = needsLocationSetup ? "" : isOwner ? "" : profile?.locationId || "main-location";
  const selectedLocationId = isOwner ? activeLocationId : fallbackLocationId;
  const { locations } = useLocations({
    db,
    user,
    profile,
    isOwner,
    needsLocationSetup,
    currentLocationId: selectedLocationId,
  });
  const currentLocationId = isOwner ? activeLocationId : fallbackLocationId;
  const currentLocation = locations.find((location) => location.id === currentLocationId);
  const locationName = isOwner
    ? currentLocation?.name || ""
    : currentLocation?.name || profile?.locationName || defaultLocationName;
  const headerTitle = locationName || (!user ? "Kelunia" : "");
  const licenseAccess = useMemo(() => locationLicenseAccess(currentLocation), [currentLocation]);

  return {
    currentLocation,
    currentLocationId,
    headerTitle,
    licenseAccess,
    locationName,
    locations,
    needsLocationSetup,
  };
}
