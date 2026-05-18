import { collection, limit, orderBy, query, where, type Firestore } from "firebase/firestore";
import { addDays, dateKey, getMonthEnd, getMonthStart, getWeekStart, parseDateKey } from "@/lib/dates";
import type { AppView, CalendarMode, ListFilter } from "@/lib/types/domain";

export const bookingsQueryLimit = 500;

export function bookingQueryWindow(date: Date, view: AppView, mode: CalendarMode, filter: ListFilter) {
  const todayDate = parseDateKey(dateKey(new Date()));

  if (view === "list") {
    if (filter === "past") {
      return {
        start: dateKey(addDays(todayDate, -365)),
        end: dateKey(todayDate),
      };
    }

    if (filter === "all") {
      return {
        start: dateKey(addDays(todayDate, -365)),
        end: dateKey(addDays(todayDate, 365)),
      };
    }

    return {
      start: dateKey(todayDate),
      end: dateKey(addDays(todayDate, 365)),
    };
  }

  if (mode === "day") {
    return {
      start: dateKey(addDays(date, -60)),
      end: dateKey(addDays(date, 30)),
    };
  }

  if (mode === "week") {
    const weekStart = getWeekStart(date);
    return {
      start: dateKey(addDays(weekStart, -60)),
      end: dateKey(addDays(weekStart, 20)),
    };
  }

  return {
    start: dateKey(addDays(getMonthStart(date), -60)),
    end: dateKey(addDays(getMonthEnd(date), 14)),
  };
}

export function buildBookingsQuery(db: Firestore, locationId: string, startDate: string, endDate: string) {
  return query(
    collection(db, "events"),
    where("locationId", "==", locationId),
    where("startDate", ">=", startDate),
    where("startDate", "<=", endDate),
    orderBy("startDate", "asc"),
    limit(bookingsQueryLimit)
  );
}
