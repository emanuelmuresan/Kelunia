"use client";

import { dayLabels } from "@/lib/config/app";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import type { FixedSchedule, GroupItem } from "@/lib/types/domain";

type FixedSchedulesManagerModalProps = {
  open: boolean;
  fixedSectionTitle: string;
  fixedSchedules: FixedSchedule[];
  groups: GroupItem[];
  fixedError: string;
  profileGroupName?: string;

  onClose: () => void;
  onAdd: () => void;
  onEdit: (item: FixedSchedule) => void;
  onRemove: (itemId: string) => void;
};

export function FixedSchedulesManagerModal({
  open,
  fixedSectionTitle,
  fixedSchedules,
  groups,
  fixedError,
  onClose,
  onAdd,
  onEdit,
  onRemove,
}: FixedSchedulesManagerModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card manager-card"
        role="dialog"
        aria-modal="true"
        aria-label="Administrare calendar săptămânal"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">Calendar</span>
            <h2>{fixedSectionTitle}</h2>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Închide"
          >
            ×
          </button>
        </div>

        <div className="mini-section-head">
          <h3>Programări</h3>

          <button
            className="primary-button compact"
            onClick={onAdd}
            type="button"
          >
            + Adaugă
          </button>
        </div>

        {fixedError && (
          <p className="error-line manager-alert">
            {fixedError}
          </p>
        )}

        <div className="mini-list">
          {fixedSchedules.length === 0 ? (
            <p className="empty-line">
              Nu există elemente adăugate.
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
                  <button
                    onClick={() => onEdit(item)}
                    type="button"
                    aria-label="Editează"
                  >
                    ✎
                  </button>

                  <button
                    onClick={() => onRemove(item.id)}
                    type="button"
                    aria-label="Șterge"
                  >
                    ×
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
