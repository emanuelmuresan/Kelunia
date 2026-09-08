"use client";

import { useCallback, useRef, useState } from "react";

export type Toast = {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  tone?: "default" | "error";
};

type PushToastInput = Omit<Toast, "id"> & { durationMs?: number };

/** Minimal transient-notification queue (used for "booking deleted · Undo"). */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current[id];

    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    ({ durationMs = 6000, ...toast }: PushToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      timers.current[id] = setTimeout(() => dismissToast(id), durationMs);

      return id;
    },
    [dismissToast]
  );

  return { toasts, pushToast, dismissToast };
}
