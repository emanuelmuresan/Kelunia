"use client";

import { formatDateLabel } from "@/lib/dates";
import { isGroupBooking } from "@/lib/scheduling";
import type { Booking } from "@/lib/types/domain";

type DayBookingsModalProps = {
  date: string | null;
  bookings: Booking[];
  canCreate: boolean;
  profileGroupName?: string;
  onAdd: () => void;
  onClose: () => void;
  onSelectBooking: (booking: Booking) => void;
};

export function DayBookingsModal({
  date,
  bookings,
  canCreate,
  profileGroupName,
  onAdd,
  onClose,
  onSelectBooking,
}: DayBookingsModalProps) {
  if (!date) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card day-bookings-card" role="dialog" aria-modal="true" aria-label="Programările zilei">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Calendar</span>
            <h2>{formatDateLabel(date, { year: "numeric" })}</h2>
          </div>

          <button onClick={onClose} type="button" aria-label="Închide">
            ×
          </button>
        </div>

        {bookings.length === 0 ? (
          <p className="empty-line day-bookings-empty">Nicio programare în această zi.</p>
        ) : (
          <div className="day-bookings-list">
            {bookings.map((booking) => (
              <button
                className={isGroupBooking(booking, profileGroupName) ? "own-group-booking" : ""}
                key={booking.id}
                onClick={() => onSelectBooking(booking)}
                type="button"
              >
                <span>{booking.startTime} - {booking.endTime}</span>
                <strong>{booking.room}</strong>
                <small>{booking.group}</small>
              </button>
            ))}
          </div>
        )}

        <div className="modal-actions">
          {canCreate && (
            <button className="primary-button" onClick={onAdd} type="button">
              Adaugă programare
            </button>
          )}

          <button className="secondary-button" onClick={onClose} type="button">
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
