"use client";

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

import type { UserProfile, UserRole } from "@/context/AuthContext";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import { emptyForm } from "@/lib/config/app";
import { can, type PermissionContext } from "@/lib/permissions/capabilities";
import { normalizeNotificationOffsetRules, notificationOffsetToKey, requestKeluniaNotificationPermission } from "@/lib/notifications";
import { timeToMinutes } from "@/lib/scheduling";
import { updateLocationCounterSafely } from "@/lib/usage-counters";
import type { Booking, BookingForm, FixedSchedule, GroupItem, RoomItem } from "@/lib/types/domain";
import { findBookingConflict } from "@/features/bookings/services/booking-conflicts";

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
};

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
}: UseBookingEditorParams) {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingForm>(emptyForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      group: current.group && groups.some((group) => group.name === current.group) ? current.group : "",
      room: current.room && rooms.some((room) => room.name === current.room || room.id === current.roomId) ? current.room : "",
      roomId: current.roomId && rooms.some((room) => room.id === current.roomId) ? current.roomId : rooms.find((room) => room.name === current.room)?.id ?? "",
    }));
  }, [groups, rooms]);

  function requireBookingOnline() {
    const connected = typeof navigator === "undefined" ? isOnline : navigator.onLine;

    if (connected) {
      return true;
    }

    setIsOnline(false);
    setFormError(offlineMessage);
    return false;
  }

  function canEditBooking(booking: Booking) {
    return Boolean(
      user &&
      can("booking.update", permissionContext) &&
      (role === "manager" || (role === "member" && booking.authorEmail === user.email))
    );
  }

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
      notifyOffsets: booking.notifyOffsets?.length ? booking.notifyOffsets : ["1h"],
      notifyGroupOnThisBooking: Boolean(booking.notifyGroupOnThisBooking),
      notifyGroupOffsets: booking.notifyGroupOffsets?.length ? booking.notifyGroupOffsets : ["1h"],
      notifyGroupAudience: booking.notifyGroupAudience === "selected" ? "selected" : "all",
      notifyGroupRecipients: booking.notifyGroupRecipients?.length ? booking.notifyGroupRecipients : [],
    });
    setShowBookingModal(true);
  }

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!requireBookingOnline()) {
      return;
    }

    if (!user || !canManageBookings) {
      setFormError(licenseAccess.isReadOnly ? licenseAccess.message : "Ai nevoie de drepturi de colaborator sau administrator pentru programări.");
      return;
    }

    if (!formData.startDate) {
      setFormError("Alege data programării.");
      return;
    }

    if (!formData.group || !formData.room) {
      setFormError("Alege grupul și sala.");
      return;
    }

    const selectedRoom = rooms.find((room) => room.id === formData.roomId || room.name === formData.room);

    if (!selectedRoom) {
      setFormError("Alege o sala la care ai acces.");
      return;
    }

    const normalizedEndDate = formData.endDate || formData.startDate;

    if (normalizedEndDate < formData.startDate) {
      setFormError("Data de final trebuie să fie după data de început.");
      return;
    }

    if (timeToMinutes(formData.endTime) <= timeToMinutes(formData.startTime)) {
      setFormError("Ora de final trebuie să fie după ora de început.");
      return;
    }

    const conflict = findBookingConflict({
      bookings,
      fixedSchedules,
      form: { ...formData, endDate: normalizedEndDate },
      ignoredId: editingId,
    });

    if (conflict) {
      setFormError(`Există deja o programare: ${conflict}.`);
      return;
    }

    const originalBooking = editingId ? bookings.find((booking) => booking.id === editingId) : null;
    const bookingNotificationOffsets = normalizeNotificationOffsetRules(formData.notifyOffsets);
    const groupNotificationOffsets = normalizeNotificationOffsetRules(formData.notifyGroupOffsets);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const shouldNotifyGroupNow = submitter?.value === "notify-group-now";
    const selectedGroupRecipients = formData.notifyGroupAudience === "selected"
      ? formData.notifyGroupRecipients.map((email) => email.trim().toLowerCase()).filter(Boolean)
      : [];

    if (formData.notifyOnThisBooking) {
      if (bookingNotificationOffsets.length === 0) {
        setFormError("Alege cel puțin un moment pentru notificarea programării.");
        return;
      }

      const notificationsAllowed = await requestKeluniaNotificationPermission();

      if (!notificationsAllowed) {
        setFormError("Notificările nu au fost permise pe acest dispozitiv.");
        return;
      }
    }

    if (formData.notifyGroupOnThisBooking && groupNotificationOffsets.length === 0) {
      setFormError("Alege cel puțin un moment pentru reminderul de grup.");
      return;
    }

    if ((formData.notifyGroupOnThisBooking || shouldNotifyGroupNow) && formData.notifyGroupAudience === "selected" && selectedGroupRecipients.length === 0) {
      setFormError("Alege cel puțin o persoană din grup sau trimite către tot grupul.");
      return;
    }

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
      notifyGroupOnThisBooking: formData.notifyGroupOnThisBooking,
      notifyGroupOffsets: formData.notifyGroupOnThisBooking ? groupNotificationOffsets.map(notificationOffsetToKey) : [],
      notifyGroupAudience: formData.notifyGroupAudience,
      notifyGroupRecipients: selectedGroupRecipients,
      ...(shouldNotifyGroupNow
        ? {
          notifyGroupNowAt: Timestamp.now(),
          notifyGroupNowBy: user.email ?? profile?.displayName ?? "",
        }
        : {}),
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), payload);
        await recordAuditLog("booking", "update", editingId, originalBooking, payload);
      } else {
        const createdPayload = { ...payload, createdAt: Timestamp.now(), deleted: false };
        const created = await addDoc(collection(db, "events"), createdPayload);
        await updateLocationCounterSafely(db, currentLocationId, "bookingCount", 1);
        await recordAuditLog("booking", "create", created.id, null, createdPayload);
      }

      setShowBookingModal(false);
      setEditingId(null);
    } catch (error) {
      console.error("Programarea nu a putut fi salvată:", error);
      setFormError(error instanceof Error ? `Programarea nu a putut fi salvată: ${error.message}` : "Programarea nu a putut fi salvată.");
    }
  }

  async function removeBooking(booking: Booking) {
    if (!canEditBooking(booking) || !requireBookingOnline() || !confirm("Ștergi această programare?")) {
      return;
    }

    try {
      const deletedPayload = softDeletePayload();
      await updateDoc(doc(db, "events", booking.id), deletedPayload);
      await updateLocationCounterSafely(db, booking.locationId || currentLocationId, "bookingCount", -1);
      await recordAuditLog(
        "booking",
        "delete",
        booking.id,
        booking,
        { ...booking, ...deletedPayload },
        booking.locationId,
        booking.locationName || locationName
      );
      setSelectedBooking(null);
    } catch (error) {
      console.error("Programarea nu a putut fi ștearsă:", error);
      setFormError("Programarea nu a putut fi ștearsă.");
    }
  }

  return {
    canEditBooking,
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
