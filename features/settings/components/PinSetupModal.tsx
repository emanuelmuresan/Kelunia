"use client";

import type { PinIntent } from "@/lib/types/domain";

type PinDraft = {
  pin: string;
  confirm: string;
};

type PinSetupModalProps = {
  pinIntent: PinIntent | null;
  pinDraft: PinDraft;
  pinError: string;

  onClose: () => void;
  onChange: (value: PinDraft) => void;
  onSave: () => void;
};

export function PinSetupModal({
  pinIntent,
  pinDraft,
  pinError,
  onClose,
  onChange,
  onSave,
}: PinSetupModalProps) {
  if (!pinIntent) {
    return null;
  }

  const isBiometric = pinIntent === "biometrics";

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-label="Setare PIN"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              {isBiometric ? "PIN de rezervă" : "Blocare"}
            </span>

            <h2>
              {isBiometric
                ? "Alege PIN-ul pentru biometrie"
                : "Alege PIN-ul"}
            </h2>
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
            PIN

            <input
              inputMode="numeric"
              maxLength={8}
              pattern="[0-9]*"
              type="password"
              value={pinDraft.pin}
              onChange={(event) =>
                onChange({
                  ...pinDraft,
                  pin: event.target.value.replace(/\D/g, ""),
                })
              }
            />
          </label>

          <label>
            Confirmare PIN

            <input
              inputMode="numeric"
              maxLength={8}
              pattern="[0-9]*"
              type="password"
              value={pinDraft.confirm}
              onChange={(event) =>
                onChange({
                  ...pinDraft,
                  confirm: event.target.value.replace(/\D/g, ""),
                })
              }
            />
          </label>

          {pinError && (
            <p className="error-line">
              {pinError}
            </p>
          )}

          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={onClose}
              type="button"
            >
              Anulează
            </button>

            <button
              className="primary-button"
              onClick={onSave}
              type="button"
            >
              Salvează PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}