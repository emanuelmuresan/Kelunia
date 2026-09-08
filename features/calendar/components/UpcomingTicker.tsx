"use client";

import { useMemo } from "react";

import { addDays, dateKey, formatDateLabel } from "@/lib/dates";
import type { Booking } from "@/lib/types/domain";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";

type UpcomingTickerProps = {
  bookings: Booking[];
  today: string;
  settings: UpcomingTickerSettings;
  onSelectBooking: (booking: Booking) => void;
};

export function upcomingForTicker(bookings: Booking[], today: string, leadDays: number) {
  const end = dateKey(addDays(new Date(), leadDays));

  return bookings
    .filter((booking) => booking.startDate >= today && booking.startDate <= end)
    .sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime));
}

export function UpcomingTicker({ bookings, today, settings, onSelectBooking }: UpcomingTickerProps) {
  const upcoming = useMemo(
    () => upcomingForTicker(bookings, today, settings.leadDays),
    [bookings, today, settings.leadDays]
  );

  if (!settings.enabled || upcoming.length === 0) {
    return null;
  }

  // Duplicate the run so the marquee can loop seamlessly.
  const run = [...upcoming, ...upcoming];
  const durationSeconds = Math.max(12, upcoming.length * 6);

  return (
    <div className="upcoming-ticker" style={{ ["--ticker-accent" as string]: settings.color }} aria-label="Evenimente viitoare">
      <div className="upcoming-ticker-track" style={{ animationDuration: `${durationSeconds}s` }}>
        {run.map((booking, index) => (
          <button
            className="upcoming-ticker-item"
            key={`${booking.id}-${index}`}
            onClick={() => onSelectBooking(booking)}
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
    </div>
  );
}
