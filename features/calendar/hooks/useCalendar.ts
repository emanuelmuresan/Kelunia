"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";

import { addDays, dateKey, formatDateLabel, getWeekStart, parseDateKey } from "@/lib/dates";
import type { CalendarMode } from "@/lib/types/domain";

type UseCalendarParams = {
  calendarMode: CalendarMode;
  currentDate: Date;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
};

export function useCalendar({
  calendarMode,
  currentDate,
  setCurrentDate,
}: UseCalendarParams) {
  const activePeriodDays = useMemo(() => {
    if (calendarMode === "day") {
      return [dateKey(currentDate)];
    }

    if (calendarMode === "week") {
      const start = getWeekStart(currentDate);
      return Array.from({ length: 7 }, (_, index) => dateKey(addDays(start, index)));
    }

    return [];
  }, [calendarMode, currentDate]);

  const monthCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const blanks = (firstDay.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];

    for (let i = 0; i < blanks; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= count; day += 1) {
      cells.push(dateKey(new Date(year, month, day)));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentDate]);

  const periodTitle = useMemo(() => {
    if (calendarMode === "month") {
      return currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    }

    if (calendarMode === "week") {
      const start = getWeekStart(currentDate);
      const end = addDays(start, 6);
      return `${formatDateLabel(dateKey(start))} - ${formatDateLabel(dateKey(end), { year: "numeric" })}`;
    }

    return parseDateKey(dateKey(currentDate)).toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [calendarMode, currentDate]);

  function movePeriod(direction: -1 | 1) {
    const copy = new Date(currentDate);

    if (calendarMode === "month") {
      copy.setMonth(copy.getMonth() + direction);
    } else if (calendarMode === "week") {
      copy.setDate(copy.getDate() + direction * 7);
    } else {
      copy.setDate(copy.getDate() + direction);
    }

    setCurrentDate(copy);
  }

  return {
    activePeriodDays,
    monthCells,
    movePeriod,
    periodTitle,
  };
}
