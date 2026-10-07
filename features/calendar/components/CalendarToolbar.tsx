"use client";

// Bara de unelte a calendarului: titlul perioadei, săgeți înainte/înapoi, butonul „Azi” și comutatorul An/Lună/Săptămână/Zi.
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { CalendarMode } from "@/lib/types/domain";

// Proprietățile: titlul perioadei, modul curent și funcțiile apelate la navigare.
type CalendarToolbarProps = {
  periodTitle: string;
  calendarMode: CalendarMode;
  language?: SupportedLocale;
  onMovePeriod: (direction: -1 | 1) => void;
  onToday: () => void;
  onCalendarModeChange: (mode: CalendarMode) => void;
};

// Componenta barei de unelte.
export function CalendarToolbar({
  periodTitle,
  calendarMode,
  language = "ro",
  onMovePeriod,
  onToday,
  onCalendarModeChange,
}: CalendarToolbarProps) {
  return (
    <>
      {/* Titlul perioadei și butoanele de navigare. */}
      <div className="calendar-toolbar">
        <div>
          <span className="eyebrow">{appText(language, "nav.calendar")}</span>
          <h2>{periodTitle}</h2>
        </div>

        <div className="toolbar-actions">
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

      {/* Comutatorul modului calendarului. */}
      <div className="segmented-control" role="group" aria-label={appText(language, "calendar.mode")}>
        {[
          ["year", appText(language, "calendar.year")],
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
