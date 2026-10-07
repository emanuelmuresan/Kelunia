"use client";

import { useAuth } from "@/context/AuthContext";
import type { Toast } from "@/features/shell/hooks/useToasts";
import { appText } from "@/lib/i18n/app-copy-catalog";

type ToastStackProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  const { profile } = useAuth();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast ${toast.tone === "error" ? "toast-error" : ""}`} key={toast.id}>
          <span>{toast.message}</span>

          {toast.actionLabel && toast.onAction && (
            <button
              className="toast-action"
              type="button"
              onClick={() => {
                void toast.onAction?.();
                onDismiss(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          )}

          <button className="toast-close" type="button" aria-label={appText(profile?.language ?? "ro", "booking.close")} onClick={() => onDismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
