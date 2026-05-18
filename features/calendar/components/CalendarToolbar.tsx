"use client";

import type { CalendarMode } from "@/lib/types/domain";

type CalendarToolbarProps = {
  periodTitle: string;
  calendarMode: CalendarMode;
  canManageBookings: boolean;
  isOnline: boolean;
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
  onCreateBooking,
  onMovePeriod,
  onToday,
  onCalendarModeChange,
}: CalendarToolbarProps) {
  return (
    <>
      <div className="calendar-toolbar">
        <div>
          <span className="eyebrow">Calendar</span>
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
              + Rezervare nouă
            </button>
          )}

          <button
            className="icon-only"
            onClick={() => onMovePeriod(-1)}
            type="button"
            aria-label="Perioada anterioară"
          >
            ‹
          </button>

          <button
            className="secondary-button compact"
            onClick={onToday}
            type="button"
          >
            Azi
          </button>

          <button
            className="icon-only"
            onClick={() => onMovePeriod(1)}
            type="button"
            aria-label="Perioada următoare"
          >
            ›
          </button>
        </div>
      </div>

      <div className="segmented-control" role="group" aria-label="Mod calendar">
        {[
          ["month", "Lună"],
          ["week", "Săptămână"],
          ["day", "Zi"],
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