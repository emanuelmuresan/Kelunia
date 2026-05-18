"use client";

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

type RecordAuditLog = (
  entityType: AuditEntityType,
  action: AuditAction,
  entityId: string,
  before: unknown,
  after: unknown,
  auditLocationId?: string,
  auditLocationName?: string
) => Promise<void>;

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
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  const mapsStatus = useLocationSetupAutocomplete({
    apiKey,
    enabled,
    inputRef: addressInputRef,
    locationName: name,
    setAddress,
    setName,
    setPlaceId,
  });

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

          locationPayload = {
            ...locationPayload,
            ...locationBillingFieldsFromLicense(licenseData),
          };
        }

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
