// Verifică dacă o rezervare nouă intră în conflict cu alta sau cu un program fix, în aceeași cameră.
import {
  datesInRange,
  weekdayIndexFromKey,
} from "@/lib/dates";
import { dateRangesOverlap, timeRangesOverlap } from "@/lib/scheduling";
import type { Booking, BookingForm, FixedSchedule } from "@/lib/types/domain";

// Datele verificării: rezervările existente, programele fixe, formularul și rezervarea editată (ignorată).
type FindBookingConflictParams = {
  bookings: Booking[];
  fixedSchedules: FixedSchedule[];
  form: BookingForm;
  ignoredId: string | null;
};

// Returnează un text care descrie conflictul, sau șir gol dacă nu există.
export function findBookingConflict({
  bookings,
  fixedSchedules,
  form,
  ignoredId,
}: FindBookingConflictParams) {
  // Conflict cu altă rezervare: aceeași cameră, date care se suprapun și ore care se suprapun.
  const normalizedEndDate = form.endDate || form.startDate;
  const eventConflict = bookings.find((booking) => {
    if (ignoredId && booking.id === ignoredId) {
      return false;
    }

    return (
      (booking.roomId && form.roomId ? booking.roomId === form.roomId : booking.room === form.room) &&
      dateRangesOverlap(form.startDate, normalizedEndDate, booking.startDate, booking.endDate) &&
      timeRangesOverlap(form.startTime, form.endTime, booking.startTime, booking.endTime)
    );
  });

  if (eventConflict) {
    return `${eventConflict.group}, ${eventConflict.startTime}-${eventConflict.endTime}, ${eventConflict.room}`;
  }

  // Conflict cu un program fix: aceeași cameră, o zi din interval cade în ziua programului și orele se suprapun.
  const fixedConflict = fixedSchedules.find((schedule) => {
    if (schedule.room !== form.room) {
      return false;
    }

    const touchesDay = datesInRange(form.startDate, normalizedEndDate).some((date) => weekdayIndexFromKey(date) === schedule.dayIndex);
    return touchesDay && timeRangesOverlap(form.startTime, form.endTime, schedule.startTime, schedule.endTime);
  });

  if (fixedConflict) {
    return `${fixedConflict.title}, ${fixedConflict.group}, ${fixedConflict.startTime}-${fixedConflict.endTime}`;
  }

  return "";
}
