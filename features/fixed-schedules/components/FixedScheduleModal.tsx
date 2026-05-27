"use client";

import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
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
  language?: SupportedLocale;
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
  language = "ro",
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
      <div className="modal-card manager-card" role="dialog" aria-modal="true" aria-label={appText(language, "fixed.new")}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{editingId ? appText(language, "booking.editing") : appText(language, "fixed.new")}</span>
            <h2>{editingId ? appText(language, "fixed.edit") : appText(language, "fixed.add")}</h2>
          </div>
          <button onClick={onClose} type="button" aria-label={appText(language, "booking.close")}>×</button>
        </div>

        <div className="booking-form">
          <label>
            {appText(language, "fixed.day")}
            <select
              value={draft.dayIndex}
              onChange={(event) => onChange({ ...draft, dayIndex: event.target.value === "" ? "" : Number(event.target.value) })}
            >
              <option value="">{appText(language, "fixed.chooseDay")}</option>
              {dayLabels.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
          <label>
            {groupsLabel}
            <select value={draft.group} onChange={(event) => onChange({ ...draft, group: event.target.value })}>
              <option value="">{appText(language, "booking.selectGroup")}</option>
              {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
            </select>
          </label>
          <label>
            {roomsLabel}
            <select value={draft.room} onChange={(event) => onChange({ ...draft, room: event.target.value })}>
              <option value="">{appText(language, "booking.selectRoom")}</option>
              {rooms.map((room) => <option key={room.id} value={room.name}>{room.name}</option>)}
            </select>
          </label>
          <label>
            {appText(language, "fixed.name")}
            <input
              autoFocus
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              placeholder={appText(language, "fixed.namePlaceholder")}
            />
          </label>
          <label>
            {appText(language, "booking.startTime")}
            <input type="time" value={draft.startTime} onChange={(event) => onChange({ ...draft, startTime: event.target.value })} />
          </label>
          <label>
            {appText(language, "booking.endTime")}
            <input type="time" value={draft.endTime} onChange={(event) => onChange({ ...draft, endTime: event.target.value })} />
          </label>
          {error && <p className="error-line full-field">{error}</p>}
          <div className="modal-actions full-field">
            <button className="secondary-button" onClick={onClose} type="button">
              {appText(language, "action.cancel")}
            </button>
            <button className="primary-button" onClick={onSave} type="button">
              {editingId ? appText(language, "action.save") : appText(language, "booking.add")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
