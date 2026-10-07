// components/ui/Modal.tsx

"use client";

// Fereastră modală generică cu titlu și buton de închidere; neutilizată în prezent.
type ModalProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({
  open,
  title,
  children,
  onClose,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-head">
          <h2>{title}</h2>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default Modal;