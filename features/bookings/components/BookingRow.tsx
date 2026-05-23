"use client";

import { formatDateLabel } from "@/lib/dates";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import type { Booking, GroupItem } from "@/lib/types/domain";

type BookingRowProps = {
  booking: Booking;
  groups: GroupItem[];
  profileGroupName?: string;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function BookingRow({
  booking,
  groups,
  canEdit,
  onOpen,
  onEdit,
  onDelete,
}: BookingRowProps) {
  return (
    <article
      className={`booking-row ${
        groupColorForName(groups, booking.group) ? "group-colored-booking" : ""
      }`}
      style={groupColorStyle(groupColorForName(groups, booking.group))}
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
