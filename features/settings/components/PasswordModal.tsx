"use client";

type PasswordDraft = {
  current: string;
  next: string;
  confirm: string;
};

type PasswordModalProps = {
  open: boolean;
  passwordDraft: PasswordDraft;
  passwordError: string;
  passwordMessage: string;
  onClose: () => void;
  onChange: (value: PasswordDraft) => void;
  onSave: () => void;
  onReset: () => void;
};

export function PasswordModal({
  open,
  passwordDraft,
  passwordError,
  passwordMessage,
  onClose,
  onChange,
  onSave,
  onReset,
}: PasswordModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-label="Schimbare parolă"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">Cont</span>
            <h2>Schimbă parola</h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Închide"
          >
            ×
          </button>
        </div>

        <div className="settings-form">
          <label>
            Parola actuală

            <input
              type="password"
              value={passwordDraft.current}
              onChange={(event) =>
                onChange({
                  ...passwordDraft,
                  current: event.target.value,
                })
              }
              autoComplete="current-password"
            />
          </label>

          <label>
            Parola nouă

            <input
              type="password"
              value={passwordDraft.next}
              onChange={(event) =>
                onChange({
                  ...passwordDraft,
                  next: event.target.value,
                })
              }
              autoComplete="new-password"
            />
          </label>

          <label>
            Confirmă parola nouă

            <input
              type="password"
              value={passwordDraft.confirm}
              onChange={(event) =>
                onChange({
                  ...passwordDraft,
                  confirm: event.target.value,
                })
              }
              autoComplete="new-password"
            />
          </label>

          {passwordError && (
            <p className="error-line">
              {passwordError}
            </p>
          )}

          {passwordMessage && (
            <p className="success-line">
              {passwordMessage}
            </p>
          )}

          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={onReset}
              type="button"
            >
              Trimite email resetare
            </button>

            <button
              className="primary-button"
              onClick={onSave}
              type="button"
            >
              Schimbă parola
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}