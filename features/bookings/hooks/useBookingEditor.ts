"use client";

// Editorul de rezervări: formularul (creare, editare, duplicare), validările, salvarea prin funcția cloud saveBooking,
// ștergerea logică cu „Anulează” și înregistrarea în jurnalul de audit. Folosit de app/dashboard/page.tsx.
import { useAppText } from "@/features/shell/hooks/useAppText";
import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  doc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

import type { UserProfile, UserRole } from "@/context/AuthContext";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import { emptyForm } from "@/lib/config/app";
import { cloudFunctions } from "@/lib/firebase";
import { can, type PermissionContext } from "@/lib/permissions/capabilities";
import { normalizeNotificationOffsetRules, notificationOffsetToKey, requestKeluniaNotificationPermission } from "@/lib/notifications";
import { timeToMinutes } from "@/lib/scheduling";
import { updateLocationCounterSafely } from "@/lib/usage-counters";
import type { Booking, BookingForm, FixedSchedule, GroupItem, RoomItem } from "@/lib/types/domain";
import { findBookingConflict } from "@/features/bookings/services/booking-conflicts";

// Tipuri locale: accesul de scriere dat de licență și forma funcției de audit.
type LicenseWriteAccess = {
  isReadOnly: boolean;
  message: string;
};

type RecordAuditLog = (
  entityType: AuditEntityType,
  action: AuditAction,
  entityId: string,
  before: unknown,
  after: unknown,
  auditLocationId?: string,
  auditLocationName?: string
) => Promise<void>;

// Parametrii hook-ului: rezervările vizibile, permisiunile, locația, datele auxiliare și funcțiile din dashboard.
type UseBookingEditorParams = {
  bookings: Booking[];
  canManageBookings: boolean;
  currentLocationId: string;
  db: Firestore;
  fixedSchedules: FixedSchedule[];
  groups: GroupItem[];
  isOnline: boolean;
  licenseAccess: LicenseWriteAccess;
  locationName: string;
  offlineMessage: string;
  permissionContext: PermissionContext;
  profile: UserProfile | null;
  recordAuditLog: RecordAuditLog;
  role: UserRole;
  rooms: RoomItem[];
  setIsOnline: (value: boolean) => void;
  setSelectedBooking: Dispatch<SetStateAction<Booking | null>>;
  setSettingsError: (message: string) => void;
  softDeletePayload: () => Record<string, unknown>;
  user: User | null;
  pushToast: (input: {
    message: string;
    actionLabel?: string;
    onAction?: () => void | Promise<void>;
    tone?: "default" | "error";
    durationMs?: number;
  }) => string;
};

