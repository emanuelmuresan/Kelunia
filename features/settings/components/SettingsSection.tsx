"use client";

// Cele două componente din pagina Setări: cardul compact al unei secțiuni (SettingsSectionCard) și fereastra ei deschisă (SettingsSectionModal).
import type { ReactNode } from "react";

import type { AppLanguage } from "@/context/AuthContext";
import { appText } from "@/lib/i18n/app-copy-catalog";

// Proprietățile cardului: titlu, explicație și acțiunea „Deschide”.
type SettingsSectionCardProps = {
  title: string;
  description: string;
  language: AppLanguage;
  onOpen: () => void;
};

/** Compact entry on the Settings page: what the section is for, and a Deschide button. */
export function SettingsSectionCard({ title, description, language, onOpen }: SettingsSectionCardProps) {
  return (
    <article className="settings-panel settings-section-card">
      <div>
        <h2>{title}</h2>
        <p className="muted-note">{description}</p>
      </div>
      <button className="primary-button compact" onClick={onOpen} type="button">
        {appText(language, "settings.openAction")}
      </button>
    </article>
  );
}

// Proprietățile ferestrei secțiunii: titlu, explicație și blocurile din interior.
type SettingsSectionModalProps = {
  title: string;
  description: string;
  language: AppLanguage;
  onClose: () => void;
  children: ReactNode;
};

/** The opened section: its blocks, each with its own Modifică. */
export function SettingsSectionModal({ title, description, language, onClose, children }: SettingsSectionModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card small-card settings-section-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <h2>{title}</h2>
            <p className="muted-note">{description}</p>
          </div>
        </div>

        <div className="settings-form">
          {children}

          <div className="modal-actions">
            <button className="primary-button" onClick={onClose} type="button">
              {appText(language, "action.done")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
