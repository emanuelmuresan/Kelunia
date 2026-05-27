"use client";

import { formatDateLabel } from "@/lib/dates";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { Booking, GroupItem } from "@/lib/types/domain";

type DayBookingsModalProps = {
  date: string | null;
  bookings: Booking[];
  groups: GroupItem[];
  canCreate: boolean;
  profileGroupName?: string;
  language?: SupportedLocale;
  onAdd: () => void;
  onClose: () => void;
  onSelectBooking: (booking: Booking) => void;
};

export function DayBookingsModal({
  date,
  bookings,
  groups,
  canCreate,
  language = "ro",
  onAdd,
  onClose,
  onSelectBooking,
}: DayBookingsModalProps) {
  if (!date) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card day-bookings-card" role="dialog" aria-modal="true" aria-label={appText(language, "booking.details")}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{appText(language, "nav.calendar")}</span>
            <h2>{formatDateLabel(date, { year: "numeric" })}</h2>
          </div>

          <button onClick={onClose} type="button" aria-label={appText(language, "booking.close")}>
            ×
          </button>
        </div>

        {bookings.length === 0 ? (
          <p className="empty-line day-bookings-empty">{appText(language, "booking.noneToday")}</p>
        ) : (
          <div className="day-bookings-list">
            {bookings.map((booking) => (
              <button
                className={groupColorForName(groups, booking.group) ? "group-colored-booking" : ""}
                key={booking.id}
                onClick={() => onSelectBooking(booking)}
                style={groupColorStyle(groupColorForName(groups, booking.group))}
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
              {appText(language, "booking.new")}
            </button>
          )}

          <button className="secondary-button" onClick={onClose} type="button">
            {appText(language, "action.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
