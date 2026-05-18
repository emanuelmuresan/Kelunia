import {
  datesInRange,
  weekdayIndexFromKey,
} from "@/lib/dates";
import { dateRangesOverlap, timeRangesOverlap } from "@/lib/scheduling";
import type { Booking, BookingForm, FixedSchedule } from "@/lib/types/domain";

type FindBookingConflictParams = {
  bookings: Booking[];
  fixedSchedules: FixedSchedule[];
  form: BookingForm;
  ignoredId: string | null;
};

export function findBookingConflict({
  bookings,
  fixedSchedules,
  form,
  ignoredId,
}: FindBookingConflictParams) {
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
