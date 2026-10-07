"use client";

// Ecranul de blocare: cere PIN-ul (sau biometria, dacă e activată) pentru a deschide aplicația; permite și ieșirea din cont.
// Verificarea PIN-ului se face în useAppLock, prin funcția cloud verifyPin.
// Proprietățile ecranului: starea biometriei, eroarea, PIN-ul scris și acțiunile.
type AppLockModalProps = {
  biometricEnabled: boolean;
  biometricWorking: boolean;
  error: string;
  pin: string;
  onBiometricUnlock: () => void;
  onPinChange: (value: string) => void;
  onSignOut: () => void;
  onUnlock: () => void;
};

// Componenta ecranului.
export function AppLockModal({
  biometricEnabled,
  biometricWorking,
  error,
  pin,
  onBiometricUnlock,
  onPinChange,
  onSignOut,
  onUnlock,
}: AppLockModalProps) {
  // Formularul de deblocare; trimiterea lui verifică PIN-ul.
  return (
    <div className="modal-backdrop app-lock-backdrop" role="presentation">
      <form
        className="modal-card small-card app-lock-card"
        role="dialog"
        aria-modal="true"
        aria-label="Deblocare Kelunia"
        onSubmit={(event) => {
          event.preventDefault();
          onUnlock();
        }}
      >
        {/* Titlul ecranului. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">Kelunia</span>
            <h2>Aplicatia este blocata</h2>
          </div>
        </div>

        {/* Biometria (dacă e activată), câmpul PIN (doar cifre, maximum 8), eroarea și butoanele. */}
        <div className="settings-form">
          {biometricEnabled && (
            <button
              className="primary-button"
              disabled={biometricWorking}
              onClick={onBiometricUnlock}
              type="button"
            >
              {biometricWorking ? "Se verifica..." : "Deblocare biometrica"}
            </button>
          )}

          <label>
            PIN
            <input
              autoComplete="current-password"
              autoFocus
              inputMode="numeric"
              maxLength={8}
              pattern="[0-9]*"
              type="password"
              value={pin}
              onChange={(event) => onPinChange(event.target.value.replace(/\D/g, ""))}
            />
          </label>

          {error && <p className="error-line">{error}</p>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onSignOut} type="button">
              Iesire din cont
            </button>
            <button className="primary-button" type="submit">
              Deblocheaza
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
