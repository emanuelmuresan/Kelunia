"use client";

import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { CalendarMode } from "@/lib/types/domain";

type CalendarToolbarProps = {
  periodTitle: string;
  calendarMode: CalendarMode;
  canManageBookings: boolean;
  isOnline: boolean;
  language?: SupportedLocale;
  onCreateBooking: () => void;
  onMovePeriod: (direction: -1 | 1) => void;
  onToday: () => void;
  onCalendarModeChange: (mode: CalendarMode) => void;
};

export function CalendarToolbar({
  periodTitle,
  calendarMode,
  canManageBookings,
  isOnline,
  language = "ro",
  onCreateBooking,
  onMovePeriod,
  onToday,
  onCalendarModeChange,
}: CalendarToolbarProps) {
  return (
    <>
      <div className="calendar-toolbar">
        <div>
          <span className="eyebrow">{appText(language, "nav.calendar")}</span>
          <h2>{periodTitle}</h2>
        </div>

        <div className="toolbar-actions">
          {canManageBookings && (
            <button
              className="primary-button compact"
              disabled={!isOnline}
              onClick={onCreateBooking}
              type="button"
            >
              + {appText(language, "booking.newShort")}
            </button>
          )}

          <button
            className="icon-only"
            onClick={() => onMovePeriod(-1)}
            type="button"
            aria-label={appText(language, "calendar.previous")}
          >
            ‹
          </button>

          <button
            className="secondary-button compact"
            onClick={onToday}
            type="button"
          >
            {appText(language, "calendar.today")}
          </button>

          <button
            className="icon-only"
            onClick={() => onMovePeriod(1)}
            type="button"
            aria-label={appText(language, "calendar.next")}
          >
            ›
          </button>
        </div>
      </div>

      <div className="segmented-control" role="group" aria-label={appText(language, "calendar.mode")}>
        {[
          ["month", appText(language, "calendar.month")],
          ["week", appText(language, "calendar.week")],
          ["day", appText(language, "calendar.day")],
        ].map(([value, label]) => (
          <button
            key={value}
            className={calendarMode === value ? "active" : ""}
            onClick={() => onCalendarModeChange(value as CalendarMode)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
