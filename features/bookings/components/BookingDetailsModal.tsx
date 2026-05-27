"use client";

import { formatDateLabel } from "@/lib/dates";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
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
  onNotify?: () => void;
  notificationBusy?: boolean;
  notificationMessage?: string;
  language?: SupportedLocale;
};

export function BookingDetailsModal({
  booking,
  groups,
  canEdit,
  canCreate = false,
  onAdd,
  onClose,
  onEdit,
  onDelete,
  onNotify,
  notificationBusy = false,
  notificationMessage = "",
  language = "ro",
}: BookingDetailsModalProps) {
  if (!booking) {
    return null;
  }

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

        <div className="modal-actions">
          {canEdit && (
            <>
              {onNotify && (
                <button
                  className="secondary-button"
                  onClick={onNotify}
                  disabled={notificationBusy}
                  type="button"
                >
                  {notificationBusy ? appText(language, "booking.sending") : appText(language, "booking.notifications")}
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

        {notificationMessage && (
          <p className="success-line settings-alert">{notificationMessage}</p>
        )}
      </div>
    </div>
  );
}
