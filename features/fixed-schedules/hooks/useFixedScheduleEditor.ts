"use client";

import { useAppText } from "@/features/shell/hooks/useAppText";
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
  pushToast: (input: { message: string; actionLabel?: string; onAction?: () => void | Promise<void>; tone?: "default" | "error" }) => string;
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
  pushToast,
  setSettingsMessage,
}: UseFixedScheduleEditorParams) {
  const msg = useAppText();
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
      setFixedError(msg("msg.fixedFillAll"));
      return;
    }

    if (timeToMinutes(fixedDraft.endTime) <= timeToMinutes(fixedDraft.startTime)) {
      setFixedError(msg("msg.endTimeAfterStart"));
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
      setSettingsMessage(fixedEditingId ? msg("msg.fixedUpdated") : msg("msg.fixedAdded"));
    } catch (error) {
      console.error("Programul nu a putut fi salvat:", error);
      setFixedError(msg("msg.fixedSaveFailed"));
    }
  }

  async function removeFixedSchedule(itemId: string) {
    if (!canEditCurrentLocation || !requireOnline("fixed")) {
      return;
    }

    setFixedError("");

    try {
      const previousSchedule = fixedSchedules.find((item) => item.id === itemId) ?? null;
      const deletedPayload = softDeletePayload();
      await updateDoc(doc(db, "fixedSchedules", itemId), deletedPayload);
      await updateLocationCounterSafely(db, currentLocationId, "fixedScheduleCount", -1);
      await recordAuditLog("fixedSchedule", "delete", itemId, previousSchedule, previousSchedule ? { ...previousSchedule, ...deletedPayload } : deletedPayload);
      pushToast({
        message: msg("msg.fixedDeleted"),
        actionLabel: msg("msg.undo"),
        onAction: () => restoreFixedSchedule(itemId),
      });
    } catch (error) {
      console.error("Programul nu a putut fi șters:", error);
      setFixedError(msg("msg.fixedDeleteFailed"));
    }
  }

  async function restoreFixedSchedule(itemId: string) {
    try {
      await updateDoc(doc(db, "fixedSchedules", itemId), {
        deleted: false,
        deletedAt: null,
        deletedBy: "",
        deletedByUid: "",
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      });
      await updateLocationCounterSafely(db, currentLocationId, "fixedScheduleCount", 1);
    } catch (error) {
      console.error("Anularea ștergerii nu a reușit:", error);
      setFixedError(msg("msg.undoFailed"));
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
