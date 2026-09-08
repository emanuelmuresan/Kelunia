"use client";

import type { Toast } from "@/features/shell/hooks/useToasts";

type ToastStackProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
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

          <button className="toast-close" type="button" aria-label="Închide" onClick={() => onDismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
