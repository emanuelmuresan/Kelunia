"use client";

import { useCallback, useEffect, useState } from "react";

export type UpcomingTickerSettings = {
  enabled: boolean;
  color: string;
  leadDays: number;
};

const STORAGE_KEY = "kelunia.upcomingTicker";

export const defaultUpcomingTickerSettings: UpcomingTickerSettings = {
  enabled: false,
  color: "#1787ff",
  leadDays: 7,
};

function sanitize(value: unknown): UpcomingTickerSettings {
  const raw = (value ?? {}) as Partial<UpcomingTickerSettings>;
  const leadDays = Number(raw.leadDays);

  return {
    enabled: raw.enabled === true,
    color: typeof raw.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : defaultUpcomingTickerSettings.color,
    leadDays: Number.isFinite(leadDays) ? Math.min(60, Math.max(1, Math.round(leadDays))) : defaultUpcomingTickerSettings.leadDays,
  };
}

/**
 * Per-device preferences for the upcoming-events ticker. Stored in localStorage
 * only — deliberately not synced to Firestore (no rules change, zero cost, and
 * each device can decide for itself).
 */
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
