"use client";

import { formatDateLabel } from "@/lib/dates";
import { isGroupBooking } from "@/lib/scheduling";
import type { Booking } from "@/lib/types/domain";

type BookingRowProps = {
  booking: Booking;
  profileGroupName?: string;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function BookingRow({
  booking,
  profileGroupName,
  canEdit,
  onOpen,
  onEdit,
  onDelete,
}: BookingRowProps) {
  return (
    <article
      className={`booking-row ${
        isGroupBooking(booking, profileGroupName)
          ? "own-group-booking"
          : ""
      }`}
    >
      <button onClick={onOpen} type="button">
        <span className="date-badge">
          {formatDateLabel(booking.startDate, {
            year: "numeric",
          })}
        </span>

        <div>
          <strong>{booking.group}</strong>

          <p>
            {booking.startTime} - {booking.endTime} · {booking.room}
          </p>

          <small>{booking.reason}</small>
        </div>
      </button>

      {canEdit && (
        <div className="row-actions">
          <button
            onClick={onEdit}
            type="button"
            aria-label="Editează"
          >
            ✎
          </button>

          <button
            onClick={onDelete}
            type="button"
            aria-label="Șterge"
          >
            ×
          </button>
        </div>
      )}
    </article>
  );
}