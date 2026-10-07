"use client";

// Citește locațiile în timp real: proprietarul vede toate, ceilalți doar locația lor; la lipsă sau eroare folosește datele din profil.
import { useEffect, useState } from "react";
import { doc, onSnapshot, type Firestore } from "firebase/firestore";

import { buildLocationsQuery, locationsQueryLimit } from "@/lib/queries/resources";
import { defaultLocationName } from "@/lib/config/app";
import { normalizeLocation } from "@/lib/locations";
import { isSoftDeleted } from "@/lib/soft-delete";

import type { LocationItem } from "@/lib/types/domain";

// Parametrii: baza de date, utilizatorul, profilul și locația curentă.
interface UseLocationsProps {
  db: Firestore;
  user: unknown;
  profile: {
    locationId: string;
    locationName?: string;
    email?: string;
  } | null;
  isOwner: boolean;
  needsLocationSetup: boolean;
  currentLocationId: string;
}

// Locația minimă construită din profil, folosită când documentul nu poate fi citit.
function fallbackLocation(profile: UseLocationsProps["profile"]): LocationItem[] {
  if (!profile?.locationId) {
    return [];
  }

  return [
    {
      id: profile.locationId,
      name: profile.locationName || defaultLocationName,
      ownerEmail: profile.email || "",
      address: "",
      placeId: "",
    },
  ];
}

// Hook-ul locațiilor.
export function useLocations({
  db,
  user,
  profile,
  isOwner,
  needsLocationSetup,
  currentLocationId,
}: UseLocationsProps) {
  const [locations, setLocations] = useState<LocationItem[]>([]);

  // Fără utilizator sau fără locație lista este goală.
  useEffect(() => {
    if (!user) {
      setLocations([]);
      return;
    }

    if (needsLocationSetup || (!isOwner && !currentLocationId)) {
      setLocations([]);
      return;
    }

    // Utilizator obișnuit: urmărește documentul locației lui; o locație ștearsă logic dispare din listă.
    if (!isOwner) {
      return onSnapshot(
        doc(db, "locations", currentLocationId),
        (snapshot) => {
          if (!snapshot.exists() && profile) {
            setLocations(fallbackLocation(profile));

            return;
          }

          const data = snapshot.data() ?? {};

          if (isSoftDeleted(data)) {
            setLocations([]);
            return;
          }

          setLocations([
            normalizeLocation(snapshot.id, data, {
              name: profile?.locationName ?? defaultLocationName,
              ownerEmail: profile?.email ?? "",
            }),
          ]);
        },
        (error) => {
          console.warn("Locația nu a putut fi citită:", error);

          setLocations(fallbackLocation(profile));
        }
      );
    }

    // Proprietarul: urmărește colecția locațiilor (maximum 200), fără cele șterse logic.
    return onSnapshot(
      buildLocationsQuery(db),
      (snapshot) => {
        const normalized = snapshot.docs
          .filter((item) => !isSoftDeleted(item.data()))
          .map((item) => normalizeLocation(item.id, item.data()));

        if (normalized.length === 0 && profile) {
          setLocations(fallbackLocation(profile));

          return;
        }

        setLocations(normalized);

        if (snapshot.docs.length >= locationsQueryLimit) {
          console.warn(
            "Lista de locatii a atins limita de citire. Urmatorul pas este paginare pentru owner."
          );
        }
      },
      (error) => {
        console.warn("Locațiile nu au putut fi citite:", error);

        setLocations(fallbackLocation(profile));
      }
    );
  }, [
    currentLocationId,
    db,
    isOwner,
    needsLocationSetup,
    profile,
    user,
  ]);

  return {
    locations,
    setLocations,
  };
}
