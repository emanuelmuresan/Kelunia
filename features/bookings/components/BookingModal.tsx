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

  function syncLegacyOffsets(nextOffsets: string[]) {
    return nextOffsets
      .filter((offset) => /^([1-9]\d*)(h|d)$/.test(offset))
      .slice(0, 5);
  }

  function updateNotificationOffset(index: number, value: string) {
    const current = formData.notifyOffsets[index] ?? "1h";
    const unit = current.endsWith("d") ? "d" : "h";
    const max = unit === "h" ? 48 : 30;
    const amount = Math.max(1, Math.min(max, Number(value) || 1));
    const nextOffsets = syncLegacyOffsets(formData.notifyOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${amount}${unit}` : offset
    ));
    onChange({ ...formData, notifyOffsets: nextOffsets });
  }

  function updateNotificationOffsetUnit(index: number, unit: "h" | "d") {
    const current = formData.notifyOffsets[index] ?? "1h";
    const amount = Math.max(1, Number(current.slice(0, -1)) || 1);
    const nextAmount = unit === "h" ? Math.min(amount, 48) : Math.min(amount, 30);
    const nextOffsets = syncLegacyOffsets(formData.notifyOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${nextAmount}${unit}` : offset
    ));
    onChange({ ...formData, notifyOffsets: nextOffsets });
  }

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
              onChange={(event) => onChange({ ...formData, startDate: event.target.value })}
              required
            />
          </label>
          <label>
            Data final
            <input type="date" value={formData.endDate} onChange={(event) => onChange({ ...formData, endDate: event.target.value })} />
            <small>Alege doar dacă rezervarea este pe mai multe zile.</small>
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
          <div className="full-field notification-options booking-notification-options">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={formData.notifyOnThisBooking}
                onChange={(event) =>
                  onChange({
                    ...formData,
                    notifyOnThisBooking: event.target.checked,
                    notifyOffsets: formData.notifyOffsets.length > 0 ? formData.notifyOffsets : ["1h"],
                  })
                }
              />
              Notificari pentru aceasta programare
            </label>

            {formData.notifyOnThisBooking && (
              <>
                {formData.notifyOffsets.map((offset, index) => {
                  const unit = offset.endsWith("d") ? "d" : "h";
                  const amount = Math.max(1, Number(offset.slice(0, -1)) || 1);

                  return (
                    <label key={`${offset}-${index}`}>
                      Cu cat timp inainte
                      <div className="inline-add">
                        <input
                          min={1}
                          max={unit === "h" ? 48 : 30}
                          type="number"
                          value={amount}
                          onChange={(event) => updateNotificationOffset(index, event.target.value)}
                        />
                        <select value={unit} onChange={(event) => updateNotificationOffsetUnit(index, event.target.value as "h" | "d")}>
                          <option value="h">ore</option>
                          <option value="d">zile</option>
                        </select>
                        <button
                          className="secondary-button compact"
                          onClick={() =>
                            onChange({
                              ...formData,
                              notifyOffsets: formData.notifyOffsets.filter((_, offsetIndex) => offsetIndex !== index),
                            })
                          }
                          type="button"
                        >
                          Sterge
                        </button>
                      </div>
                    </label>
                  );
                })}
                {formData.notifyOffsets.length < 5 && (
                  <button
                    className="secondary-button compact"
                    onClick={() => onChange({ ...formData, notifyOffsets: [...formData.notifyOffsets, "1h"] })}
                    type="button"
                  >
                    Adauga notificare
                  </button>
                )}
              </>
            )}
          </div>
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
