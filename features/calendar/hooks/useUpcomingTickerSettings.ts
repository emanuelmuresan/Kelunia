"use client";

// Preferințele benzii cu evenimente următoare: pornită/oprită, culori și numărul de zile; se rețin pe fiecare dispozitiv.
import { useCallback, useEffect, useState } from "react";

// Setările benzii; culoarea textului goală înseamnă automat.
export type UpcomingTickerSettings = {
  enabled: boolean;
  color: string;
  // "" = automatic: white on dark bands, near-black on light ones.
  textColor: string;
  leadDays: number;
};

// Cheia din localStorage și valorile implicite (bandă oprită, albastru, 7 zile).
const STORAGE_KEY = "kelunia.upcomingTicker";

export const defaultUpcomingTickerSettings: UpcomingTickerSettings = {
  enabled: false,
  color: "#1787ff",
  textColor: "",
  leadDays: 7,
};

// Curăță setările: culorile trebuie să fie #rrggbb, iar numărul de zile între 1 și 60.
function sanitize(value: unknown): UpcomingTickerSettings {
  const raw = (value ?? {}) as Partial<UpcomingTickerSettings>;
  const leadDays = Number(raw.leadDays);

  return {
    enabled: raw.enabled === true,
    color: typeof raw.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : defaultUpcomingTickerSettings.color,
    textColor: typeof raw.textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.textColor) ? raw.textColor : "",
    leadDays: Number.isFinite(leadDays) ? Math.min(60, Math.max(1, Math.round(leadDays))) : defaultUpcomingTickerSettings.leadDays,
  };
}

/**
 * Per-device preferences for the upcoming-events ticker. Stored in localStorage
 * only — deliberately not synced to Firestore (no rules change, zero cost, and
 * each device can decide for itself).
 */
// Hook-ul setărilor: le citește din localStorage la montare și le scrie la fiecare modificare.
export function useUpcomingTickerSettings() {
  const [settings, setSettings] = useState<UpcomingTickerSettings>(defaultUpcomingTickerSettings);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        setSettings(sanitize(JSON.parse(stored)));
      }
    } catch {
      // private mode / blocked storage — keep defaults
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<UpcomingTickerSettings>) => {
    setSettings((current) => {
      const next = sanitize({ ...current, ...patch });

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore write failures
      }

      return next;
    });
  }, []);

  return { tickerSettings: settings, updateTickerSettings: updateSettings };
}
