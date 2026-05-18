"use client";

import type { RefObject } from "react";

import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import type { MapsStatus } from "@/lib/types/domain";

type LocationSetupViewProps = {
  address: string;
  addressInputRef: RefObject<HTMLInputElement | null>;
  displayName: string;
  error: string;
  isLoading: boolean;
  isOnline: boolean;
  mapsStatus: MapsStatus;
  name: string;
  offlineMessage: string;
  onAddressChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSignOut: () => void;
  onSubmit: () => void;
};

export function LocationSetupView({
  address,
  addressInputRef,
  displayName,
  error,
  isLoading,
  isOnline,
  mapsStatus,
  name,
  offlineMessage,
  onAddressChange,
  onNameChange,
  onSignOut,
  onSubmit,
}: LocationSetupViewProps) {
  return (
    <main className="kelunia-shell">
      <header className="app-topbar">
        <div>
          <span className="eyebrow">Kelunia</span>
          <h1>Deschide locatia</h1>
          <p>{displayName} · Manager</p>
        </div>
        <div className="topbar-actions">
          <InstallAppPrompt />
          <button className="icon-button logout-button" onClick={onSignOut} aria-label="Iesire">
            <span className="logout-door" aria-hidden="true" />
            <span>Iesire</span>
          </button>
        </div>
      </header>

      {!isOnline && <p className="offline-banner">{offlineMessage}</p>}

      <section className="group-required-panel">
        <div>
          <span className="eyebrow">Trial sau licenta activa</span>
          <h2>Alege adresa oficiala</h2>
          <p>Locatia va fi creata doar daca nu exista deja o locatie la aceeasi adresa.</p>
        </div>
        <label>
          Nume locatie
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Ex. Sala Regatului"
          />
        </label>
        <label>
          Adresa oficiala
          <input
            ref={addressInputRef}
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="Cauta adresa ca in Google Maps"
            autoComplete="street-address"
          />
        </label>
        {mapsStatus === "ready" && <p className="muted-note">Alege rezultatul din sugestiile Google Maps.</p>}
        {mapsStatus === "off" && <p className="muted-note">Poti introduce adresa manual; autocomplete Google Maps se activeaza cu cheia Maps.</p>}
        {mapsStatus === "error" && <p className="muted-note">Sugestiile Google Maps nu s-au putut incarca. Poti continua cu adresa scrisa manual.</p>}
        {error && <p className="error-line">{error}</p>}
        <button className="primary-button" disabled={isLoading || !isOnline} onClick={onSubmit} type="button">
          {isLoading ? "Se deschide..." : "Deschide locatia"}
        </button>
      </section>
    </main>
  );
}
