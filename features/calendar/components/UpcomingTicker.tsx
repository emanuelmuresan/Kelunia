"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { addDays, dateKey, formatDateLabel } from "@/lib/dates";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { Booking } from "@/lib/types/domain";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";

type UpcomingTickerProps = {
  bookings: Booking[];
  today: string;
  settings: UpcomingTickerSettings;
  language?: SupportedLocale;
  onSelectBooking: (booking: Booking) => void;
};

const lightText = "#ffffff";
const darkText = "#111827";

function isDarkColor(hex: string) {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);

  return luminance < 0.4;
}

/** The chosen text colour, or white/near-black depending on how dark the band is. */
export function tickerTextColor(settings: Pick<UpcomingTickerSettings, "color" | "textColor">) {
  return settings.textColor || (isDarkColor(settings.color) ? lightText : darkText);
}

const pixelsPerSecond = 55;

export function upcomingForTicker(bookings: Booking[], today: string, leadDays: number) {
  const end = dateKey(addDays(new Date(), leadDays));

  return bookings
    .filter((booking) => booking.startDate >= today && booking.startDate <= end)
    .sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime));
}

export function UpcomingTicker({ bookings, today, settings, language = "ro", onSelectBooking }: UpcomingTickerProps) {
  const upcoming = useMemo(
    () => upcomingForTicker(bookings, today, settings.leadDays),
    [bookings, today, settings.leadDays]
  );
  const bandRef = useRef<HTMLDivElement | null>(null);
  const setRef = useRef<HTMLDivElement | null>(null);
  const [flow, setFlow] = useState({ copies: 2, setWidth: 0 });

  // Repeat the run until one copy is wider than the band, then slide by exactly
  // one copy: the text keeps flowing with no gap or jump, however few events.
  useEffect(() => {
    const band = bandRef.current;
    const set = setRef.current;

    if (!band || !set) {
      return;
    }

    function measure() {
      const bandWidth = band?.clientWidth ?? 0;
      const setWidth = set?.scrollWidth ?? 0;

      if (setWidth > 0) {
        setFlow({ copies: Math.max(2, Math.ceil(bandWidth / setWidth) + 1), setWidth });
      }
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(band);
    observer.observe(set);

    return () => observer.disconnect();
  }, [upcoming, settings.enabled]);

  if (!settings.enabled) {
    return null;
  }

  const palette = {
    ["--ticker-accent" as string]: settings.color,
    ["--ticker-text" as string]: tickerTextColor(settings),
  };

  if (upcoming.length === 0) {
    const emptyKey = settings.leadDays === 1 ? "calendar.tickerEmptyOne" : "calendar.tickerEmpty";

    return (
      <div className="upcoming-ticker upcoming-ticker-empty" style={palette}>
        <span>{appText(language, emptyKey).replace("{{days}}", String(settings.leadDays))}</span>
      </div>
    );
  }

  const durationSeconds = Math.max(8, flow.setWidth / pixelsPerSecond);

  return (
    <div className="upcoming-ticker" ref={bandRef} style={palette} aria-label="Evenimente viitoare">
      <div
        className="upcoming-ticker-track"
        style={{
          ["--ticker-shift" as string]: `${flow.setWidth}px`,
          animationDuration: `${durationSeconds}s`,
        }}
      >
        {Array.from({ length: flow.copies }, (_, copyIndex) => (
          <div
            aria-hidden={copyIndex > 0 ? true : undefined}
            className="upcoming-ticker-set"
            key={copyIndex}
            ref={copyIndex === 0 ? setRef : undefined}
          >
            {upcoming.map((booking) => (
              <button
                className="upcoming-ticker-item"
                key={booking.id}
                onClick={() => onSelectBooking(booking)}
                tabIndex={copyIndex > 0 ? -1 : undefined}
                type="button"
              >
                <span className="upcoming-ticker-when">
                  {formatDateLabel(booking.startDate)} · {booking.startTime}
                </span>
                <span className="upcoming-ticker-what">
                  {booking.group}
                  {booking.room ? ` — ${booking.room}` : ""}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
