"use client";

import type { FormEvent } from "react";
import type { BookingForm, GroupItem, RoomItem } from "@/lib/types/domain";

export type BookingFormState = BookingForm;

interface BookingModalProps {
  open: boolean;
  editingId: string | null;
  formData: BookingForm;
  groups: GroupItem[];
  rooms: RoomItem[];
  groupsLabel?: string;
  roomsLabel?: string;
  error: string;
  onChange: (nextForm: BookingForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function BookingModal({
  open,
  editingId,
  formData,
  groups,
  rooms,
  groupsLabel = "Grup",
  roomsLabel = "Sala",
  error,
  onChange,
  onClose,
  onSubmit,
}: BookingModalProps) {
  if (!open) {
    return null;
  }

  const selectedRoomId = formData.roomId || rooms.find((room) => room.name === formData.room)?.id || "";

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Programare">
        <div className="modal-head">
          <div>
            <span className="eyebrow">{editingId ? "Editare" : "Programare nouă"}</span>
            <h2>{editingId ? "Actualizează programarea" : "Adaugă programare"}</h2>
          </div>
          <button onClick={onClose} type="button" aria-label="Închide">
            ×
          </button>
        </div>
        <form className="booking-form" onSubmit={onSubmit}>
          <label>
            {groupsLabel}
            <select value={formData.group} onChange={(event) => onChange({ ...formData, group: event.target.value })}>
              <option value="">Alege {groupsLabel.toLowerCase()}</option>
              {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
            </select>
          </label>
          <label>
            {roomsLabel}
            <select
              value={selectedRoomId}
              onChange={(event) => {
                const selectedRoom = rooms.find((room) => room.id === event.target.value);
                onChange({ ...formData, roomId: selectedRoom?.id ?? "", room: selectedRoom?.name ?? "" });
              }}
            >
              <option value="">Alege {roomsLabel.toLowerCase()}</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
          <label>
            Data început
            <input
              type="date"
              value={formData.startDate}
              onChange={(event) => onChange({ ...formData, startDate: event.target.value, endDate: event.target.value })}
              required
            />
          </label>
          <label>
            Data final
            <input type="date" value={formData.endDate} onChange={(event) => onChange({ ...formData, endDate: event.target.value })} />
          </label>
          <label>
            Ora început
            <input type="time" value={formData.startTime} onChange={(event) => onChange({ ...formData, startTime: event.target.value })} required />
          </label>
          <label>
            Ora final
            <input type="time" value={formData.endTime} onChange={(event) => onChange({ ...formData, endTime: event.target.value })} required />
          </label>
          <label className="full-field">
            Motiv
            <input
              value={formData.reason}
              onChange={(event) => onChange({ ...formData, reason: event.target.value })}
              placeholder="ex. intalnire, curatenie, repetitie"
              required
            />
          </label>
          {error && <p className="error-line full-field">{error}</p>}
          <div className="modal-actions full-field">
            <button className="secondary-button" type="button" onClick={onClose}>Anulează</button>
            <button className="primary-button" type="submit">{editingId ? "Salvează" : "Confirmă"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
