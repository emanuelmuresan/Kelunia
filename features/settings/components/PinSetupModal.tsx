"use client";

// Fereastra de alegere a PIN-ului (4-8 cifre, cu confirmare), deschisă la activarea PIN-ului sau a biometriei (care are PIN de rezervă).
// Validarea și trimiterea la funcția cloud setPin se fac în dashboard (confirmPinSetup).
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { PinIntent } from "@/lib/types/domain";

// Ciorna PIN-ului: valoarea și confirmarea.
type PinDraft = {
  pin: string;
  confirm: string;
};

// Proprietățile ferestrei: motivul deschiderii (PIN sau biometrie), ciorna, eroarea și acțiunile.
type PinSetupModalProps = {
  pinIntent: PinIntent | null;
  pinDraft: PinDraft;
  pinError: string;

  onClose: () => void;
  onChange: (value: PinDraft) => void;
  onSave: () => void;
  language?: SupportedLocale;
};

// Componenta ferestrei.
export function PinSetupModal({
  pinIntent,
  pinDraft,
  pinError,
  onClose,
  onChange,
  onSave,
  language = "ro",
}: PinSetupModalProps) {
  // Fără configurare în curs fereastra este închisă.
  if (!pinIntent) {
    return null;
  }

  const isBiometric = pinIntent === "biometrics";

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-label={appText(language, "settings.pinSetup")}
      >
        {/* Antetul: titlul diferă pentru PIN simplu și pentru PIN de rezervă al biometriei. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              {isBiometric ? appText(language, "settings.backupPin") : appText(language, "settings.security")}
            </span>

            <h2>
              {isBiometric
                ? appText(language, "settings.biometricPinTitle")
                : appText(language, "settings.choosePin")}
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

        {/* Câmpurile PIN și confirmare (doar cifre), eroarea și butoanele. */}
        <div className="settings-form">
          <label>
            {appText(language, "settings.pin")}

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
            {appText(language, "settings.confirmPin")}

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
              {appText(language, "action.cancel")}
            </button>

            <button
              className="primary-button"
              onClick={onSave}
              type="button"
            >
              {appText(language, "settings.savePin")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
