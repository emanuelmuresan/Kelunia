"use client";

import { bookingsForDay, isGroupBooking } from "@/lib/scheduling";
import { formatDateLabel, parseDateKey } from "@/lib/dates";
import type { Booking } from "@/lib/types/domain";

type AgendaViewProps = {
  activePeriodDays: string[];
  bookings: Booking[];
  canManageBookings: boolean;
  isOnline: boolean;
  profileGroupName?: string;
  onCreateBooking: (date: string) => void;
  onDateSelect: (date: string) => void;
  onSelectBooking: (booking: Booking) => void;
};

export function AgendaView({
  activePeriodDays,
  bookings,
  canManageBookings,
  isOnline,
  profileGroupName,
  onCreateBooking,
  onDateSelect,
  onSelectBooking,
}: AgendaViewProps) {
  return (
    <div className="agenda-grid">
      {activePeriodDays.map((day) => {
        const dayBookings = bookingsForDay(bookings, day);

        return (
          <article
            className="agenda-day clickable-day"
            key={day}
            onClick={() => onDateSelect(day)}
          >
            <div className="agenda-day-head">
              <div>
                <span>
                  {parseDateKey(day).toLocaleDateString("ro-RO", {
                    weekday: "long",
                  })}
                </span>
                <strong>{formatDateLabel(day, { year: "numeric" })}</strong>
              </div>

              {canManageBookings && (
                <button
                  disabled={!isOnline}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCreateBooking(day);
                  }}
                  type="button"
                  aria-label="Adaugă"
                >
                  +
                </button>
              )}
            </div>

            {dayBookings.length === 0 ? (
              <p className="empty-line">Nicio programare</p>
            ) : (
              dayBookings.map((booking) => (
                <button
                  className={`agenda-booking ${
                    isGroupBooking(booking, profileGroupName)
                      ? "own-group-booking"
                      : ""
                  }`}
                  key={booking.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectBooking(booking);
                  }}
                  type="button"
                >
                  <span>
                    {booking.startTime} - {booking.endTime}
                  </span>
                  <strong>{booking.group}</strong>
                  <small>{booking.room}</small>
                </button>
              ))
            )}
          </article>
        );
      })}
    </div>
  );
}
