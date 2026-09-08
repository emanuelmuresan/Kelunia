"use client";

import { useState } from "react";

import { communityDateLabel } from "@/lib/licensing";
import type { ErrorReport } from "@/features/settings/hooks/useErrorReports";

type ErrorReportsModalProps = {
  reports: ErrorReport[];
  reportsError: string;
  onClose: () => void;
  onResolve: (reportId: string) => Promise<void>;
};

export function ErrorReportsModal({ reports, reportsError, onClose, onResolve }: ErrorReportsModalProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [working, setWorking] = useState("");
  const openCount = reports.filter((report) => report.status === "new").length;

  async function resolve(reportId: string) {
    setWorking(reportId);

    try {
      await onResolve(reportId);
    } catch (error) {
      console.error("Raportul nu a putut fi marcat rezolvat:", error);
    } finally {
      setWorking("");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card community-message-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-reports-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">Suport</span>
            <h2 id="error-reports-title">Rapoarte de problemă</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Închide">
            ×
          </button>
        </div>

        <p className="muted-note">
          {reports.length} rapoarte{openCount > 0 ? ` · ${openCount} nerezolvate` : ""}
        </p>

        {reportsError && <p className="error-line">{reportsError}</p>}

        <div className="mini-list message-inbox-list">
          {reports.length === 0 ? (
            <p className="empty-line">Niciun raport încă.</p>
          ) : (
            reports.map((report) => (
              <div className={`mini-row ${report.status === "new" ? "unread" : ""}`} key={report.id}>
                <div className="mini-row-main">
                  <span>{report.userMessage || "(fără descriere)"}</span>
                  <small>
                    {report.email || "anonim"} · {communityDateLabel(report.createdAt)} · {report.path}
                  </small>
                  {report.status === "resolved" && <small>rezolvat</small>}

                  {report.message && (
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                    >
                      {expanded === report.id ? "Ascunde detaliile" : "Detalii tehnice"}
                    </button>
                  )}
                  {expanded === report.id && (
                    <pre className="error-report-detail">
                      {report.message}
                      {report.componentStack ? `\n${report.componentStack}` : ""}
                      {report.userAgent ? `\n\n${report.userAgent}` : ""}
                    </pre>
                  )}
                </div>

                {report.status === "new" && (
                  <button
                    className="secondary-button compact"
                    type="button"
                    disabled={working === report.id}
                    onClick={() => resolve(report.id)}
                  >
                    Marchează rezolvat
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button className="primary-button" onClick={onClose} type="button">Închide</button>
        </div>
      </section>
    </div>
  );
}
