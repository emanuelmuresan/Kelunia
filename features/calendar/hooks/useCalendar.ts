"use client";

// Calculele calendarului: zilele perioadei active, celulele lunii, cele 12 luni ale anului, titlul perioadei și navigarea.
import { useMemo, type Dispatch, type SetStateAction } from "react";

import { addDays, dateKey, formatDateLabel, getWeekStart, parseDateKey } from "@/lib/dates";
import type { CalendarMode } from "@/lib/types/domain";

// Parametrii: modul calendarului, data curentă și funcția care o schimbă.
type UseCalendarParams = {
  calendarMode: CalendarMode;
  currentDate: Date;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
};

// Hook-ul calendarului.
export function useCalendar({
  calendarMode,
  currentDate,
  setCurrentDate,
}: UseCalendarParams) {
  // Zilele perioadei active (o zi sau cele 7 ale săptămânii, începând de luni).
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

  // Celulele unei luni: goluri înainte de prima zi, zilele lunii, goluri până la complet de săptămână (null = gol).
  function buildMonthCells(year: number, month: number) {
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
  }

  // Celulele lunii curente și cele ale tuturor lunilor anului curent.
  const monthCells = useMemo(
    () => buildMonthCells(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const yearMonths = useMemo(() => {
    const year = currentDate.getFullYear();

    return Array.from({ length: 12 }, (_, month) => ({
      month,
      year,
      firstDateKey: dateKey(new Date(year, month, 1)),
      label: new Date(year, month, 1).toLocaleDateString("ro-RO", { month: "long" }),
      cells: buildMonthCells(year, month),
    }));
  }, [currentDate]);

  // Titlul perioadei afișate (an, lună, săptămână sau zi), în română.
  const periodTitle = useMemo(() => {
    if (calendarMode === "year") {
      return String(currentDate.getFullYear());
    }

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

  // Mută perioada cu un an, o lună, o săptămână sau o zi, înainte (+1) sau înapoi (-1).
  function movePeriod(direction: -1 | 1) {
    const copy = new Date(currentDate);

    if (calendarMode === "year") {
      copy.setFullYear(copy.getFullYear() + direction);
    } else if (calendarMode === "month") {
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
    yearMonths,
    movePeriod,
    periodTitle,
  };
}
