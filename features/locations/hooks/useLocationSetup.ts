"use client";

// Configurarea primei locații a unui manager nou: nume, adresă oficială (cu Google Maps) și crearea locației într-o tranzacție,
// care leagă locația de utilizator și, dacă există, revendică licența. La final pagina se reîncarcă.
import { useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  deleteField,
  doc,
  runTransaction,
  Timestamp,
  type Firestore,
} from "firebase/firestore";

import type { UserProfile } from "@/context/AuthContext";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import { defaultLocationName } from "@/lib/config/app";
import { initialLocationBillingFields, locationBillingFieldsFromLicense } from "@/lib/licensing";
import { locationDocumentId, normalizeLocationIdentity } from "@/lib/locations";
import { useLocationSetupAutocomplete } from "@/features/locations/hooks/useLocationSetupAutocomplete";

// Forma funcției de audit.
type RecordAuditLog = (
  entityType: AuditEntityType,
  action: AuditAction,
  entityId: string,
  before: unknown,
  after: unknown,
  auditLocationId?: string,
  auditLocationName?: string
) => Promise<void>;

// Parametrii: baza de date, profilul și funcțiile din dashboard.
type UseLocationSetupParams = {
  apiKey: string;
  db: Firestore;
  enabled: boolean;
  isOnline: boolean;
  offlineMessage: string;
  profile: UserProfile | null;
  recordAuditLog: RecordAuditLog;
  setIsOnline: (value: boolean) => void;
  user: User | null;
};

