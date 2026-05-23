"use client";

import { formatDateLabel } from "@/lib/dates";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import { isGroupBooking } from "@/lib/scheduling";
import type { Booking, GroupItem } from "@/lib/types/domain";

type BookingDetailsModalProps = {
  booking: Booking | null;
  groups: GroupItem[];
  profileGroupName?: string;
  canEdit: boolean;
  canCreate?: boolean;
  onAdd?: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function BookingDetailsModal({
  booking,
  groups,
  profileGroupName,
  canEdit,
  canCreate = false,
  onAdd,
  onClose,
  onEdit,
  onDelete,
}: BookingDetailsModalProps) {
  if (!booking) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className={`modal-card details-card ${
          groupColorForName(groups, booking.group)
            ? "group-colored-booking "
            : ""
        }${
          isGroupBooking(booking, profileGroupName)
            ? "own-group-booking"
            : ""
        }`}
        style={groupColorStyle(groupColorForName(groups, booking.group))}
        role="dialog"
        aria-modal="true"
        aria-label="Detalii programare"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">{booking.room}</span>
            <h2>{booking.group}</h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Închide"
          >
            ×
          </button>
        </div>

        <dl className="details-list">
          <div>
            <dt>Data</dt>
            <dd>
              {formatDateLabel(booking.startDate, {
                year: "numeric",
              })}
            </dd>
          </div>

          <div>
            <dt>Orar</dt>
            <dd>
              {booking.startTime} - {booking.endTime}
            </dd>
          </div>

          <div>
            <dt>Motiv</dt>
            <dd>{booking.reason}</dd>
          </div>

          <div>
            <dt>Introdus de</dt>
            <dd>
              {booking.authorName || booking.authorEmail}
            </dd>
          </div>

          {booking.updatedBy && (
            <div>
              <dt>Ultima editare</dt>
              <dd>{booking.updatedBy}</dd>
            </div>
          )}
        </dl>

        <div className="modal-actions">
          {canEdit && (
            <>
              <button
                className="secondary-button"
                onClick={onEdit}
                type="button"
              >
                Editează
              </button>

              <button
                className="danger-button"
                onClick={onDelete}
                type="button"
              >
                Șterge
              </button>
            </>
          )}

          {canCreate && onAdd && (
            <button
              className="secondary-button"
              onClick={onAdd}
              type="button"
            >
              Adaugă
            </button>
          )}

          <button
            className="primary-button"
            onClick={onClose}
            type="button"
          >
            Gata
          </button>
        </div>
      </div>
    </div>
  );
}
