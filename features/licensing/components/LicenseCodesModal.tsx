"use client";

import { useState } from "react";
import type {
  LicenseCodeDraft,
  LicenseCodeUpdateDraft,
  LicenseEmailRequestItem,
} from "@/features/licensing/hooks/useLicenseCodes";
import {
  billingStatusLabel,
  dateFromFirestoreValue,
  planLabel,
} from "@/lib/licensing";
import type { BillingStatus, LicenseCodeItem, LocationItem, LocationPlan } from "@/lib/types/domain";

interface LicenseCodesModalProps {
  open: boolean;
  draft: LicenseCodeDraft;
  licenseCodes: LicenseCodeItem[];
  licenseEmailRequests: LicenseEmailRequestItem[];
  locations: LocationItem[];
  error: string;
  message: string;
  working: boolean;
  onChange: (draft: LicenseCodeDraft) => void;
  onClose: () => void;
  onCopy: (code: string) => void;
  onGenerate: () => void;
  onSendEmail: (item: LicenseCodeItem, toEmail: string, message: string) => Promise<void>;
  onToggleActive: (item: LicenseCodeItem) => void;
  onUpdate: (item: LicenseCodeItem, draft: LicenseCodeUpdateDraft) => Promise<void>;
  onRemove: (item: LicenseCodeItem) => Promise<void>;
}

const planOptions: Array<{ value: LocationPlan; label: string }> = [
  { value: "trial", label: "Trial" },
  { value: "standard", label: "Standard" },
  { value: "pro", label: "Pro" },
  { value: "business", label: "Business" },
];

const billingStatusOptions: Array<{ value: BillingStatus; label: string }> = [
  { value: "trialing", label: "Trial" },
  { value: "active", label: "Activ" },
  { value: "past_due", label: "Plata intarziata" },
  { value: "paused", label: "Pauzat" },
  { value: "canceled", label: "Anulat" },
  { value: "expired", label: "Expirat" },
];

const defaultPlanDurationDays: Record<LocationPlan, number> = {
  trial: 14,
  standard: 365,
  pro: 365,
  business: 365,
};

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function endDateForLicense(item: LicenseCodeItem, location?: LocationItem) {
  const licenseTrialEnd = dateFromFirestoreValue(item.trialEndsAt);
  const licenseSubscriptionEnd = dateFromFirestoreValue(item.subscriptionExpiresAt);
  const licenseEnd = item.billingStatus === "trialing"
    ? licenseTrialEnd ?? licenseSubscriptionEnd
    : licenseSubscriptionEnd ?? licenseTrialEnd;

  if (licenseEnd) {
    return licenseEnd;
  }

  const locationTrialEnd = dateFromFirestoreValue(location?.trialEndsAt);
  const locationSubscriptionEnd = dateFromFirestoreValue(location?.subscriptionExpiresAt);
  const locationEnd = location?.billingStatus === "trialing"
    ? locationTrialEnd ?? locationSubscriptionEnd
    : locationSubscriptionEnd ?? locationTrialEnd;

  if (locationEnd) {
    return locationEnd;
  }

  const createdAt = dateFromFirestoreValue(item.createdAt);

  return createdAt ? addDays(createdAt, defaultPlanDurationDays[item.plan]) : null;
}

