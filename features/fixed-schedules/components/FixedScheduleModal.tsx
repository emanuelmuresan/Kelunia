"use client";

import type { FixedScheduleDraft, GroupItem, RoomItem } from "@/lib/types/domain";

export type FixedScheduleDraftState = FixedScheduleDraft;

interface FixedScheduleModalProps {
  open: boolean;
  editingId: string | null;
  draft: FixedScheduleDraft;
  dayLabels: string[];
  groups: GroupItem[];
  rooms: RoomItem[];
  groupsLabel?: string;
  roomsLabel?: string;
  error: string;
  onChange: (nextDraft: FixedScheduleDraft) => void;
  onClose: () => void;
  onSave: () => void;
}

export function FixedScheduleModal({
  open,
  editingId,
  draft,
  dayLabels,
  groups,
  rooms,
  groupsLabel = "Grup",
  roomsLabel = "Sala",
  error,
  onChange,
  onClose,
  onSave,
}: FixedScheduleModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card manager-card" role="dialog" aria-modal="true" aria-label="Programare fixă">
        <div className="modal-head">
          <div>
            <span className="eyebrow">{editingId ? "Editare" : "Programare fixă"}</span>
            <h2>{editingId ? "Editează programarea fixă" : "Adaugă programare fixă"}</h2>
          </div>
          <button onClick={onClose} type="button" aria-label="Închide">×</button>
        </div>

        <div className="booking-form">
          <label>
            Zi
            <select
              value={draft.dayIndex}
              onChange={(event) => onChange({ ...draft, dayIndex: event.target.value === "" ? "" : Number(event.target.value) })}
            >
              <option value="">Alege ziua</option>
              {dayLabels.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
          <label>
            {groupsLabel}
            <select value={draft.group} onChange={(event) => onChange({ ...draft, group: event.target.value })}>
              <option value="">Alege {groupsLabel.toLowerCase()}</option>
              {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
            </select>
          </label>
          <label>
            {roomsLabel}
            <select value={draft.room} onChange={(event) => onChange({ ...draft, room: event.target.value })}>
              <option value="">Alege {roomsLabel.toLowerCase()}</option>
              {rooms.map((room) => <option key={room.id} value={room.name}>{room.name}</option>)}
            </select>
          </label>
          <label>
            Nume
            <input
              autoFocus
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              placeholder="ex. intrunire, repetitie, curatenie"
            />
          </label>
          <label>
            Ora început
            <input type="time" value={draft.startTime} onChange={(event) => onChange({ ...draft, startTime: event.target.value })} />
          </label>
          <label>
            Ora final
            <input type="time" value={draft.endTime} onChange={(event) => onChange({ ...draft, endTime: event.target.value })} />
          </label>
          {error && <p className="error-line full-field">{error}</p>}
          <div className="modal-actions full-field">
            <button className="secondary-button" onClick={onClose} type="button">
              Anulează
            </button>
            <button className="primary-button" onClick={onSave} type="button">
              {editingId ? "Salvează" : "Adaugă"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
