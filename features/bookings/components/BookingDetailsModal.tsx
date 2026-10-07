"use client";

// Fereastra cu detaliile unei rezervări: data, ora, motivul, autorul și acțiunile permise (notificare, editare, ștergere, repetare, adăugare).
import { formatDateLabel } from "@/lib/dates";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { Booking, GroupItem } from "@/lib/types/domain";

// Proprietățile ferestrei: rezervarea, permisiunile și acțiunile; fără rezervare nu se afișează nimic.
type BookingDetailsModalProps = {
  booking: Booking | null;
  groups: GroupItem[];
  profileGroupName?: string;
  canEdit: boolean;
  canCreate?: boolean;
  onAdd?: () => void;
  onDuplicate?: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNotify?: (scope: "group" | "location") => void;
  canNotifyWholeLocation?: boolean;
  groupsLabel?: string;
  notificationBusy?: boolean;
  notificationMessage?: string;
  language?: SupportedLocale;
};

// Componenta ferestrei.
export function BookingDetailsModal({
  booking,
  groups,
  canEdit,
  canCreate = false,
  onAdd,
  onDuplicate,
  onClose,
  onEdit,
  onDelete,
  onNotify,
  canNotifyWholeLocation = false,
  groupsLabel = "Grup",
  notificationBusy = false,
  notificationMessage = "",
  language = "ro",
}: BookingDetailsModalProps) {
  // Fără rezervare selectată fereastra este închisă.
  if (!booking) {
    return null;
  }

  // Structura ferestrei; se colorează cu culoarea grupului rezervării.
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className={`modal-card details-card ${
          groupColorForName(groups, booking.group) ? "group-colored-booking" : ""
        }`}
        style={groupColorStyle(groupColorForName(groups, booking.group))}
        role="dialog"
        aria-modal="true"
        aria-label={appText(language, "booking.details")}
      >
        {/* Antetul: camera, grupul și butonul de închidere. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">{booking.room}</span>
            <h2>{booking.group}</h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label={appText(language, "booking.close")}
          >
            ×
          </button>
        </div>

        {/* Lista detaliilor rezervării. */}
        <dl className="details-list">
          <div>
            <dt>{appText(language, "booking.date")}</dt>
            <dd>
              {formatDateLabel(booking.startDate, {
                year: "numeric",
              })}
            </dd>
          </div>

          <div>
            <dt>{appText(language, "booking.time")}</dt>
            <dd>
              {booking.startTime} - {booking.endTime}
            </dd>
          </div>

          <div>
            <dt>{appText(language, "booking.reason")}</dt>
            <dd>{booking.reason}</dd>
          </div>

          <div>
            <dt>{appText(language, "booking.createdBy")}</dt>
            <dd>
              {booking.authorName || booking.authorEmail}
            </dd>
          </div>

          {booking.updatedBy && (
            <div>
              <dt>{appText(language, "booking.updatedBy")}</dt>
              <dd>{booking.updatedBy}</dd>
            </div>
          )}
        </dl>

        {/* Acțiunile; editarea, ștergerea și notificările apar doar celor care au voie. */}
        <div className="modal-actions">
          {canEdit && (
            <>
              {onNotify && (
                <button
                  className="secondary-button"
                  onClick={() => onNotify("group")}
                  disabled={notificationBusy}
                  type="button"
                >
                  {notificationBusy
                    ? appText(language, "booking.sending")
                    : appText(language, "booking.notifyToGroup").replace("{{label}}", groupsLabel.toLowerCase())}
                </button>
              )}

              {onNotify && canNotifyWholeLocation && (
                <button
                  className="secondary-button"
                  onClick={() => onNotify("location")}
                  disabled={notificationBusy}
                  type="button"
                >
                  {appText(language, "booking.notifyToLocation")}
                </button>
              )}

              <button
                className="secondary-button"
                onClick={onEdit}
                type="button"
              >
                {appText(language, "booking.edit")}
              </button>

              <button
                className="danger-button"
                onClick={onDelete}
                type="button"
              >
                {appText(language, "action.delete")}
              </button>
            </>
          )}

          {canCreate && onDuplicate && (
            <button
              className="secondary-button"
              onClick={onDuplicate}
              type="button"
            >
              Repetă
            </button>
          )}

          {canCreate && onAdd && (
            <button
              className="secondary-button"
              onClick={onAdd}
              type="button"
            >
              {appText(language, "booking.add")}
            </button>
          )}

          <button
            className="primary-button"
            onClick={onClose}
            type="button"
          >
            {appText(language, "action.done")}
          </button>
        </div>

        {/* Rezultatul trimiterii notificării. */}
        {notificationMessage && (
          <p className="success-line settings-alert">{notificationMessage}</p>
        )}
      </div>
    </div>
  );
}
