"use client";

import { useState } from "react";

import { communityDateLabel } from "@/lib/licensing";
import type { NewsletterCampaign } from "@/lib/types/domain";

type NewsletterSubscriberRow = { id: string; email: string; createdAt?: unknown };

type NewsletterModalProps = {
  subscriberRows: NewsletterSubscriberRow[];
  campaigns: NewsletterCampaign[];
  newsletterError: string;
  onClose: () => void;
  onSendNewsletterCampaign: (subject: string, body: string, recipientEmail?: string) => Promise<void>;
};

function campaignStatusLabel(status: NewsletterCampaign["status"]) {
  if (status === "sending") return "se trimite";
  if (status === "sent") return "trimis";
  if (status === "partial") return "trimis parțial";
  if (status === "failed") return "eroare";
  return "în așteptare";
}

/** Owner newsletter: subscriber list + campaign history, and the compose dialog. */
export function NewsletterModal({
  subscriberRows,
  campaigns,
  newsletterError,
  onClose,
  onSendNewsletterCampaign,
}: NewsletterModalProps) {
  const [draft, setDraft] = useState({ subject: "", body: "" });
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [working, setWorking] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");

  async function copyEmails() {
    const emails = subscriberRows.map((subscriber) => subscriber.email).join(", ");

    setMessage("");
    setLocalError("");

    if (!emails) {
      setLocalError("Nu există emailuri active de copiat.");
      return;
    }

    try {
      await navigator.clipboard.writeText(emails);
      setMessage("Emailurile au fost copiate.");
    } catch (error) {
      console.error("Emailurile nu au putut fi copiate:", error);
      setLocalError("Emailurile nu au putut fi copiate automat.");
    }
  }

  function openComposer(recipientEmail = "") {
    setTargetEmail(recipientEmail);
    setDraft({ subject: "", body: "" });
    setMessage("");
    setLocalError("");
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setTargetEmail("");
  }

  async function send() {
    const subject = draft.subject.trim();
    const body = draft.body.trim();

    setMessage("");
    setLocalError("");

    if (!targetEmail && subscriberRows.length === 0) {
      setLocalError("Nu există abonați activi.");
      return;
    }

    if (subject.length < 4) {
      setLocalError("Scrie un subiect pentru email.");
      return;
    }

    if (body.length < 20) {
      setLocalError("Scrie un mesaj puțin mai complet pentru newsletter.");
      return;
    }

    setWorking(true);

    try {
      await onSendNewsletterCampaign(subject, body, targetEmail || undefined);
      setDraft({ subject: "", body: "" });
      setMessage(
        targetEmail
          ? `Emailul a fost pornit pentru ${targetEmail}.`
          : "Campania a fost pornită. Resend o trimite către abonați."
      );
      setComposerOpen(false);
      setTargetEmail("");
    } catch (error) {
      console.error("Newsletterul nu a putut fi trimis:", error);
      setLocalError("Newsletterul nu a putut fi pornit.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section
          className="modal-card community-message-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-panel-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Newsletter</span>
              <h2 id="newsletter-panel-title">Actualizari</h2>
            </div>
            <button className="icon-button" onClick={onClose} type="button" aria-label="Inchide">
              x
            </button>
          </div>

          <div className="settings-summary-list compact-summary-list">
            <div>
              <span>Abonati activi</span>
              <strong>{subscriberRows.length}</strong>
            </div>
            <div>
              <span>Campanii trimise</span>
              <strong>{campaigns.length}</strong>
            </div>
          </div>

          {(newsletterError || localError) && <p className="error-line">{newsletterError || localError}</p>}
          {message && <p className="success-line">{message}</p>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={copyEmails} type="button">
              Copiaza emailurile
            </button>
            <button className="primary-button" onClick={() => openComposer()} type="button">
              Trimite update tuturor
            </button>
          </div>

          <div className="mini-list newsletter-list">
            {subscriberRows.length === 0 ? (
              <p className="empty-line">Nu exista abonati activi.</p>
            ) : (
              subscriberRows.map((subscriber) => (
                <div className="mini-row" key={subscriber.id}>
                  <div className="mini-row-main">
                    <span>{subscriber.email}</span>
                    <small>Inscris: {communityDateLabel(subscriber.createdAt)}</small>
                  </div>
                  <button
                    className="secondary-button compact"
                    onClick={() => openComposer(subscriber.email)}
                    type="button"
                  >
                    Trimite
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="newsletter-campaign-list">
            {campaigns.slice(0, 5).map((campaign) => (
              <div className="mini-row" key={campaign.id}>
                <div className="mini-row-main">
                  <span>{campaign.subject}</span>
                  <small>
                    {campaign.recipientEmail ? `catre ${campaign.recipientEmail} · ` : ""}
                    {campaignStatusLabel(campaign.status)} · {campaign.sentCount}/{campaign.recipientCount} trimise
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {composerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeComposer}>
          <section
            className="modal-card small-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="newsletter-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">Newsletter</span>
                <h2 id="newsletter-title">Trimite update</h2>
              </div>
              <button className="icon-button" onClick={closeComposer} type="button" aria-label="Închide">
                ×
              </button>
            </div>

            <p className="muted-note">
              {targetEmail
                ? `Emailul va fi trimis prin Resend catre ${targetEmail}.`
                : `Emailul va fi trimis prin Resend catre ${subscriberRows.length} abonati activi.`}
            </p>

            <div className="settings-form newsletter-compose">
              <label>
                Subiect
                <input
                  value={draft.subject}
                  onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="ex. Noutăți Kelunia pentru luna aceasta"
                />
              </label>

              <label>
                Mesaj
                <textarea
                  value={draft.body}
                  onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Scrie update-ul pe care vrei să îl primească abonații."
                />
              </label>

              {(newsletterError || localError) && <p className="error-line">{newsletterError || localError}</p>}
              {message && <p className="success-line">{message}</p>}

              <div className="modal-actions">
                <button className="secondary-button" onClick={closeComposer} disabled={working} type="button">
                  Renunță
                </button>
                <button className="primary-button" disabled={working} onClick={send} type="button">
                  {working ? "Se pornește..." : "Trimite către toți"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
