import { dateKey } from "@/lib/dates";
import { defaultLocationName } from "@/lib/config/app";
import type { Booking, FixedSchedule } from "@/lib/types/domain";

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

export function dateRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && startB <= endA;
}

export function normalizeBooking(id: string, data: Record<string, unknown>): Booking {
  const legacyTime = String(data.orar ?? "08:00 - 10:00").split(" - ");
  const startDate = String(data.startDate ?? data.date ?? dateKey(new Date()));
  const endDate = String(data.endDate ?? startDate);

  return {
    id,
    group: String(data.group ?? data.congregatie ?? ""),
    room: String(data.room ?? data.location ?? ""),
    roomId: String(data.roomId ?? ""),
    startDate,
    endDate,
    startTime: String(data.startTime ?? legacyTime[0] ?? "08:00"),
    endTime: String(data.endTime ?? legacyTime[1] ?? "10:00"),
    reason: String(data.reason ?? data.motiv ?? ""),
    authorEmail: String(data.authorEmail ?? data.author ?? ""),
    authorName: String(data.authorName ?? data.author ?? "Utilizator"),
    locationId: String(data.locationId ?? "main-location"),
    locationName: String(data.locationName ?? defaultLocationName),
    updatedBy: data.updatedBy ? String(data.updatedBy) : undefined,
    notifyOnThisBooking: Boolean(data.notifyOnThisBooking),
    notifyOffsets: Array.isArray(data.notifyOffsets) ? data.notifyOffsets.map((item) => String(item)) : [],
    notifyForUid: data.notifyForUid ? String(data.notifyForUid) : undefined,
    notifyGroupOnThisBooking: Boolean(data.notifyGroupOnThisBooking),
    notifyGroupOffsets: Array.isArray(data.notifyGroupOffsets) ? data.notifyGroupOffsets.map((item) => String(item)) : [],
    notifyGroupAudience: data.notifyGroupAudience === "selected" ? "selected" : "all",
    notifyGroupRecipients: Array.isArray(data.notifyGroupRecipients) ? data.notifyGroupRecipients.map((item) => String(item).toLowerCase()) : [],
    notifyGroupNowAt: data.notifyGroupNowAt,
    notifyGroupNowBy: data.notifyGroupNowBy ? String(data.notifyGroupNowBy) : undefined,
    createdAt: data.createdAt,
  };
}

export function bookingsForDay(bookings: Booking[], key: string) {
  return bookings
    .filter((booking) => key >= booking.startDate && key <= booking.endDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

const naturalTextSorter = new Intl.Collator("ro", {
  numeric: true,
  sensitivity: "base",
});

export function compareNaturalText(a: string, b: string) {
  return naturalTextSorter.compare(a.trim(), b.trim());
}

export function compareFixedSchedules(a: FixedSchedule, b: FixedSchedule) {
  return (
    a.dayIndex - b.dayIndex ||
    a.startTime.localeCompare(b.startTime) ||
    a.endTime.localeCompare(b.endTime) ||
    compareNaturalText(a.room, b.room) ||
    compareNaturalText(a.group, b.group) ||
    compareNaturalText(a.title, b.title)
  );
}

export function isOwnGroupName(itemGroupName: string, profileGroupName: string | undefined) {
  return Boolean(profileGroupName?.trim() && itemGroupName.trim().toLowerCase() === profileGroupName.trim().toLowerCase());
}

export function isGroupBooking(booking: Booking, groupName: string | undefined) {
  return isOwnGroupName(booking.group, groupName);
}

export function isGroupFixedSchedule(schedule: FixedSchedule, groupName: string | undefined) {
  return isOwnGroupName(schedule.group, groupName);
}

export function bookingStartDateTime(booking: Booking) {
  return new Date(`${booking.startDate}T${booking.startTime || "00:00"}`);
}

export function fixedForDay(schedules: FixedSchedule[], dayIndex: number) {
  return schedules
    .filter((schedule) => schedule.dayIndex === dayIndex)
    .sort(compareFixedSchedules);
}
