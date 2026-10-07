"use client";

// Fereastra „Schimbă parola”: parola curentă, parola nouă și confirmarea, plus trimiterea unui email de resetare.
// Validarea și schimbarea parolei sunt în usePasswordManagement.
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";

// Ciorna parolelor: curentă, nouă și confirmare.
type PasswordDraft = {
  current: string;
  next: string;
  confirm: string;
};

// Proprietățile ferestrei: ciorna, mesajele și acțiunile.
type PasswordModalProps = {
  open: boolean;
  passwordDraft: PasswordDraft;
  passwordError: string;
  passwordMessage: string;
  onClose: () => void;
  onChange: (value: PasswordDraft) => void;
  onSave: () => void;
  onReset: () => void;
  language?: SupportedLocale;
};

// Componenta ferestrei.
export function PasswordModal({
  open,
  passwordDraft,
  passwordError,
  passwordMessage,
  onClose,
  onChange,
  onSave,
  onReset,
  language = "ro",
}: PasswordModalProps) {
  // Fereastra închisă nu se randează.
  if (!open) {
    return null;
  }

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-label={appText(language, "settings.password")}
      >
        {/* Antetul ferestrei. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">{appText(language, "settings.account")}</span>
            <h2>{appText(language, "settings.password")}</h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label={appText(language, "booking.close")}
          >
            ×
          </button>
        </div>

        {/* Câmpurile parolelor, mesajele și butoanele. */}
        <div className="settings-form">
          <label>
            {appText(language, "settings.currentPassword")}

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
            {appText(language, "settings.newPassword")}

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
            {appText(language, "settings.confirmNewPassword")}

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
              {appText(language, "settings.resetPasswordEmail")}
            </button>

            <button
              className="primary-button"
              onClick={onSave}
              type="button"
            >
              {appText(language, "settings.password")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
