"use client";

// Vederea „agendă” pentru zilele unei perioade (săptămână sau zi): o carte pe zi cu rezervările ei.
// O folosesc WeekView și DayView.
import { bookingsForDay } from "@/lib/scheduling";
import { formatDateLabel, parseDateKey } from "@/lib/dates";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import type { Booking, GroupItem } from "@/lib/types/domain";

// Proprietățile agendei: zilele, rezervările, grupurile (pentru culori) și acțiunile.
type AgendaViewProps = {
  activePeriodDays: string[];
  bookings: Booking[];
  groups: GroupItem[];
  canManageBookings: boolean;
  isOnline: boolean;
  profileGroupName?: string;
  onCreateBooking: (date: string) => void;
  onDateSelect: (date: string) => void;
  onSelectBooking: (booking: Booking) => void;
};

// Componenta agendei.
export function AgendaView({
  activePeriodDays,
  bookings,
  groups,
  canManageBookings,
  isOnline,
  onCreateBooking,
  onDateSelect,
  onSelectBooking,
}: AgendaViewProps) {
  return (
    <div className="agenda-grid">
      {/* O carte pentru fiecare zi a perioadei. */}
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

              {/* Butonul „+” pentru rezervare nouă (dezactivat offline). */}
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

            {/* Rezervările zilei, colorate după grup, sau mesajul „Nicio programare”. */}
            {dayBookings.length === 0 ? (
              <p className="empty-line">Nicio programare</p>
            ) : (
              dayBookings.map((booking) => (
                <button
                  className={`agenda-booking ${groupColorForName(groups, booking.group) ? "group-colored-booking" : ""}`}
                  key={booking.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectBooking(booking);
                  }}
                  style={groupColorStyle(groupColorForName(groups, booking.group))}
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
