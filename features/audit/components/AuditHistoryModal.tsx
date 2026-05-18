"use client";

import { formatAuditTimestamp } from "@/lib/dates";

import {
  auditActionLabels,
  auditEntityLabels,
} from "@/lib/config/app";

import type { AuditLogItem } from "@/lib/types/domain";

type AuditHistoryModalProps = {
  open: boolean;

  auditLogs: AuditLogItem[];
  auditLoading: boolean;
  auditError: string;

  onClose: () => void;
  onReload: () => void;
};

export function AuditHistoryModal({
  open,
  auditLogs,
  auditLoading,
  auditError,
  onClose,
  onReload,
}: AuditHistoryModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card audit-card"
        role="dialog"
        aria-modal="true"
        aria-label="Istoric modificări"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              Istoric
            </span>

            <h2>
              Ultimele modificări
            </h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Închide"
          >
            ×
          </button>
        </div>

        <div className="audit-toolbar">
          <p className="muted-note">
            Ultimele 50 de schimbări pentru locația curentă.
          </p>

          <button
            className="secondary-button compact"
            onClick={onReload}
            disabled={auditLoading}
            type="button"
          >
            {auditLoading
              ? "Se încarcă..."
              : "Reîncarcă"}
          </button>
        </div>

        {auditError && (
          <p className="warning-line">
            {auditError}
          </p>
        )}

        {auditLoading && auditLogs.length === 0 ? (
          <p className="empty-line">
            Se încarcă istoricul...
          </p>
        ) : auditLogs.length === 0 ? (
          <p className="empty-line">
            Nu există încă modificări înregistrate pentru locația curentă.
          </p>
        ) : (
          <div className="audit-list">
            {auditLogs.map((log) => (
              <div className="audit-row" key={log.id}>
                <div>
                  <strong>
                    {auditActionLabels[log.action] ?? "Modificat"}

                    {" · "}

                    {auditEntityLabels[log.entityType] ?? log.entityType}
                  </strong>

                  <span>
                    {log.actorName ||
                      log.actorEmail ||
                      "Utilizator"}
                  </span>
                </div>

                <small>
                  {formatAuditTimestamp(log.createdAt)}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}