// Hook-ul editorului; returnează starea formularului și acțiunile.
export function useBookingEditor({
  bookings,
  canManageBookings,
  currentLocationId,
  db,
  fixedSchedules,
  groups,
  isOnline,
  licenseAccess,
  locationName,
  offlineMessage,
  permissionContext,
  profile,
  recordAuditLog,
  role,
  rooms,
  setIsOnline,
  setSelectedBooking,
  setSettingsError,
  softDeletePayload,
  user,
  pushToast,
}: UseBookingEditorParams) {
  // Starea editorului: fereastra deschisă, rezervarea editată (null = nouă), datele formularului și eroarea.
  const msg = useAppText();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingForm>(emptyForm);
  const [formError, setFormError] = useState("");

  // Dacă lista de grupuri sau camere se schimbă, selecțiile care nu mai există se golesc.
  useEffect(() => {
    setFormData((current) => ({
      ...current,
      group: current.group && groups.some((group) => group.name === current.group) ? current.group : "",
      room: current.room && rooms.some((room) => room.name === current.room || room.id === current.roomId) ? current.room : "",
      roomId: current.roomId && rooms.some((room) => room.id === current.roomId) ? current.roomId : rooms.find((room) => room.name === current.room)?.id ?? "",
    }));
  }, [groups, rooms]);

  // Fără internet formularul nu poate fi trimis și afișează mesajul offline.
  function requireBookingOnline() {
    const connected = typeof navigator === "undefined" ? isOnline : navigator.onLine;

    if (connected) {
      return true;
    }

    setIsOnline(false);
    setFormError(offlineMessage);
    return false;
  }

  // Cine poate edita: managerii orice rezervare, membrii doar pe ale lor (după emailul autorului), în limitele licenței.
  function canEditBooking(booking: Booking) {
    return Boolean(
      user &&
      can("booking.update", permissionContext) &&
      (role === "manager" || (role === "member" && booking.authorEmail === user.email))
    );
  }

  // Deschide formularul gol pentru o rezervare nouă; fără drept de scriere afișează motivul (licență) sau nu face nimic.
  function openCreateForm(date?: string, options?: { defaultStartTime?: string }) {
    if (!canManageBookings) {
      if (licenseAccess.isReadOnly) {
        setSettingsError(licenseAccess.message);
      }
      return;
    }

    if (!requireBookingOnline()) {
      return;
    }

    setEditingId(null);
    setFormError("");
    setFormData({
      ...emptyForm,
      startDate: date ?? "",
      startTime: options?.defaultStartTime ?? "",
    });
    setShowBookingModal(true);
  }

  // Deschide formularul cu datele unei rezervări existente pentru editare.
  function openEditForm(booking: Booking) {
    if (!canEditBooking(booking)) {
      return;
    }

    setSelectedBooking(null);
    setEditingId(booking.id);
    setFormError("");
    setFormData({
      group: booking.group,
      room: booking.room,
      roomId: booking.roomId || rooms.find((room) => room.name === booking.room)?.id || "",
      startDate: booking.startDate,
      endDate: booking.endDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      reason: booking.reason,
      notifyOnThisBooking: Boolean(booking.notifyOnThisBooking && booking.notifyForUid === user?.uid),
      notifyOffsets: booking.notifyOffsets?.length ? booking.notifyOffsets : ["15m"],
      notifyGroupOnThisBooking: Boolean(booking.notifyGroupOnThisBooking),
      notifyGroupOffsets: booking.notifyGroupOffsets?.length ? booking.notifyGroupOffsets : ["15m"],
      notifyGroupAudience: booking.notifyGroupAudience === "selected" ? "selected" : "all",
      notifyGroupRecipients: booking.notifyGroupRecipients?.length ? booking.notifyGroupRecipients : [],
      notifyNowScope: "group",
    });
    setShowBookingModal(true);
  }

  // Repetă o rezervare: copiază grupul, camera, orele și motivul, dar lasă datele necompletate.
  function duplicateBooking(booking: Booking) {
    if (!canManageBookings || !requireBookingOnline()) {
      return;
    }

    setSelectedBooking(null);
    setEditingId(null);
    setFormError("");
    setFormData({
      group: booking.group,
      room: booking.room,
      roomId: booking.roomId || rooms.find((room) => room.name === booking.room)?.id || "",
      startDate: "",
      endDate: "",
      startTime: booking.startTime,
      endTime: booking.endTime,
      reason: booking.reason,
      notifyOnThisBooking: false,
      notifyOffsets: ["15m"],
      notifyGroupOnThisBooking: false,
      notifyGroupOffsets: ["15m"],
      notifyGroupAudience: "all",
      notifyGroupRecipients: [],
      notifyNowScope: "group",
    });
    setShowBookingModal(true);
  }

  // Trimiterea formularului: validează, verifică conflictele și salvează prin funcția cloud.
  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    // Validări: conexiune, drepturi, data, grupul și camera, camera permisă, ordinea datelor și a orelor.
    if (!requireBookingOnline()) {
      return;
    }

    if (!user || !canManageBookings) {
      setFormError(licenseAccess.isReadOnly ? licenseAccess.message : msg("msg.bookingNeedRights"));
      return;
    }

    if (!formData.startDate) {
      setFormError(msg("msg.chooseDate"));
      return;
    }

    if (!formData.group || !formData.room) {
      setFormError(msg("msg.chooseGroupRoom"));
      return;
    }

    const selectedRoom = rooms.find((room) => room.id === formData.roomId || room.name === formData.room);

    if (!selectedRoom) {
      setFormError(msg("msg.chooseAccessibleRoom"));
      return;
    }

    const normalizedEndDate = formData.endDate || formData.startDate;

    if (normalizedEndDate < formData.startDate) {
      setFormError(msg("msg.endDateAfterStart"));
      return;
    }

    if (timeToMinutes(formData.endTime) <= timeToMinutes(formData.startTime)) {
      setFormError(msg("msg.endTimeAfterStart"));
      return;
    }

    // Conflict cu altă rezervare sau cu un program fix în aceeași cameră.
    const conflict = findBookingConflict({
      bookings,
      fixedSchedules,
      form: { ...formData, endDate: normalizedEndDate },
      ignoredId: editingId,
    });

    if (conflict) {
      setFormError(msg("msg.bookingConflict", { conflict }));
      return;
    }

    // Datele pentru notificări: momentele alese, destinatarii și dacă s-a apăsat „trimite acum grupului”.
    const originalBooking = editingId ? bookings.find((booking) => booking.id === editingId) : null;
    const bookingNotificationOffsets = normalizeNotificationOffsetRules(formData.notifyOffsets);
    const groupNotificationOffsets = normalizeNotificationOffsetRules(formData.notifyGroupOffsets);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const shouldNotifyGroupNow = submitter?.value === "notify-group-now";
    const selectedGroupRecipients = formData.notifyGroupAudience === "selected"
      ? formData.notifyGroupRecipients.map((email) => email.trim().toLowerCase()).filter(Boolean)
      : [];

    // Notificarea proprie cere cel puțin un moment și permisiunea de notificare; cea pentru grup cere momente și destinatari.
    if (formData.notifyOnThisBooking) {
      if (bookingNotificationOffsets.length === 0) {
        setFormError(msg("msg.chooseBookingNotifMoment"));
        return;
      }

      const notificationsAllowed = await requestKeluniaNotificationPermission();

      if (!notificationsAllowed) {
        setFormError(msg("msg.notifDenied"));
        return;
      }
    }

    if (formData.notifyGroupOnThisBooking && groupNotificationOffsets.length === 0) {
      setFormError(msg("msg.chooseGroupReminderMoment"));
      return;
    }

    if ((formData.notifyGroupOnThisBooking || shouldNotifyGroupNow) && formData.notifyGroupAudience === "selected" && selectedGroupRecipients.length === 0) {
      setFormError(msg("msg.choosePersonOrGroup"));
      return;
    }

    // Datele rezervării, inclusiv câmpurile vechi (congregatie, orar, motiv, location) păstrate pentru compatibilitate.
    const payload = {
      group: formData.group,
      congregatie: formData.group,
      room: selectedRoom.name,
      roomId: selectedRoom.id,
      location: selectedRoom.name,
      startDate: formData.startDate,
      endDate: normalizedEndDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      orar: `${formData.startTime} - ${formData.endTime}`,
      reason: formData.reason,
      motiv: formData.reason,
      authorEmail: editingId ? originalBooking?.authorEmail ?? user.email : user.email,
      authorName: editingId ? originalBooking?.authorName ?? profile?.displayName ?? user.email : profile?.displayName ?? user.email,
      updatedBy: profile?.displayName ?? user.email,
      locationId: currentLocationId,
      locationName,
      notifyOnThisBooking: formData.notifyOnThisBooking,
      notifyOffsets: formData.notifyOnThisBooking ? bookingNotificationOffsets.map(notificationOffsetToKey) : [],
      notifyForUid: formData.notifyOnThisBooking ? user.uid : "",
      ...(formData.notifyGroupOnThisBooking
        ? {
          notifyGroupOnThisBooking: true,
          notifyGroupOffsets: groupNotificationOffsets.map(notificationOffsetToKey),
        }
        : {}),
      ...((formData.notifyGroupOnThisBooking || shouldNotifyGroupNow)
        ? {
          notifyGroupAudience: formData.notifyGroupAudience,
          notifyGroupRecipients: selectedGroupRecipients,
        }
        : {}),
      ...(shouldNotifyGroupNow
        ? {
          notifyGroupNowAt: Timestamp.now(),
          notifyGroupNowBy: user.email ?? profile?.displayName ?? "",
        }
        : {}),
      updatedAt: Timestamp.now(),
    };

    // Salvarea se face în funcția cloud, nu direct în Firestore; după succes se scrie în jurnalul de audit.
    try {
      const saveBooking = httpsCallable(cloudFunctions, "saveBooking");
      const savePayload = {
        editingId: editingId ?? "",
        group: payload.group,
        room: payload.room,
        roomId: payload.roomId,
        locationId: payload.locationId,
        locationName: payload.locationName,
        startDate: payload.startDate,
        endDate: payload.endDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        reason: payload.reason,
        notifyOnThisBooking: payload.notifyOnThisBooking,
        notifyOffsets: payload.notifyOffsets,
        notifyForUid: payload.notifyForUid,
        notifyGroupOnThisBooking: payload.notifyGroupOnThisBooking === true,
        notifyGroupOffsets: payload.notifyGroupOffsets ?? [],
        notifyGroupAudience: payload.notifyGroupAudience ?? "all",
        notifyGroupRecipients: payload.notifyGroupRecipients ?? [],
        notifyGroupNow: shouldNotifyGroupNow,
        notifyNowScope: formData.notifyNowScope,
      };

      if (editingId) {
        await saveBooking(savePayload);
        await recordAuditLog("booking", "update", editingId, originalBooking, payload);
      } else {
        const result = await saveBooking(savePayload);
        const createdId = typeof result.data === "object" && result.data && "id" in result.data ? String(result.data.id) : "";
        await recordAuditLog("booking", "create", createdId || "booking", null, payload);
      }

      setShowBookingModal(false);
      setEditingId(null);
    } catch (error) {
      console.error("Programarea nu a putut fi salvată:", error);
      setFormError(error instanceof Error ? msg("msg.bookingSaveFailedDetail", { detail: error.message }) : msg("msg.bookingSaveFailed"));
    }
  }

  // Anulează o ștergere: scoate marcajul de ștergere, readuce contorul și scrie în audit.
  async function restoreBooking(booking: Booking) {
    try {
      await updateDoc(doc(db, "events", booking.id), {
        deleted: false,
        deletedAt: null,
        deletedBy: "",
        deletedByUid: "",
        updatedBy: profile?.displayName ?? user?.email ?? "",
        updatedAt: Timestamp.now(),
      });
      void updateLocationCounterSafely(db, booking.locationId || currentLocationId, "bookingCount", 1).catch(
        (error) => console.warn("Contorul de programări nu a putut fi actualizat:", error)
      );
      void recordAuditLog(
        "booking",
        "update",
        booking.id,
        { ...booking, deleted: true },
        { ...booking, deleted: false },
        booking.locationId,
        booking.locationName || locationName
      ).catch(() => undefined);
    } catch (error) {
      console.error("Anularea ștergerii nu a reușit:", error);
      setFormError(msg("msg.undoFailed"));
    }
  }

  // Șterge logic rezervarea (marcaj deleted, fără a o elimina), actualizează contorul și auditul în fundal și oferă „Anulează”.
  async function removeBooking(booking: Booking) {
    if (!canEditBooking(booking) || !requireBookingOnline()) {
      return;
    }

    const deletedPayload = softDeletePayload();

    try {
      await updateDoc(doc(db, "events", booking.id), deletedPayload);
    } catch (error) {
      console.error("Programarea nu a putut fi ștearsă:", error);
      setFormError(msg("msg.bookingDeleteFailed"));
      return;
    }

    // The row already disappears via the Firestore local cache; close the details
    // modal now and let the counter + audit log settle in the background.
    setSelectedBooking(null);

    void updateLocationCounterSafely(db, booking.locationId || currentLocationId, "bookingCount", -1).catch(
      (error) => console.warn("Contorul de programări nu a putut fi actualizat:", error)
    );
    void recordAuditLog(
      "booking",
      "delete",
      booking.id,
      booking,
      { ...booking, ...deletedPayload },
      booking.locationId,
      booking.locationName || locationName
    ).catch((error) => console.warn("Jurnalul de audit pentru ștergere nu a putut fi scris:", error));

    pushToast({
      message: msg("msg.bookingDeleted"),
      actionLabel: msg("msg.undo"),
      onAction: () => restoreBooking(booking),
    });
  }

  // Starea și acțiunile expuse dashboard-ului.
  return {
    canEditBooking,
    duplicateBooking,
    editingId,
    formData,
    formError,
    handleBookingSubmit,
    openCreateForm,
    openEditForm,
    removeBooking,
    setFormData,
    setShowBookingModal,
    showBookingModal,
  };
}
