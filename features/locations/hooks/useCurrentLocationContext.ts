"use client";

// Stabilește care este locația curentă și ce acces are: proprietarul alege una din listă, ceilalți au locația din profil.
// Returnează și numele pentru antet, lista locațiilor, accesul determinat de licență și dacă trebuie configurată prima locație.
import { useMemo } from "react";
import type { User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { UserProfile } from "@/context/AuthContext";
import { defaultLocationName } from "@/lib/config/app";
import { locationLicenseAccess } from "@/lib/licensing";
import { useLocations } from "@/features/locations/hooks/useLocations";

// Parametrii: locația aleasă de proprietar, baza de date și profilul utilizatorului.
type UseCurrentLocationContextParams = {
  activeLocationId: string;
  db: Firestore;
  isOwner: boolean;
  isSuperAdmin: boolean;
  profile: UserProfile | null;
  user: User | null;
};

// Hook-ul contextului locației.
export function useCurrentLocationContext({
  activeLocationId,
  db,
  isOwner,
  isSuperAdmin,
  profile,
  user,
}: UseCurrentLocationContextParams) {
  // Un manager care nu e proprietar și nu are locație trebuie mai întâi să o configureze (ecranul „Deschide locația”).
  const needsLocationSetup = Boolean(
    user &&
    profile &&
    !isOwner &&
    isSuperAdmin &&
    !profile.locationId &&
    profile.locationSetupRequired
  );
  // Locația curentă: a proprietarului vine din selecție, a celorlalți din profil (implicit „main-location”).
  const fallbackLocationId = needsLocationSetup ? "" : isOwner ? "" : profile?.locationId || "main-location";
  const selectedLocationId = isOwner ? activeLocationId : fallbackLocationId;
  // Locațiile se citesc în timp real prin useLocations.
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
  // Numele locației pentru antet; proprietarul fără locație aleasă nu are nume.
  const locationName = isOwner
    ? currentLocation?.name || ""
    : currentLocation?.name || profile?.locationName || defaultLocationName;
  const headerTitle = locationName || (!user ? "Kelunia" : "");
  // Accesul la scriere/citire al locației, calculat din plan, perioada de probă și starea de facturare.
  const licenseLanguage = profile?.language ?? "ro";
  const licenseAccess = useMemo(
    () => locationLicenseAccess(currentLocation, new Date(), licenseLanguage),
    [currentLocation, licenseLanguage]
  );

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
