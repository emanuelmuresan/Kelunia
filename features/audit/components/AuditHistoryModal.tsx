"use client";

import { formatAuditTimestamp } from "@/lib/dates";

import {
  auditActionLabels,
  auditEntityLabels,
} from "@/lib/config/app";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";

import type { AuditLogItem } from "@/lib/types/domain";

type AuditHistoryModalProps = {
  open: boolean;

  auditLogs: AuditLogItem[];
  auditLoading: boolean;
  auditError: string;

  onClose: () => void;
  onReload: () => void;
  language?: SupportedLocale;
};

export function AuditHistoryModal({
  open,
  auditLogs,
  auditLoading,
  auditError,
  onClose,
  onReload,
  language = "ro",
}: AuditHistoryModalProps) {
  if (!open) {
    return null;
  }

  function actorLabel(log: AuditLogItem) {
    const name = log.actorName.trim();
    const email = log.actorEmail.trim();

    if (name && email && name.toLowerCase() !== email.toLowerCase()) {
      return `${name} · ${email}`;
    }

    return name || email || appText(language, "audit.user");
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card audit-card"
        role="dialog"
        aria-modal="true"
        aria-label={appText(language, "audit.title")}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              {appText(language, "audit.title")}
            </span>

            <h2>
              {appText(language, "audit.lastChanges")}
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

        <div className="audit-toolbar">
          <p className="muted-note">
            {appText(language, "audit.limitNote")}
          </p>

          <button
            className="secondary-button compact"
            onClick={onReload}
            disabled={auditLoading}
            type="button"
          >
            {auditLoading
              ? appText(language, "loading.generic")
              : appText(language, "audit.reload")}
          </button>
        </div>

        {auditError && (
          <p className="warning-line">
            {auditError}
          </p>
        )}

        {auditLoading && auditLogs.length === 0 ? (
          <p className="empty-line">
            {appText(language, "audit.loading")}
          </p>
        ) : auditLogs.length === 0 ? (
          <p className="empty-line">
            {appText(language, "audit.empty")}
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
                    {actorLabel(log)}
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
