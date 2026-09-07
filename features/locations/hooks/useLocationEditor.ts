"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, doc, Timestamp, updateDoc, type Firestore } from "firebase/firestore";

import type { RecordAuditLog } from "@/lib/audit";
import { initialLocationBillingFields } from "@/lib/licensing";
import type { LocationEditor, LocationItem, LocationPlan, WriteTarget } from "@/lib/types/domain";

type UseLocationEditorParams = {
  db: Firestore;
  user: User | null;
  isOwner: boolean;
  canEditCurrentLocation: boolean;
  locations: LocationItem[];
  requireOnline: (target?: WriteTarget) => boolean;
  recordAuditLog: RecordAuditLog;
  setActiveLocationId: (locationId: string) => void;
  setSettingsError: (value: string) => void;
  setSettingsMessage: (value: string) => void;
};

/**
 * Location editor modal: owner adds/edits a location (incl. plan / billing /
 * validity), a manager can only rename the current one. Extracted verbatim from
 * app/dashboard/page.tsx — behaviour unchanged.
 */
export function useLocationEditor({
  db,
  user,
  isOwner,
  canEditCurrentLocation,
  locations,
  requireOnline,
  recordAuditLog,
  setActiveLocationId,
  setSettingsError,
  setSettingsMessage,
}: UseLocationEditorParams) {
  const [locationEditor, setLocationEditor] = useState<LocationEditor | null>(null);
  const [locationError, setLocationError] = useState("");

  function openLocationEditor(item?: LocationItem) {
    if (!isOwner && !canEditCurrentLocation) {
      return;
    }

    setLocationEditor({
      id: item?.id ?? null,
      name: item?.name ?? "",
      plan: item?.plan ?? "",
      billingStatus: item?.billingStatus ?? "",
      durationDays: "",
    });
    setLocationError("");
    setSettingsMessage("");
    setSettingsError("");
  }

  async function saveLocation() {
    if ((!isOwner && !canEditCurrentLocation) || !locationEditor) {
      return;
    }

    if (!requireOnline("location")) {
      return;
    }

    const name = locationEditor.name.trim();

    if (!name) {
      setLocationError("Scrie numele locației.");
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

        if (isOwner) {
          const selectedPlan = (locationEditor.plan || previousLocation?.plan || "standard") as LocationPlan;
          const selectedStatus = locationEditor.billingStatus || (selectedPlan === "trial" ? "trialing" : "active");
          updatedLocation.plan = selectedPlan;
          updatedLocation.billingStatus = selectedStatus;

          const durationText = locationEditor.durationDays.trim();

          if (durationText) {
            const durationDays = Number.parseInt(durationText, 10);

            if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3660) {
              setLocationError("Valabilitatea trebuie sa fie intre 1 si 3660 zile.");
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
        const createdPayload = {
          name,
          ownerEmail: user?.email ?? "",
          createdBy: user?.email ?? "",
          createdAt: Timestamp.now(),
          deleted: false,
          ...initialLocationBillingFields(),
        };
        const created = await addDoc(collection(db, "locations"), createdPayload);
        await recordAuditLog("location", "create", created.id, null, createdPayload, created.id, name);
        setActiveLocationId(created.id);
      }

      setLocationEditor(null);
      setSettingsMessage(locationEditor.id ? "Locația a fost actualizată." : "Locația a fost adăugată.");
    } catch (error) {
      console.error("Locația nu a putut fi salvată:", error);
      setLocationError("Locația nu a putut fi salvată. Verifică regulile Firebase.");
    }
  }

  return { locationEditor, locationError, setLocationEditor, setLocationError, openLocationEditor, saveLocation };
}