// Hook-ul configurării locației.
export function useLocationSetup({
  apiKey,
  db,
  enabled,
  isOnline,
  offlineMessage,
  profile,
  recordAuditLog,
  setIsOnline,
  user,
}: UseLocationSetupParams) {
  // Starea formularului: numele, adresa, place_id, eroarea și încărcarea.
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  // Autocompletarea adresei cu Google Maps.
  const mapsStatus = useLocationSetupAutocomplete({
    apiKey,
    enabled,
    inputRef: addressInputRef,
    locationName: name,
    setAddress,
    setName,
    setPlaceId,
  });

  // Deschide locația: verifică conexiunea, numele și adresa, apoi scrie totul într-o tranzacție.
  async function openLicensedLocation() {
    if (!user || !profile?.locationSetupRequired) {
      return;
    }

    const connected = typeof navigator === "undefined" ? isOnline : navigator.onLine;

    if (!connected) {
      setIsOnline(false);
      setError(offlineMessage);
      return;
    }

    // Datele curățate și identificatorul documentului locației (după place_id sau adresă, deci o singură locație pe adresă).
    const cleanAddress = address.trim();
    const cleanName = name.trim() || cleanAddress.split(",")[0]?.trim() || defaultLocationName;
    const pendingLicenseId = profile.pendingLicenseId.trim();
    const hasPendingLicense = Boolean(pendingLicenseId);

    setError("");

    if (!cleanAddress) {
      setError("Alege adresa oficiala a locatiei.");
      return;
    }

    if (!cleanName) {
      setError("Scrie numele locatiei.");
      return;
    }

    const createdLocationId = locationDocumentId(placeId, cleanAddress, cleanName);
    const locationRef = doc(db, "locations", createdLocationId);
    const userRef = doc(db, "users", user.uid);
    const licenseRef = hasPendingLicense ? doc(db, "licenses", pendingLicenseId) : null;
    // Datele locației noi, cu planul și starea de facturare inițiale (probă).
    let locationPayload: Record<string, unknown> = {
      name: cleanName,
      address: cleanAddress,
      officialAddress: cleanAddress,
      placeId: placeId.trim(),
      ownerEmail: user.email ?? "",
      createdBy: user.email ?? "",
      createdAt: Timestamp.now(),
      deleted: false,
      ...initialLocationBillingFields(),
    };
    // Actualizarea profilului (locația) și a licenței (marcată ca folosită).
    const userLocationPayload = {
      locationId: createdLocationId,
      locationName: cleanName,
      locationSetupRequired: false,
    };
    const licenseUpdatePayload = {
      used: true,
      usedAt: Timestamp.now(),
      usedBy: user.email ?? "",
      usedByUid: user.uid,
      locationId: createdLocationId,
      locationName: cleanName,
      intendedAddress: cleanAddress,
      officialAddress: cleanAddress,
    };
    let licenseAuditBefore: Record<string, unknown> | null = null;

    setLoading(true);

    try {
      // Tranzacția: refuză o locație deja existentă la aceeași adresă și validează licența (neutilizată, activă, a acestui cont, pentru adresa corectă).
      await runTransaction(db, async (transaction) => {
        const locationSnap = await transaction.get(locationRef);

        if (locationSnap.exists()) {
          throw new Error("Exista deja o locatie la aceasta adresa.");
        }

        if (licenseRef) {
          const licenseSnap = await transaction.get(licenseRef);
          const licenseData = licenseSnap.data() ?? {};
          licenseAuditBefore = licenseData;

          if (!licenseSnap.exists() || licenseData.used === true) {
            throw new Error("Codul de licenta nu mai este valid.");
          }

          if (licenseData.active === false || licenseData.deleted === true) {
            throw new Error("Codul de licenta este oprit.");
          }

          if (licenseData.claimedByUid && licenseData.claimedByUid !== user.uid) {
            throw new Error("Codul de licenta este deja folosit de alt cont.");
          }

          const intendedAddress = String(licenseData.intendedAddress ?? licenseData.officialAddress ?? "").trim();
          const intendedPlaceId = String(licenseData.placeId ?? "").trim();

          if (intendedPlaceId && placeId.trim() && intendedPlaceId !== placeId.trim()) {
            throw new Error("Alege adresa pentru care a fost generata licenta.");
          }

          if (intendedAddress && normalizeLocationIdentity(intendedAddress) !== normalizeLocationIdentity(cleanAddress)) {
            throw new Error("Alege adresa pentru care a fost generata licenta.");
          }

          // Cu licență, planul și valabilitatea vin din licență în loc de proba implicită.
          locationPayload = {
            ...locationPayload,
            ...locationBillingFieldsFromLicense(licenseData),
          };
        }

        // Scrie locația, actualizează profilul (scoate licența în așteptare) și licența.
        transaction.set(locationRef, locationPayload);

        transaction.update(userRef, {
          ...userLocationPayload,
          pendingLicenseId: deleteField(),
          pendingLicenseCode: deleteField(),
        });

        if (licenseRef) {
          transaction.update(licenseRef, licenseUpdatePayload);
        }
      });

      // După succes se scriu înregistrările de audit și se reîncarcă pagina ca aplicația să preia noua locație.
      await recordAuditLog("location", "create", createdLocationId, null, locationPayload, createdLocationId, cleanName);
      await recordAuditLog(
        "user",
        "update",
        user.uid,
        profile,
        { ...userLocationPayload, pendingLicenseId: null, pendingLicenseCode: null },
        createdLocationId,
        cleanName
      );
      if (hasPendingLicense) {
        await recordAuditLog("license", "update", pendingLicenseId, licenseAuditBefore, licenseUpdatePayload, createdLocationId, cleanName);
      }
      window.location.reload();
    } catch (setupError) {
      console.error("Locatia nu a putut fi deschisa:", setupError);
      setError(setupError instanceof Error ? setupError.message : "Locatia nu a putut fi deschisa.");
    } finally {
      setLoading(false);
    }
  }

  // Schimbarea adresei manual anulează place_id-ul ales anterior.
  function handleAddressChange(nextAddress: string) {
    setAddress(nextAddress);
    setPlaceId("");
  }

  return {
    address,
    addressInputRef,
    error,
    handleAddressChange,
    loading,
    mapsStatus,
    name,
    openLicensedLocation,
    setName,
  };
}
