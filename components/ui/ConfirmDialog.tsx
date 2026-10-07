"use client";

// Dialog simplu de confirmare cu butoane Anulează / Confirmă; neutilizat în prezent.
// Aplicația folosește ConfirmDialog din features/shell.
type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmă",
  cancelLabel = "Anulează",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>{title}</h2>

        {description && (
          <p>{description}</p>
        )}

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            className="danger-button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}