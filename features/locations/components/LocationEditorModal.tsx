"use client";

// Fereastra de adăugare/modificare a unei locații: numele (pentru toți cei care pot edita) și, doar pentru proprietar,
// blocul de licență (plan, stare de facturare, valabilitate nouă). Starea și salvarea sunt în useLocationEditor.
import { billingStatusLabel, planLabel } from "@/lib/licensing";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { LocationEditor } from "@/lib/types/domain";
import type { BillingStatus, LocationPlan } from "@/lib/types/domain";

// Proprietățile ferestrei: locația în editare, eroarea și funcțiile de schimbare, salvare și închidere.
type LocationEditorModalProps = {
  isOwner: boolean;
  locationEditor: LocationEditor | null;
  locationError: string;
  language?: SupportedLocale;
  onClose: () => void;
  onChange: (value: LocationEditor) => void;
  onSave: () => void;
};

// Componenta ferestrei.
export function LocationEditorModal({
  isOwner,
  locationEditor,
  locationError,
  language = "ro",
  onClose,
  onChange,
  onSave,
}: LocationEditorModalProps) {
  // Fără locație în editare fereastra este închisă.
  if (!locationEditor) {
    return null;
  }

  // Opțiunile pentru plan și stare de facturare.
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

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-label={appText(language, "settings.location")}
      >
        {/* Antetul: „Adaugă locația” sau „Modifică locația”. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">{appText(language, "settings.location")}</span>

            <h2>
              {locationEditor.id
                ? appText(language, "settings.editLocation")
                : appText(language, "settings.addLocation")}
            </h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label={appText(language, "booking.close")}
          >
            ×
          </button>
        </div>

        {/* Formularul locației. */}
        <div className="settings-form">
          <label>
            {appText(language, "settings.locationName")}

            <input
              autoFocus
              value={locationEditor.name}
              placeholder={appText(language, "settings.locationPlaceholder")}
              onChange={(event) =>
                onChange({
                  ...locationEditor,
                  name: event.target.value,
                })
              }
            />
          </label>

          {/* Adresa, doar la o locație nouă (identificatorul locației se formează din ea). */}
          {!locationEditor.id && (
            <label>
              {appText(language, "settings.locationAddress")}
              <input
                value={locationEditor.address}
                onChange={(event) => onChange({ ...locationEditor, address: event.target.value })}
              />
            </label>
          )}

          {/* Blocul de licență, doar pentru proprietar (la o locație nouă și la una existentă); schimbarea planului ajustează starea implicită. */}
          {isOwner && (
            <SettingsBlock title={appText(language, "settings.blockLicense")}>
              <label>
                {appText(language, "settings.licenseType")}
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
                  <option value="">{appText(language, "settings.chooseLicense")}</option>
                  {planOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label || planLabel(option.value)}
                    </option>
                  ))}
                </select>
              </label>

              {locationEditor.id && (
              <label>
                {appText(language, "settings.licenseStatus")}
                <select
                  value={locationEditor.billingStatus}
                  onChange={(event) =>
                    onChange({
                      ...locationEditor,
                      billingStatus: event.target.value as BillingStatus,
                    })
                  }
                >
                  <option value="">{appText(language, "settings.chooseStatus")}</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label || billingStatusLabel(option.value)}
                    </option>
                  ))}
                </select>
              </label>
              )}

              <label>
                {appText(language, "settings.newDuration")}
                <input
                  inputMode="numeric"
                  disabled={locationEditor.lifetime && locationEditor.plan !== "trial"}
                  value={locationEditor.durationDays}
                  placeholder={appText(language, "settings.durationPlaceholder")}
                  onChange={(event) =>
                    onChange({
                      ...locationEditor,
                      durationDays: event.target.value,
                    })
                  }
                />
              </label>

              {/* „Pe viață”: fără dată de expirare (nu are sens la planul de probă). */}
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={locationEditor.lifetime && locationEditor.plan !== "trial"}
                  disabled={locationEditor.plan === "trial"}
                  onChange={(event) => onChange({ ...locationEditor, lifetime: event.target.checked })}
                />
                {appText(language, "settings.lifetime")}
              </label>

              {locationEditor.id && (
                <p className="muted-note">
                  {appText(language, "settings.durationHint")}
                </p>
              )}
            </SettingsBlock>
          )}

          {/* Eroarea de la salvare. */}
          {locationError && (
            <p className="error-line">
              {locationError}
            </p>
          )}

          {/* Butoanele de anulare și salvare. */}
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={onClose}
              type="button"
            >
              {appText(language, "action.cancel")}
            </button>

            <button
              className="primary-button"
              onClick={onSave}
              type="button"
            >
              {locationEditor.id ? appText(language, "action.save") : appText(language, "booking.add")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
