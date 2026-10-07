"use client";

// Fereastra „Administrează programele fixe”: lista tuturor programelor, cu butoane de adăugare, modificare și ștergere.
import { dayLabels } from "@/lib/config/app";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { FixedSchedule, GroupItem } from "@/lib/types/domain";

// Proprietățile ferestrei: programele, grupurile (pentru culori) și acțiunile.
type FixedSchedulesManagerModalProps = {
  open: boolean;
  fixedSectionTitle: string;
  fixedSchedules: FixedSchedule[];
  groups: GroupItem[];
  fixedError: string;
  profileGroupName?: string;
  language?: SupportedLocale;

  onClose: () => void;
  onAdd: () => void;
  onEdit: (item: FixedSchedule) => void;
  onRemove: (itemId: string) => void;
};

// Componenta ferestrei.
export function FixedSchedulesManagerModal({
  open,
  fixedSectionTitle,
  fixedSchedules,
  groups,
  fixedError,
  language = "ro",
  onClose,
  onAdd,
  onEdit,
  onRemove,
}: FixedSchedulesManagerModalProps) {
  // Fereastra închisă nu se randează.
  if (!open) {
    return null;
  }

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card manager-card"
        role="dialog"
        aria-modal="true"
        aria-label={appText(language, "fixed.manage")}
      >
        {/* Antetul ferestrei. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">{appText(language, "nav.calendar")}</span>
            <h2>{fixedSectionTitle}</h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label={appText(language, "booking.close")}
          >
            ×
          </button>
        </div>

        {/* Titlul listei și butonul „Adaugă”. */}
        <div className="mini-section-head">
          <h3>{appText(language, "fixed.scheduleList")}</h3>

          <button
            className="primary-button compact"
            onClick={onAdd}
            type="button"
          >
            + {appText(language, "booking.add")}
          </button>
        </div>

        {/* Eroarea ultimei acțiuni. */}
        {fixedError && (
          <p className="error-line manager-alert">
            {fixedError}
          </p>
        )}

        {/* Programele, colorate după grup, sau mesajul că lista e goală. */}
        <div className="mini-list">
          {fixedSchedules.length === 0 ? (
            <p className="empty-line">
              {appText(language, "fixed.empty")}
            </p>
          ) : (
            fixedSchedules.map((item) => (
              <div
                className={`mini-row ${groupColorForName(groups, item.group) ? "group-colored-booking" : ""}`}
                key={item.id}
                style={groupColorStyle(groupColorForName(groups, item.group))}
              >
                <span>
                  {dayLabels[item.dayIndex]} ·{" "}
                  {item.startTime}-{item.endTime} ·{" "}
                  {item.title}
                </span>

                <div className="row-actions">
                  <button className="secondary-button compact" onClick={() => onEdit(item)} type="button">
                    {appText(language, "booking.edit")}
                  </button>

                  <button className="secondary-button compact danger-button" onClick={() => onRemove(item.id)} type="button">
                    {appText(language, "action.delete")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
