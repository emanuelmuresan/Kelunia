"use client";

import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import type { GroupItem } from "@/lib/types/domain";

type RequiredGroupSetupViewProps = {
  error: string;
  groups: GroupItem[];
  groupsLoaded: boolean;
  groupsReadError: string;
  isOnline: boolean;
  locationName: string;
  offlineMessage: string;
  onGroupChange: (value: string) => void;
  onSave: () => void;
  onSignOut: () => void;
  selectedGroup: string;
  userLabel: string;
};

export function RequiredGroupSetupView({
  error,
  groups,
  groupsLoaded,
  groupsReadError,
  isOnline,
  locationName,
  offlineMessage,
  onGroupChange,
  onSave,
  onSignOut,
  selectedGroup,
  userLabel,
}: RequiredGroupSetupViewProps) {
  return (
    <main className="kelunia-shell">
      <header className="app-topbar">
        <div>
          <span className="eyebrow">Kelunia</span>
          <h1>{locationName}</h1>
          <p>{userLabel}</p>
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
          <span className="eyebrow">Profil incomplet</span>
          <h2>Alege grupul tau</h2>
          <p>Dupa salvare vei putea folosi aplicatia.</p>
        </div>
        <label>
          Grup
          <select
            value={selectedGroup}
            onChange={(event) => onGroupChange(event.target.value)}
            disabled={!groupsLoaded || groups.length === 0}
          >
            <option value="">Alege grupul</option>
            {groups.map((group) => (
              <option key={group.id} value={group.name}>{group.name}</option>
            ))}
          </select>
        </label>
        {!groupsLoaded && <p className="muted-note">Se incarca grupurile locatiei...</p>}
        {groupsReadError && <p className="error-line">{groupsReadError}</p>}
        {groupsLoaded && groups.length === 0 && !groupsReadError && (
          <p className="warning-line">
            Nu exista grupuri pentru aceasta locatie. Administratorul trebuie sa adauge grupurile in Setari inainte ca utilizatorii noi sa poata continua.
          </p>
        )}
        {error && <p className="error-line">{error}</p>}
        <button className="primary-button" disabled={!groupsLoaded || groups.length === 0 || !isOnline} onClick={onSave} type="button">
          Salveaza si continua
        </button>
      </section>
    </main>
  );
}
