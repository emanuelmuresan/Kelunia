"use client";

// Un rând din lista de rezervări, cu data, grupul, ora, camera și motivul, plus butoane de editare și ștergere.
import { formatDateLabel } from "@/lib/dates";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { Booking, GroupItem } from "@/lib/types/domain";

// Proprietățile rândului: rezervarea, grupurile (pentru culoare) și acțiunile.
type BookingRowProps = {
  booking: Booking;
  groups: GroupItem[];
  profileGroupName?: string;
  language?: SupportedLocale;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

// Componenta rândului.
export function BookingRow({
  booking,
  groups,
  language = "ro",
  canEdit,
  onOpen,
  onEdit,
  onDelete,
}: BookingRowProps) {
  // Rândul se colorează cu culoarea grupului.
  return (
    <article
      className={`booking-row ${
        groupColorForName(groups, booking.group) ? "group-colored-booking" : ""
      }`}
      style={groupColorStyle(groupColorForName(groups, booking.group))}
    >
      {/* Zona care deschide detaliile rezervării. */}
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

      {/* Butoanele de editare și ștergere, doar pentru cine are voie. */}
      {canEdit && (
        <div className="row-actions">
          <button
            onClick={onEdit}
            type="button"
            aria-label={appText(language, "booking.edit")}
          >
            ✎
          </button>

          <button
            onClick={onDelete}
            type="button"
            aria-label={appText(language, "action.delete")}
          >
            ×
          </button>
        </div>
      )}
    </article>
  );
}