function formatDate(value: Date | null) {
  if (!value) {
    return "data nespecificata";
  }

  return value.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateInputValue(value: Date | null) {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatRemaining(item: LicenseCodeItem, location?: LocationItem) {
  const date = endDateForLicense(item, location);

  if (!date) {
    return "nespecificat";
  }

  const days = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  if (days < 0) {
    const elapsed = Math.abs(days);
    return elapsed === 1 ? "expirata de 1 zi" : `expirata de ${elapsed} zile`;
  }

  if (days === 0) {
    return "expira azi";
  }

  if (days === 1) {
    return "mai are 1 zi";
  }

  return `mai are ${days} zile`;
}

function statusText(item: LicenseCodeItem) {
  if (!item.active) {
    return "oprita";
  }

  if (item.used) {
    return "folosita";
  }

  if (item.claimed) {
    return "rezervata";
  }

  return "disponibila";
}

function defaultLicenseEmailMessage(item: LicenseCodeItem) {
  const locationName = item.intendedLocationName || item.locationName || "locatia ta";

  return `Buna,\n\nTi-am trimis codul de licenta Kelunia pentru ${locationName}. Foloseste codul cand creezi contul.\n\nMultumim!`;
}

function emailStatusLabel(request?: LicenseEmailRequestItem) {
  if (!request) {
    return "netrimis";
  }

  if (request.status === "sent") {
    return `trimis la ${request.toEmail}`;
  }

  if (request.status === "failed") {
    return `eroare la ${request.toEmail}`;
  }

  return `in curs catre ${request.toEmail}`;
}

function editDraftFor(item: LicenseCodeItem, location?: LocationItem): LicenseCodeUpdateDraft {
  return {
    plan: location?.plan ?? item.plan,
    billingStatus: location?.billingStatus ?? item.billingStatus,
    locationName: item.intendedLocationName || item.locationName || location?.name || "",
    address: item.intendedAddress || location?.address || "",
    expiryDate: dateInputValue(endDateForLicense(item, location)),
    active: item.active,
  };
}

export function LicenseCodesModal({
  open,
  draft,
  licenseCodes,
  licenseEmailRequests,
  locations,
  error,
  message,
  working,
  onChange,
  onClose,
  onCopy,
  onGenerate,
  onSendEmail,
  onToggleActive,
  onUpdate,
  onRemove,
}: LicenseCodesModalProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState({
    licenseId: "",
    toEmail: "",
    message: "",
  });
  const [editingLicense, setEditingLicense] = useState<LicenseCodeItem | null>(null);
  const [editDraft, setEditDraft] = useState<LicenseCodeUpdateDraft | null>(null);

  if (!open) {
    return null;
  }

  const availableCount = licenseCodes.filter((item) => item.active && !item.claimed && !item.used).length;
  const usedCount = licenseCodes.filter((item) => item.used).length;
  const inactiveCount = licenseCodes.filter((item) => !item.active).length;

  function linkedLocationFor(item: LicenseCodeItem) {
    return locations.find((location) => location.id === item.locationId);
  }

  function openEdit(item: LicenseCodeItem) {
    const location = linkedLocationFor(item);
    setEditingLicense(item);
    setEditDraft(editDraftFor(item, location));
  }

  function openEmailComposer(item: LicenseCodeItem) {
    setEmailDraft({
      licenseId: item.id,
      toEmail: item.claimedBy || item.usedBy || "",
      message: defaultLicenseEmailMessage(item),
    });
  }

  async function sendEmail(item: LicenseCodeItem) {
    if (!window.confirm(`Trimiti licenta ${item.code} catre ${emailDraft.toEmail}?`)) {
      return;
    }

    await onSendEmail(item, emailDraft.toEmail, emailDraft.message);
    setEmailDraft({ licenseId: "", toEmail: "", message: "" });
  }

  async function saveEdit() {
    if (!editingLicense || !editDraft) {
      return;
    }

    if (!window.confirm(`Salvezi modificarile pentru licenta ${editingLicense.code}?`)) {
      return;
    }

    await onUpdate(editingLicense, editDraft);
    setEditingLicense(null);
    setEditDraft(null);
  }

  async function removeLicense(item: LicenseCodeItem) {
    if (!window.confirm(`Stergi definitiv licenta ${item.code}?`)) {
      return;
    }

    await onRemove(item);
    setEditingLicense(null);
    setEditDraft(null);
  }

  function generateWithConfirmation() {
    if (!window.confirm("Generezi o licenta noua?")) {
      return;
    }

    onGenerate();
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation">
        <div className="modal-card manager-card license-manager-card" role="dialog" aria-modal="true" aria-label="Coduri de licenta">
          <div className="modal-head">
            <div>
              <span className="eyebrow">Owner</span>
              <h2>Licente</h2>
            </div>
            <button onClick={onClose} type="button" aria-label="Inchide">x</button>
          </div>

          <div className="settings-summary-list compact-summary-list">
            <div>
              <span>Total</span>
              <strong>{licenseCodes.length}</strong>
            </div>
            <div>
              <span>Disponibile</span>
              <strong>{availableCount}</strong>
            </div>
            <div>
              <span>Folosite</span>
              <strong>{usedCount}</strong>
            </div>
            <div>
              <span>Oprite</span>
              <strong>{inactiveCount}</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button className="primary-button" onClick={() => setCreateOpen((current) => !current)} type="button">
              {createOpen ? "Inchide generarea" : "Genereaza licenta"}
            </button>
          </div>

          {createOpen && (
            <div className="code-create-panel">
              <div className="mini-section-head">
                <h3>Licenta noua</h3>
              </div>
              <div className="license-add-grid">
                <label>
                  Plan
                  <select
                    value={draft.plan}
                    onChange={(event) => {
                      const nextPlan = event.target.value as LocationPlan | "";
                      onChange({ ...draft, plan: nextPlan, durationDays: "" });
                    }}
                  >
                    <option value="">Alege planul</option>
                    {planOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Valabilitate zile
                  <input
                    inputMode="numeric"
                    value={draft.durationDays}
                    onChange={(event) => onChange({ ...draft, durationDays: event.target.value })}
                    placeholder="14 sau 365"
                  />
                </label>

                <label>
                  Nume locatie
                  <input
                    value={draft.locationName}
                    onChange={(event) => onChange({ ...draft, locationName: event.target.value })}
                    placeholder="ex. Kelunia Brasov"
                  />
                </label>

                <label className="license-address-field">
                  Adresa
                  <input
                    value={draft.address}
                    onChange={(event) => onChange({ ...draft, address: event.target.value })}
                    placeholder="adresa exacta pentru care este licenta"
                  />
                </label>

                <button className="primary-button compact" disabled={working} onClick={generateWithConfirmation} type="button">
                  {working ? "Se genereaza..." : "Genereaza"}
                </button>
              </div>
            </div>
          )}

          <div className="mini-section-head code-list-head">
            <h3>Lista licente</h3>
          </div>

          <div className="mini-list license-list">
            {licenseCodes.length === 0 ? (
              <p className="empty-line">Nu exista coduri de licenta.</p>
            ) : (
              licenseCodes.map((item) => {
                const linkedLocation = linkedLocationFor(item);
                const lastEmailRequest = licenseEmailRequests.find((request) => request.licenseId === item.id);
                const displayName = item.locationName || linkedLocation?.name || item.intendedLocationName || "Locatie noua";
                const displayAddress = linkedLocation?.address || item.intendedAddress || "fara adresa";
                const displayPlan = linkedLocation?.plan ?? item.plan;
                const displayStatus = linkedLocation?.billingStatus ?? item.billingStatus;

                return (
                  <div className={`license-row compact-license-row ${!item.active || item.used ? "code-row-muted" : ""}`} key={item.id}>
                    <div className="license-row-main">
                      <span className="code-chip">{item.code}</span>
                      <strong>{displayName}</strong>
                      <small>{displayAddress}</small>
                      <small>
                        {planLabel(displayPlan)} · {billingStatusLabel(displayStatus)} · {formatRemaining(item, linkedLocation)}
                      </small>
                    </div>

                    <span className={`status-pill ${item.active && !item.used ? "success" : ""}`}>
                      {statusText(item)}
                    </span>

                    <div className="license-row-actions">
                      <button className="secondary-button compact" onClick={() => onCopy(item.code)} type="button">
                        Copiaza
                      </button>
                      <button
                        className="secondary-button compact"
                        onClick={() => openEmailComposer(item)}
                        disabled={!item.active || item.claimed || item.used}
                        type="button"
                      >
                        Email
                      </button>
                      <button className="primary-button compact" onClick={() => openEdit(item)} type="button">
                        Deschide
                      </button>
                    </div>

                    <small className="license-email-status">Email: {emailStatusLabel(lastEmailRequest)}</small>
                  </div>
                );
              })
            )}
          </div>

          {error && <p className="error-line manager-alert">{error}</p>}
          {message && <p className="success-line manager-alert">{message}</p>}

          <div className="modal-actions">
            <button className="primary-button" onClick={onClose} type="button">Gata</button>
          </div>
        </div>
      </div>

      {editingLicense && editDraft && (
        <div className="modal-backdrop modal-backdrop-nested" role="presentation" onMouseDown={() => setEditingLicense(null)}>
          <section
            className="modal-card small-card"
            role="dialog"
            aria-modal="true"
            aria-label="Editeaza licenta"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">Licenta</span>
                <h2>{editingLicense.code}</h2>
              </div>
              <button className="icon-button" onClick={() => setEditingLicense(null)} type="button" aria-label="Inchide">
                x
              </button>
            </div>

            <div className="settings-form">
              <label>
                Plan
                <select
                  value={editDraft.plan}
                  onChange={(event) => setEditDraft({ ...editDraft, plan: event.target.value as LocationPlan })}
                >
                  {planOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Status billing
                <select
                  value={editDraft.billingStatus}
                  onChange={(event) => setEditDraft({ ...editDraft, billingStatus: event.target.value as BillingStatus })}
                >
                  {billingStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Nume locatie
                <input
                  value={editDraft.locationName}
                  onChange={(event) => setEditDraft({ ...editDraft, locationName: event.target.value })}
                />
              </label>

              <label>
                Adresa
                <input
                  value={editDraft.address}
                  onChange={(event) => setEditDraft({ ...editDraft, address: event.target.value })}
                />
              </label>

              <label>
                Expira la
                <input
                  type="date"
                  value={editDraft.expiryDate}
                  onChange={(event) => setEditDraft({ ...editDraft, expiryDate: event.target.value })}
                />
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={editDraft.active}
                  onChange={(event) => setEditDraft({ ...editDraft, active: event.target.checked })}
                />
                Licenta activa
              </label>
            </div>

            <div className="settings-summary-list compact-summary-list">
              <div>
                <span>Cod</span>
                <strong>{editingLicense.code}</strong>
              </div>
              <div>
                <span>Client</span>
                <strong>{editingLicense.usedBy || editingLicense.claimedBy || "neatribuit"}</strong>
              </div>
              <div>
                <span>Expira</span>
                <strong>{formatDate(endDateForLicense(editingLicense, linkedLocationFor(editingLicense)))}</strong>
              </div>
            </div>

            <div className="modal-actions split-actions">
              <button className="danger-button" disabled={working} onClick={() => removeLicense(editingLicense)} type="button">
                Sterge
              </button>
              <button
                className="secondary-button"
                disabled={working || editingLicense.used}
                onClick={() => {
                  if (window.confirm(`${editingLicense.active ? "Opresti" : "Activezi"} licenta ${editingLicense.code}?`)) {
                    onToggleActive(editingLicense);
                    setEditingLicense(null);
                    setEditDraft(null);
                  }
                }}
                type="button"
              >
                {editingLicense.active ? "Opreste" : "Activeaza"}
              </button>
              <button className="primary-button" disabled={working} onClick={saveEdit} type="button">
                Salveaza
              </button>
            </div>
          </section>
        </div>
      )}

      {emailDraft.licenseId && (
        <div className="modal-backdrop modal-backdrop-nested" role="presentation" onMouseDown={() => setEmailDraft({ licenseId: "", toEmail: "", message: "" })}>
          <section
            className="modal-card small-card"
            role="dialog"
            aria-modal="true"
            aria-label="Trimite licenta prin email"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">Email</span>
                <h2>Trimite licenta</h2>
              </div>
              <button className="icon-button" onClick={() => setEmailDraft({ licenseId: "", toEmail: "", message: "" })} type="button" aria-label="Inchide">
                x
              </button>
            </div>

            <div className="settings-form newsletter-compose">
              <label>
                Email destinatar
                <input
                  type="email"
                  value={emailDraft.toEmail}
                  onChange={(event) => setEmailDraft((current) => ({ ...current, toEmail: event.target.value }))}
                  placeholder="client@email.com"
                />
              </label>
              <label>
                Mesaj
                <textarea
                  value={emailDraft.message}
                  onChange={(event) => setEmailDraft((current) => ({ ...current, message: event.target.value }))}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEmailDraft({ licenseId: "", toEmail: "", message: "" })} disabled={working} type="button">
                Renunta
              </button>
              <button
                className="primary-button"
                disabled={working}
                onClick={() => {
                  const item = licenseCodes.find((license) => license.id === emailDraft.licenseId);

                  if (item) {
                    void sendEmail(item);
                  }
                }}
                type="button"
              >
                {working ? "Se trimite..." : "Trimite"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
