"use client";

import { useState } from "react";

import { useCommunityApplicationMessages } from "@/features/landing/hooks/useCommunityApplications";
import { db } from "@/lib/firebase";
import { communityDateLabel } from "@/lib/licensing";
import type { CommunityApplication, CommunityApplicationStatus } from "@/lib/types/domain";

type LandingInboxModalProps = {
  applications: CommunityApplication[];
  applicationsError: string;
  unreadCount: number;
  onClose: () => void;
  onMarkReviewed: (applicationId: string) => void;
  onSendReply: (application: CommunityApplication, body: string) => Promise<void>;
  onUpdateStatus: (applicationId: string, status: CommunityApplicationStatus) => Promise<void>;
  onOpenLicenseCodes: () => void;
};

function statusLabel(status: CommunityApplicationStatus) {
  if (status === "reviewed") return "citită";
  if (status === "replied") return "răspuns salvat";
  if (status === "approved") return "aprobată";
  if (status === "declined") return "respinsă";
  return "nouă";
}

function sourceLabel(source: string) {
  if (source === "landing-newsletter") return "Actualizări";
  if (source === "landing-contact") return "Contact";
  return "Community";
}

/** Owner landing-page inbox: message list + per-application reply thread. */
export function LandingInboxModal({
  applications,
  applicationsError,
  unreadCount,
  onClose,
  onMarkReviewed,
  onSendReply,
  onUpdateStatus,
  onOpenLicenseCodes,
}: LandingInboxModalProps) {
  const [selected, setSelected] = useState<CommunityApplication | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyWorking, setReplyWorking] = useState(false);

  const active = selected
    ? applications.find((application) => application.id === selected.id) ?? selected
    : null;

  const { messages, communityMessagesError } = useCommunityApplicationMessages({
    db,
    applicationId: active?.id ?? "",
    enabled: Boolean(active),
  });

  function openApplication(application: CommunityApplication) {
    setSelected(application);
    setReplyDraft("");
    setReplyError("");
    setReplyMessage("");

    if (application.status === "new") {
      onMarkReviewed(application.id);
    }
  }

  function closeApplication() {
    setSelected(null);
    setReplyDraft("");
    setReplyError("");
    setReplyMessage("");
  }

  async function saveReply() {
    if (!active) {
      return;
    }

    const cleanBody = replyDraft.trim();

    if (cleanBody.length < 5) {
      setReplyError("Scrie un răspuns înainte de salvare.");
      return;
    }

    setReplyWorking(true);
    setReplyError("");
    setReplyMessage("");

    try {
      await onSendReply(active, cleanBody);
      setReplyDraft("");
      setReplyMessage("Răspunsul a fost salvat și se trimite prin email.");
    } catch (error) {
      console.error("Răspunsul Community nu a putut fi salvat:", error);
      setReplyError("Răspunsul nu a putut fi salvat.");
    } finally {
      setReplyWorking(false);
    }
  }

  async function updateStatus(status: CommunityApplicationStatus) {
    if (!active) {
      return;
    }

    setReplyWorking(true);
    setReplyError("");
    setReplyMessage("");

    try {
      await onUpdateStatus(active.id, status);
      setReplyMessage("Statusul cererii a fost actualizat.");

      if (status === "approved") {
        closeApplication();
        onOpenLicenseCodes();
      }
    } catch (error) {
      console.error("Statusul Community nu a putut fi actualizat:", error);
      setReplyError("Statusul nu a putut fi actualizat.");
    } finally {
      setReplyWorking(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section
          className="modal-card community-message-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-inbox-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Inbox</span>
              <h2 id="landing-inbox-title">Mesaje Landing</h2>
            </div>
            <button className="icon-button" onClick={onClose} type="button" aria-label="Închide">
              ×
            </button>
          </div>

          <p className="muted-note">
            {applications.length} mesaje primite
            {unreadCount > 0 ? ` · ${unreadCount} necitite` : ""}
          </p>

          {applicationsError && <p className="error-line">{applicationsError}</p>}

          <div className="mini-list message-inbox-list">
            {applications.length === 0 ? (
              <p className="empty-line">Nu există mesaje de pe landing page.</p>
            ) : (
              applications.map((application) => (
                <div
                  className={`mini-row community-application-row ${application.status === "new" ? "unread" : ""}`}
                  key={application.id}
                  onClick={() => openApplication(application)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openApplication(application);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mini-row-main">
                    <span>{application.organizationName}</span>
                    <small>
                      {sourceLabel(application.source)} · {application.email} · {communityDateLabel(application.createdAt)}
                    </small>
                    <small>{application.details}</small>
                    <small>Status: {statusLabel(application.status)}</small>
                  </div>

                  {application.status === "new" && (
                    <div className="row-actions">
                      <span className="badge-pill">nou</span>
                      <button
                        className="secondary-button compact"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMarkReviewed(application.id);
                        }}
                        type="button"
                      >
                        Marchează citită
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {active && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeApplication}>
          <section
            className="modal-card community-message-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-message-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">{sourceLabel(active.source)}</span>
                <h2 id="community-message-title">{active.organizationName}</h2>
              </div>
              <button className="icon-button" onClick={closeApplication} type="button" aria-label="Închide">
                ×
              </button>
            </div>

            <div className="message-detail">
              <div className="message-meta">
                <span>De la</span>
                <strong>{active.email}</strong>
              </div>
              <div className="message-meta">
                <span>Primită</span>
                <strong>{communityDateLabel(active.createdAt)}</strong>
              </div>
              <div className="message-meta">
                <span>Status</span>
                <strong>{statusLabel(active.status)}</strong>
              </div>

              <div className="message-thread">
                <article className="message-bubble inbound">
                  <small>Cererea inițială</small>
                  <p>{active.details}</p>
                </article>

                {communityMessagesError && <p className="error-line">{communityMessagesError}</p>}

                {messages.map((message) => (
                  <article className="message-bubble outbound" key={message.id}>
                    <small>
                      Răspuns · {communityDateLabel(message.createdAt)} · {message.deliveryStatus === "sent" ? "trimis" : message.deliveryStatus === "failed" ? "eroare trimitere" : "în curs de trimitere"}
                    </small>
                    <p>{message.body}</p>
                    {message.errorMessage && <small>{message.errorMessage}</small>}
                  </article>
                ))}
              </div>

              <label className="reply-composer">
                Răspuns
                <textarea
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  placeholder="Scrie răspunsul pentru această organizație..."
                />
              </label>

              {replyError && <p className="error-line">{replyError}</p>}
              {replyMessage && <p className="success-line">{replyMessage}</p>}
            </div>

            <div className="modal-actions community-actions">
              <button className="primary-button" disabled={replyWorking} onClick={saveReply} type="button">
                Trimite răspunsul
              </button>
              <button className="secondary-button" disabled={replyWorking} onClick={() => updateStatus("approved")} type="button">
                Aprobată
              </button>
              <button className="secondary-button danger-button" disabled={replyWorking} onClick={() => updateStatus("declined")} type="button">
                Respinsă
              </button>
              <button className="primary-button" onClick={closeApplication} type="button">
                Închide
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
