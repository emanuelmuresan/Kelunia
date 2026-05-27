"use client";

import type { FormEvent } from "react";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { BookingForm, GroupItem, ManagedUser, RoomItem } from "@/lib/types/domain";

export type BookingFormState = BookingForm;

interface BookingModalProps {
  open: boolean;
  editingId: string | null;
  formData: BookingForm;
  groups: GroupItem[];
  managedUsers: ManagedUser[];
  rooms: RoomItem[];
  groupsLabel?: string;
  roomsLabel?: string;
  language?: SupportedLocale;
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
  managedUsers,
  rooms,
  groupsLabel = "Grup",
  roomsLabel = "Sala",
  language = "ro",
  error,
  onChange,
  onClose,
  onSubmit,
}: BookingModalProps) {
  if (!open) {
    return null;
  }

  const selectedRoomId = formData.roomId || rooms.find((room) => room.name === formData.room)?.id || "";
  const selectedGroupMembers = managedUsers.filter((managedUser) =>
    managedUser.groupName.trim().toLowerCase() === formData.group.trim().toLowerCase() &&
    managedUser.email.trim()
  );

  function syncLegacyOffsets(nextOffsets: string[]) {
    return nextOffsets
      .filter((offset) => /^([1-9]\d*)(m|h|d)$/.test(offset))
      .slice(0, 5);
  }

  function offsetParts(offset = "15m"): { amount: number; unit: "m" | "h" | "d" } {
    const unit = offset.endsWith("d") ? "d" : offset.endsWith("h") ? "h" : "m";
    const amount = Math.max(1, Number(offset.slice(0, -1)) || 1);
    return { amount, unit };
  }

  function maxForUnit(unit: "m" | "h" | "d") {
    return unit === "m" ? 120 : unit === "h" ? 48 : 30;
  }

  function updateNotificationOffset(index: number, value: string) {
    const { unit } = offsetParts(formData.notifyOffsets[index]);
    const max = maxForUnit(unit);
    const amount = Math.max(1, Math.min(max, Number(value) || 1));
    const nextOffsets = syncLegacyOffsets(formData.notifyOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${amount}${unit}` : offset
    ));
    onChange({ ...formData, notifyOffsets: nextOffsets });
  }

  function updateNotificationOffsetUnit(index: number, unit: "m" | "h" | "d") {
    const { amount } = offsetParts(formData.notifyOffsets[index]);
    const nextAmount = Math.min(amount, maxForUnit(unit));
    const nextOffsets = syncLegacyOffsets(formData.notifyOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${nextAmount}${unit}` : offset
    ));
    onChange({ ...formData, notifyOffsets: nextOffsets });
  }

  function updateGroupNotificationOffset(index: number, value: string) {
    const { unit } = offsetParts(formData.notifyGroupOffsets[index]);
    const max = maxForUnit(unit);
    const amount = Math.max(1, Math.min(max, Number(value) || 1));
    const nextOffsets = syncLegacyOffsets(formData.notifyGroupOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${amount}${unit}` : offset
    ));
    onChange({ ...formData, notifyGroupOffsets: nextOffsets });
  }

  function updateGroupNotificationOffsetUnit(index: number, unit: "m" | "h" | "d") {
    const { amount } = offsetParts(formData.notifyGroupOffsets[index]);
    const nextAmount = Math.min(amount, maxForUnit(unit));
    const nextOffsets = syncLegacyOffsets(formData.notifyGroupOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${nextAmount}${unit}` : offset
    ));
    onChange({ ...formData, notifyGroupOffsets: nextOffsets });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={appText(language, "booking.details")}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{editingId ? appText(language, "booking.editing") : appText(language, "booking.new")}</span>
            <h2>{editingId ? appText(language, "booking.update") : appText(language, "booking.new")}</h2>
          </div>
          <button onClick={onClose} type="button" aria-label={appText(language, "booking.close")}>
            ×
          </button>
        </div>
        <form className="booking-form" onSubmit={onSubmit}>
          <label>
            {groupsLabel}
            <select value={formData.group} onChange={(event) => onChange({ ...formData, group: event.target.value })}>
              <option value="">{appText(language, "booking.selectGroup")}</option>
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
              <option value="">{appText(language, "booking.selectRoom")}</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </label>
          <label>
            {appText(language, "booking.startDate")}
            <input
              type="date"
              value={formData.startDate}
              onChange={(event) => onChange({ ...formData, startDate: event.target.value })}
              required
            />
          </label>
          <label>
            {appText(language, "booking.endDate")}
            <input type="date" value={formData.endDate} onChange={(event) => onChange({ ...formData, endDate: event.target.value })} />
            <small>{appText(language, "booking.endDateHint")}</small>
          </label>
          <label>
            {appText(language, "booking.startTime")}
            <input type="time" value={formData.startTime} onChange={(event) => onChange({ ...formData, startTime: event.target.value })} required />
          </label>
          <label>
            {appText(language, "booking.endTime")}
            <input type="time" value={formData.endTime} onChange={(event) => onChange({ ...formData, endTime: event.target.value })} required />
          </label>
          <label className="full-field">
            {appText(language, "booking.reason")}
            <input
              value={formData.reason}
              onChange={(event) => onChange({ ...formData, reason: event.target.value })}
              placeholder={appText(language, "booking.reasonPlaceholder")}
              required
            />
          </label>
          <div className="full-field notification-options booking-notification-options">
            <div className="notification-quick-actions">
              <button
                className="primary-button compact"
                disabled={!formData.group}
                name="bookingAction"
                type="submit"
                value="notify-group-now"
              >
                {appText(language, "booking.notifyNow")}
              </button>
              <span>{formData.group ? appText(language, "booking.groupNowHelp") : appText(language, "booking.groupRequired")}</span>
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={formData.notifyOnThisBooking}
                onChange={(event) =>
                  onChange({
                    ...formData,
                    notifyOnThisBooking: event.target.checked,
                    notifyOffsets: formData.notifyOffsets.length > 0 ? formData.notifyOffsets : ["15m"],
                  })
                }
              />
              {appText(language, "booking.personalNotification")}
            </label>

            {formData.notifyOnThisBooking && (
              <>
                {formData.notifyOffsets.map((offset, index) => {
                  const { unit, amount } = offsetParts(offset);

                  return (
                    <label key={`${offset}-${index}`}>
                      {appText(language, "booking.offsetBefore")}
                      <div className="inline-add">
                        <input
                          min={1}
                          max={maxForUnit(unit)}
                          type="number"
                          value={amount}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => updateNotificationOffset(index, event.target.value)}
                        />
                        <select value={unit} onChange={(event) => updateNotificationOffsetUnit(index, event.target.value as "m" | "h" | "d")}>
                          <option value="m">{appText(language, "booking.minute")}</option>
                          <option value="h">{appText(language, "booking.hour")}</option>
                          <option value="d">{appText(language, "booking.day")}</option>
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
                          {appText(language, "action.delete")}
                        </button>
                      </div>
                    </label>
                  );
                })}
                {formData.notifyOffsets.length < 5 && (
                  <button
                    className="secondary-button compact"
                    onClick={() => onChange({ ...formData, notifyOffsets: [...formData.notifyOffsets, "15m"] })}
                    type="button"
                  >
                    {appText(language, "booking.notifications")}
                  </button>
                )}
              </>
            )}

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={formData.notifyGroupOnThisBooking}
                onChange={(event) =>
                  onChange({
                    ...formData,
                    notifyGroupOnThisBooking: event.target.checked,
                    notifyGroupOffsets: formData.notifyGroupOffsets.length > 0 ? formData.notifyGroupOffsets : ["15m"],
                  })
                }
              />
              {appText(language, "booking.groupReminder")}
            </label>

            {(formData.notifyGroupOnThisBooking || formData.group) && (
              <div className="notification-audience">
                <label>
                  {appText(language, "booking.audience")}
                  <select
                    value={formData.notifyGroupAudience}
                    onChange={(event) =>
                      onChange({
                        ...formData,
                        notifyGroupAudience: event.target.value as "all" | "selected",
                        notifyGroupRecipients: event.target.value === "all" ? [] : formData.notifyGroupRecipients,
                      })
                    }
                  >
                    <option value="all">{appText(language, "booking.audienceAll")}</option>
                    <option value="selected">{appText(language, "booking.audienceSelected")}</option>
                  </select>
                </label>

                {formData.notifyGroupAudience === "selected" && (
                  <div className="recipient-check-grid">
                    {selectedGroupMembers.length === 0 ? (
                      <p className="empty-line">{appText(language, "booking.noActiveUsers")}</p>
                    ) : (
                      selectedGroupMembers.map((managedUser) => (
                        <label className="toggle-row compact-toggle" key={managedUser.id}>
                          <input
                            type="checkbox"
                            checked={formData.notifyGroupRecipients.includes(managedUser.email.toLowerCase())}
                            onChange={(event) => {
                              const email = managedUser.email.toLowerCase();
                              const notifyGroupRecipients = event.target.checked
                                ? Array.from(new Set([...formData.notifyGroupRecipients, email]))
                                : formData.notifyGroupRecipients.filter((item) => item !== email);

                              onChange({ ...formData, notifyGroupRecipients });
                            }}
                          />
                          {managedUser.displayName || managedUser.email}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {formData.notifyGroupOnThisBooking && (
              <>
                {formData.notifyGroupOffsets.map((offset, index) => {
                  const { unit, amount } = offsetParts(offset);

                  return (
                    <label key={`group-${offset}-${index}`}>
                      {appText(language, "booking.groupReminderDelay")}
                      <div className="inline-add">
                        <input
                          min={1}
                          max={maxForUnit(unit)}
                          type="number"
                          value={amount}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => updateGroupNotificationOffset(index, event.target.value)}
                        />
                        <select value={unit} onChange={(event) => updateGroupNotificationOffsetUnit(index, event.target.value as "m" | "h" | "d")}>
                          <option value="m">{appText(language, "booking.minute")}</option>
                          <option value="h">{appText(language, "booking.hour")}</option>
                          <option value="d">{appText(language, "booking.day")}</option>
                        </select>
                        <button
                          className="secondary-button compact"
                          onClick={() =>
                            onChange({
                              ...formData,
                              notifyGroupOffsets: formData.notifyGroupOffsets.filter((_, offsetIndex) => offsetIndex !== index),
                            })
                          }
                          type="button"
                        >
                          {appText(language, "action.delete")}
                        </button>
                      </div>
                    </label>
                  );
                })}
                {formData.notifyGroupOffsets.length < 5 && (
                  <button
                    className="secondary-button compact"
                    onClick={() => onChange({ ...formData, notifyGroupOffsets: [...formData.notifyGroupOffsets, "15m"] })}
                    type="button"
                  >
                    {appText(language, "booking.groupReminder")}
                  </button>
                )}
              </>
            )}
          </div>
          {error && <p className="error-line full-field">{error}</p>}
          <div className="modal-actions full-field">
            <button className="secondary-button" type="button" onClick={onClose}>{appText(language, "action.cancel")}</button>
            <button className="primary-button" type="submit">{editingId ? appText(language, "action.save") : appText(language, "booking.confirm")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
