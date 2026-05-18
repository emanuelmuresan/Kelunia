"use client";

import { formatDateLabel } from "@/lib/dates";
import { isGroupBooking } from "@/lib/scheduling";
import type { Booking } from "@/lib/types/domain";

type BookingDetailsModalProps = {
  booking: Booking | null;
  profileGroupName?: string;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function BookingDetailsModal({
  booking,
  profileGroupName,
  canEdit,
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
          isGroupBooking(booking, profileGroupName)
            ? "own-group-booking"
            : ""
        }`}
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