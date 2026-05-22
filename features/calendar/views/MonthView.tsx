"use client";

import { bookingsForDay, isGroupBooking } from "@/lib/scheduling";
import { parseDateKey } from "@/lib/dates";
import type { Booking } from "@/lib/types/domain";

type MonthViewProps = {
  shortDayLabels: string[];
  monthCells: (string | null)[];
  today: string;
  bookings: Booking[];
  canManageBookings: boolean;
  isOnline: boolean;
  profileGroupName?: string;
  onDateSelect: (date: string) => void;
  onCreateBooking: (date: string) => void;
  onSelectBooking: (booking: Booking) => void;
};

export function MonthView({
  shortDayLabels,
  monthCells,
  today,
  bookings,
  canManageBookings,
  isOnline,
  profileGroupName,
  onDateSelect,
  onCreateBooking,
  onSelectBooking,
}: MonthViewProps) {
  return (
    <div className="month-calendar">
      {shortDayLabels.map((day) => (
        <div className="month-heading" key={day}>
          {day}
        </div>
      ))}

      {monthCells.map((cell, index) => {
        const dayBookings = cell ? bookingsForDay(bookings, cell) : [];

        return (
          <div
            className={`month-cell ${cell === today ? "today" : ""} ${cell ? "" : "muted"}`}
            key={`${cell ?? "blank"}-${index}`}
            onClick={() => cell && onDateSelect(cell)}
          >
            {cell && (
              <>
                <div className="cell-date">
                  <span>{parseDateKey(cell).getDate()}</span>

                  {canManageBookings && (
                    <button
                      disabled={!isOnline}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateBooking(cell);
                      }}
                      type="button"
                      aria-label="Adaugă"
                    >
                      +
                    </button>
                  )}
                </div>

                <div className="cell-events">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <button
                      className={isGroupBooking(booking, profileGroupName) ? "own-group-booking" : ""}
                      key={booking.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectBooking(booking);
                      }}
                      type="button"
                    >
                      <strong>{booking.startTime}</strong>
                      <span>{booking.group}</span>
                    </button>
                  ))}

                  {dayBookings.length > 3 && (
                    <small>+{dayBookings.length - 3}</small>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
