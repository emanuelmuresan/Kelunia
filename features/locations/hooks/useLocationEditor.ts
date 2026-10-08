"use client";

// Editorul de locații din Setări: proprietarul adaugă sau modifică o locație (plan, stare de facturare, valabilitate),
// iar un manager poate doar să redenumească locația curentă. Fiecare modificare se scrie în jurnalul de audit.
import { useAppText } from "@/features/shell/hooks/useAppText";
import { useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp, updateDoc, type Firestore } from "firebase/firestore";

import type { RecordAuditLog } from "@/lib/audit";
import {
  dateFromFirestoreValue,
  initialLocationBillingFields,
  isLifetimeDate,
  lifetimeExpiryDate,
} from "@/lib/licensing";
import { locationDocumentId } from "@/lib/locations";
import type { LocationEditor, LocationItem, LocationPlan, WriteTarget } from "@/lib/types/domain";

// Parametrii: baza de date, rolul utilizatorului și funcțiile din dashboard.
type UseLocationEditorParams = {
  db: Firestore;
  user: User | null;
  isOwner: boolean;
  canEditCurrentLocation: boolean;
  locations: LocationItem[];
  requireOnline: (target?: WriteTarget) => boolean;
  recordAuditLog: RecordAuditLog;
  setActiveLocationId: (locationId: string) => void;
  // Apelată după crearea unei locații noi (dashboard-ul deschide invitația pentru administrator).
  onLocationCreated?: (locationId: string) => void;
  setSettingsError: (value: string) => void;
  setSettingsMessage: (value: string) => void;
};

/**
 * Location editor modal: owner adds/edits a location (incl. plan / billing /
 * validity), a manager can only rename the current one. Extracted verbatim from
 * app/dashboard/page.tsx — behaviour unchanged.
 */
