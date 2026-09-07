"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, doc, Timestamp, updateDoc, type Firestore } from "firebase/firestore";

import type { RecordAuditLog } from "@/lib/audit";
import { emptyFixedDraft } from "@/lib/config/app";
import { timeToMinutes } from "@/lib/scheduling";
import { updateLocationCounterSafely } from "@/lib/usage-counters";
import type { FixedSchedule, FixedScheduleDraft, WriteTarget } from "@/lib/types/domain";

type UseFixedScheduleEditorParams = {
  db: Firestore;
  user: User | null;
  fixedSchedules: FixedSchedule[];
  currentLocationId: string;
  locationName: string;
  canEditCurrentLocation: boolean;
  requireOnline: (target?: WriteTarget) => boolean;
  softDeletePayload: () => Record<string, unknown>;
  recordAuditLog: RecordAuditLog;
  setSettingsMessage: (value: string) => void;
};

/**
 * Fixed-schedule manager + form: open the manager, add/edit/close the form,
 * save and soft-delete a schedule. Extracted verbatim from
 * app/dashboard/page.tsx — behaviour unchanged.
 */
export function useFixedScheduleEditor({
  db,
  user,
  fixedSchedules,
  currentLocationId,
  locationName,
  canEditCurrentLocation,
  requireOnline,
  softDeletePayload,
  recordAuditLog,
  setSettingsMessage,
}: UseFixedScheduleEditorParams) {
  const [showFixedManager, setShowFixedManager] = useState(false);
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [fixedEditingId, setFixedEditingId] = useState<string | null>(null);
  const [fixedDraft, setFixedDraft] = useState<FixedScheduleDraft>(emptyFixedDraft);
  const [fixedError, setFixedError] = useState("");

  function openFixedManager() {
    if (!canEditCurrentLocation) {
      return;
    }

    setFixedDraft(emptyFixedDraft);
    setFixedEditingId(null);
    setShowFixedForm(false);
    setFixedError("");
    setShowFixedManager(true);
  }

  function startFixedAdd() {
    if (!canEditCurrentLocation) {
      return;
    }

    setFixedDraft(emptyFixedDraft);
    setFixedEditingId(null);
    setFixedError("");
    setShowFixedForm(true);
  }

  function startFixedEdit(item: FixedSchedule) {
    if (!canEditCurrentLocation) {
      return;
    }

    setFixedDraft({
      dayIndex: item.dayIndex,
      group: item.group,
      room: item.room,
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
    });
    setFixedEditingId(item.id);
    setFixedError("");
    setShowFixedForm(true);
  }

  function closeFixedForm() {
    setShowFixedForm(false);
    setFixedEditingId(null);
    setFixedDraft(emptyFixedDraft);
    setFixedError("");
  }

  async function saveFixedSchedule() {
    if (!canEditCurrentLocation) {
      return;
    }

    setFixedError("");

    if (!requireOnline("fixed")) {
      return;
    }

    if (
      fixedDraft.dayIndex === "" ||
      !fixedDraft.group ||
      !fixedDraft.room ||
      !fixedDraft.startTime ||
      !fixedDraft.endTime ||
      !fixedDraft.title.trim()
    ) {
      setFixedError("Completează ziua, grupul, sala, orele și numele.");
      return;
    }

    if (timeToMinutes(fixedDraft.endTime) <= timeToMinutes(fixedDraft.startTime)) {
      setFixedError("Ora de final trebuie să fie după ora de început.");
      return;
    }

    try {
      const previousSchedule = fixedEditingId ? fixedSchedules.find((item) => item.id === fixedEditingId) ?? null : null;
      const payload = {
        dayIndex: fixedDraft.dayIndex,
        group: fixedDraft.group,
        room: fixedDraft.room,
        startTime: fixedDraft.startTime,
        endTime: fixedDraft.endTime,
        title: fixedDraft.title.trim(),
        locationId: currentLocationId,
        locationName,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      };

      if (fixedEditingId) {
        await updateDoc(doc(db, "fixedSchedules", fixedEditingId), payload);
        await recordAuditLog("fixedSchedule", "update", fixedEditingId, previousSchedule, payload);
      } else {
        const createdPayload = { ...payload, createdAt: Timestamp.now(), deleted: false };
        const created = await addDoc(collection(db, "fixedSchedules"), createdPayload);
        await updateLocationCounterSafely(db, currentLocationId, "fixedScheduleCount", 1);
        await recordAuditLog("fixedSchedule", "create", created.id, null, createdPayload);
      }

      setFixedDraft(emptyFixedDraft);
      setFixedEditingId(null);
      setShowFixedForm(false);
      setFixedError("");
      setSettingsMessage(fixedEditingId ? "Programul a fost actualizat." : "Programul a fost adăugat.");
    } catch (error) {
      console.error("Programul nu a putut fi salvat:", error);
      setFixedError("Firebase nu permite încă salvarea programului. Actualizează regulile Firestore pentru administrator.");
    }
  }

  async function removeFixedSchedule(itemId: string) {
    if (!canEditCurrentLocation || !requireOnline("fixed") || !confirm("Ștergi acest program?")) {
      return;
    }

    setFixedError("");

    try {
      const previousSchedule = fixedSchedules.find((item) => item.id === itemId) ?? null;
      const deletedPayload = softDeletePayload();
      await updateDoc(doc(db, "fixedSchedules", itemId), deletedPayload);
      await updateLocationCounterSafely(db, currentLocationId, "fixedScheduleCount", -1);
      await recordAuditLog("fixedSchedule", "delete", itemId, previousSchedule, previousSchedule ? { ...previousSchedule, ...deletedPayload } : deletedPayload);
      setSettingsMessage("Programul a fost șters.");
    } catch (error) {
      console.error("Programul nu a putut fi șters:", error);
      setFixedError("Firebase nu permite încă ștergerea programului.");
    }
  }

  return {
    showFixedManager,
    showFixedForm,
    fixedEditingId,
    fixedDraft,
    fixedError,
    setShowFixedManager,
    setShowFixedForm,
    setFixedDraft,
    setFixedError,
    openFixedManager,
    startFixedAdd,
    startFixedEdit,
    closeFixedForm,
    saveFixedSchedule,
    removeFixedSchedule,
  };
}
