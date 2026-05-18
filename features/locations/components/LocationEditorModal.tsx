"use client";

import { billingStatusLabel, planLabel } from "@/lib/licensing";
import type { LocationEditor } from "@/lib/types/domain";
import type { BillingStatus, LocationPlan } from "@/lib/types/domain";

type LocationEditorModalProps = {
  isOwner: boolean;
  locationEditor: LocationEditor | null;
  locationError: string;
  onClose: () => void;
  onChange: (value: LocationEditor) => void;
  onSave: () => void;
};

export function LocationEditorModal({
  isOwner,
  locationEditor,
  locationError,
  onClose,
  onChange,
  onSave,
}: LocationEditorModalProps) {
  if (!locationEditor) {
    return null;
  }

  const planOptions: Array<{ value: LocationPlan; label: string }> = [
    { value: "trial", label: "Trial" },
    { value: "standard", label: "Standard" },
    { value: "pro", label: "Pro" },
    { value: "business", label: "Business" },
  ];
  const statusOptions: Array<{ value: BillingStatus; label: string }> = [
    { value: "trialing", label: "Trial" },
    { value: "active", label: "Activ" },
    { value: "past_due", label: "Plata intarziata" },
    { value: "paused", label: "Pauzat" },
    { value: "expired", label: "Expirat" },
    { value: "canceled", label: "Anulat" },
  ];

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-label="Locație"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">Locație</span>

            <h2>
              {locationEditor.id
                ? "Editează locația"
                : "Adaugă locație"}
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
            Nume locație

            <input
              autoFocus
              value={locationEditor.name}
              placeholder="ex. Kelunia Bucuresti"
              onChange={(event) =>
                onChange({
                  ...locationEditor,
                  name: event.target.value,
                })
              }
            />
          </label>

          {isOwner && locationEditor.id && (
            <>
              <label>
                Tip licenta
                <select
                  value={locationEditor.plan}
                  onChange={(event) => {
                    const nextPlan = event.target.value as LocationPlan;
                    onChange({
                      ...locationEditor,
                      plan: nextPlan,
                      billingStatus: nextPlan === "trial" ? "trialing" : "active",
                    });
                  }}
                >
                  <option value="">Alege licenta</option>
                  {planOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label || planLabel(option.value)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status licenta
                <select
                  value={locationEditor.billingStatus}
                  onChange={(event) =>
                    onChange({
                      ...locationEditor,
                      billingStatus: event.target.value as BillingStatus,
                    })
                  }
                >
                  <option value="">Alege statusul</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label || billingStatusLabel(option.value)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Valabilitate noua
                <input
                  inputMode="numeric"
                  value={locationEditor.durationDays}
                  placeholder="ex. 365 - gol pastreaza data"
                  onChange={(event) =>
                    onChange({
                      ...locationEditor,
                      durationDays: event.target.value,
                    })
                  }
                />
              </label>

              <p className="muted-note">
                Daca lasi valabilitatea goala, se schimba doar planul/statusul si se pastreaza data existenta.
              </p>
            </>
          )}

          {locationError && (
            <p className="error-line">
              {locationError}
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
              {locationEditor.id ? "Salvează" : "Adaugă"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
