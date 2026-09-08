"use client";

import { useMemo } from "react";

import { datesInRange, parseDateKey } from "@/lib/dates";
import type { Booking } from "@/lib/types/domain";

type YearMonth = {
  month: number;
  year: number;
  firstDateKey: string;
  label: string;
  cells: (string | null)[];
};

type YearViewProps = {
  yearMonths: YearMonth[];
  bookings: Booking[];
  today: string;
  onDateSelect: (date: string) => void;
  onOpenMonth: (firstDateKey: string) => void;
};

const shortWeekdays = ["L", "M", "M", "J", "V", "S", "D"];

export function YearView({ yearMonths, bookings, today, onDateSelect, onOpenMonth }: YearViewProps) {
  const bookedDays = useMemo(() => {
    const set = new Set<string>();

    bookings.forEach((booking) => {
      datesInRange(booking.startDate, booking.endDate || booking.startDate).forEach((day) => set.add(day));
    });

    return set;
  }, [bookings]);

  return (
    <div className="year-grid">
      {yearMonths.map((monthData) => (
        <section className="year-month" key={monthData.month}>
          <button className="year-month-label" onClick={() => onOpenMonth(monthData.firstDateKey)} type="button">
            {monthData.label}
          </button>

          <div className="year-month-cells">
            {shortWeekdays.map((weekday, index) => (
              <span className="year-weekday" key={`wd-${index}`}>
                {weekday}
              </span>
            ))}

            {monthData.cells.map((cell, index) =>
              cell ? (
                <button
                  className={`year-day ${cell === today ? "today" : ""} ${bookedDays.has(cell) ? "has-booking" : ""}`}
                  key={cell}
                  onClick={() => onDateSelect(cell)}
                  type="button"
                >
                  {parseDateKey(cell).getDate()}
                </button>
              ) : (
                <span className="year-day blank" key={`blank-${monthData.month}-${index}`} />
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