// Hook-ul editorului de locații.
export function useLocationEditor({
  db,
  user,
  isOwner,
  canEditCurrentLocation,
  locations,
  requireOnline,
  recordAuditLog,
  setActiveLocationId,
  onLocationCreated,
  setSettingsError,
  setSettingsMessage,
}: UseLocationEditorParams) {
  const msg = useAppText();
  // Starea editorului: locația în editare (null = închis) și eroarea afișată în fereastră.
  const [locationEditor, setLocationEditor] = useState<LocationEditor | null>(null);
  const [locationError, setLocationError] = useState("");

  // Deschide editorul pentru o locație nouă sau existentă; doar proprietarul sau managerul locației curente.
  function openLocationEditor(item?: LocationItem) {
    if (!isOwner && !canEditCurrentLocation) {
      return;
    }

    // O locație nouă pornește cu planul Pro pe 365 de zile; una existentă își păstrează valorile.
    setLocationEditor({
      id: item?.id ?? null,
      name: item?.name ?? "",
      plan: item?.plan ?? (item ? "" : "pro"),
      billingStatus: item?.billingStatus ?? "",
      durationDays: item ? "" : "365",
      address: item?.address ?? "",
      lifetime: item ? isLifetimeDate(dateFromFirestoreValue(item.subscriptionExpiresAt)) : false,
    });
    setLocationError("");
    setSettingsMessage("");
    setSettingsError("");
  }

  // Salvează: validează numele, apoi modifică locația existentă sau creează una nouă.
  async function saveLocation() {
    if ((!isOwner && !canEditCurrentLocation) || !locationEditor) {
      return;
    }

    if (!requireOnline("location")) {
      return;
    }

    const name = locationEditor.name.trim();

    if (!name) {
      setLocationError(msg("msg.locationNameRequired"));
      return;
    }

    setLocationError("");

    try {
      if (locationEditor.id) {
        const previousLocation = locations.find((item) => item.id === locationEditor.id) ?? null;
        const updatedLocation: Record<string, unknown> = {
          name,
          updatedBy: user?.email ?? "",
          updatedAt: Timestamp.now(),
        };

        // Doar proprietarul poate schimba planul, starea de facturare și valabilitatea (1-3660 zile) a unei locații.
        if (isOwner) {
          const selectedPlan = (locationEditor.plan || previousLocation?.plan || "standard") as LocationPlan;
          const lifetimeRequested = locationEditor.lifetime && selectedPlan !== "trial";
          const selectedStatus = lifetimeRequested
            ? "active"
            : locationEditor.billingStatus || (selectedPlan === "trial" ? "trialing" : "active");
          updatedLocation.plan = selectedPlan;
          updatedLocation.billingStatus = selectedStatus;

          const durationText = locationEditor.durationDays.trim();
          const wasLifetime = isLifetimeDate(dateFromFirestoreValue(previousLocation?.subscriptionExpiresAt));

          if (lifetimeRequested) {
            // „Pe viață”: expirare în 2100, fără dată de probă.
            updatedLocation.subscriptionExpiresAt = Timestamp.fromDate(lifetimeExpiryDate());
            updatedLocation.trialEndsAt = null;
          } else if (!durationText && wasLifetime) {
            // S-a debifat „pe viață”: trebuie aleasă o valabilitate nouă.
            setLocationError(msg("msg.durationRange"));
            return;
          } else if (durationText) {
            const durationDays = Number.parseInt(durationText, 10);

            if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3660) {
              setLocationError(msg("msg.durationRange"));
              return;
            }

            const expiresAt = Timestamp.fromDate(new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000));

            if (selectedStatus === "trialing") {
              updatedLocation.trialEndsAt = expiresAt;
              updatedLocation.subscriptionExpiresAt = null;
            } else {
              updatedLocation.subscriptionExpiresAt = expiresAt;
              updatedLocation.trialEndsAt = null;
            }
          }
        }

        await updateDoc(doc(db, "locations", locationEditor.id), updatedLocation);
        await recordAuditLog("location", "update", locationEditor.id, previousLocation, updatedLocation, locationEditor.id, name);
      } else {
        // Locație nouă creată de proprietar, fără administrator: nume, adresă, plan și valabilitate (sau „pe viață”).
        // Identificatorul vine din adresă (ca la configurarea făcută de un manager), deci aceeași adresă nu poate apărea de două ori.
        const address = locationEditor.address.trim();

        if (!address) {
          setLocationError(msg("msg.locationAddressRequired"));
          return;
        }

        const plan = (locationEditor.plan || "pro") as LocationPlan;
        const lifetimeRequested = locationEditor.lifetime && plan !== "trial";
        const durationDays = Number.parseInt(locationEditor.durationDays, 10);

        if (!lifetimeRequested && (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3660)) {
          setLocationError(msg("msg.durationRange"));
          return;
        }

        const createdId = locationDocumentId("", address, name);
        const createdRef = doc(db, "locations", createdId);

        if ((await getDoc(createdRef)).exists()) {
          setLocationError(msg("msg.locationExists"));
          return;
        }

        const expiresAt = lifetimeRequested
          ? Timestamp.fromDate(lifetimeExpiryDate())
          : Timestamp.fromDate(new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000));
        const trialing = plan === "trial";
        const createdPayload = {
          name,
          address,
          officialAddress: address,
          placeId: "",
          ownerEmail: user?.email ?? "",
          createdBy: user?.email ?? "",
          createdAt: Timestamp.now(),
          deleted: false,
          ...initialLocationBillingFields(),
          plan,
          billingStatus: trialing ? "trialing" : "active",
          trialEndsAt: trialing ? expiresAt : null,
          subscriptionExpiresAt: trialing ? null : expiresAt,
        };
        await setDoc(createdRef, createdPayload);
        await recordAuditLog("location", "create", createdId, null, createdPayload, createdId, name);
        setActiveLocationId(createdId);
        onLocationCreated?.(createdId);
      }

      setLocationEditor(null);
      setSettingsMessage(locationEditor.id ? msg("msg.locationUpdated") : msg("msg.locationAdded"));
    } catch (error) {
      console.error("Locația nu a putut fi salvată:", error);
      setLocationError(msg("msg.locationSaveFailed"));
    }
  }

  return { locationEditor, locationError, setLocationEditor, setLocationError, openLocationEditor, saveLocation };
}
