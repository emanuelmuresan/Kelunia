"use client";

// Coada de notificări mici (toast): adaugă, închide automat după un timp și permite acțiuni (ex. „Anulează”).
import { useCallback, useRef, useState } from "react";

// O notificare: mesaj, acțiune opțională și ton (obișnuit sau eroare).
export type Toast = {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  tone?: "default" | "error";
};

// Datele pentru o notificare nouă; durata implicită este 6 secunde.
type PushToastInput = Omit<Toast, "id"> & { durationMs?: number };

/** Minimal transient-notification queue (used for "booking deleted · Undo"). */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Cronometrele de închidere automată, pe id.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Închide o notificare și oprește cronometrul ei.
  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current[id];

    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  // Adaugă o notificare; se păstrează cel mult ultimele trei.
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
