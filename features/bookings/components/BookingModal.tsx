"use client";

// Fereastra cu formularul de rezervare (nouă sau editată): grup, cameră, date, ore, motiv și opțiunile de notificare.
// Starea formularului este ținută de useBookingEditor; aici se afișează câmpurile și se avertizează la conflicte.
import { useMemo, useState, type FormEvent } from "react";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { Booking, BookingForm, FixedSchedule, GroupItem, ManagedUser, RoomItem } from "@/lib/types/domain";
import { findBookingConflict } from "@/features/bookings/services/booking-conflicts";

// Tipul stării formularului, refolosit de alte fișiere.
export type BookingFormState = BookingForm;

// Proprietățile ferestrei: datele formularului, listele de alegere, rezervările (pentru conflicte) și acțiunile.
interface BookingModalProps {
  open: boolean;
  editingId: string | null;
  formData: BookingForm;
  groups: GroupItem[];
  managedUsers: ManagedUser[];
  rooms: RoomItem[];
  bookings: Booking[];
  fixedSchedules: FixedSchedule[];
  groupsLabel?: string;
  roomsLabel?: string;
  canNotifyWholeLocation?: boolean;
  language?: SupportedLocale;
  error: string;
  onChange: (nextForm: BookingForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

// Componenta ferestrei.
export function BookingModal({
  open,
  editingId,
  formData,
  groups,
  managedUsers,
  rooms,
  bookings,
  fixedSchedules,
  groupsLabel = "Grup",
  roomsLabel = "Sala",
  canNotifyWholeLocation = false,
  language = "ro",
  error,
  onChange,
  onClose,
  onSubmit,
}: BookingModalProps) {
  // Dacă panoul „trimite acum” (alegerea publicului) este deschis.
  const [notifyNowOpen, setNotifyNowOpen] = useState(false);

  // Avertisment imediat dacă intervalul ales se suprapune cu o altă rezervare sau cu un program fix.
  const conflict = useMemo(() => {
    if (!formData.startDate || !formData.room || !formData.startTime || !formData.endTime) {
      return null;
    }

    return findBookingConflict({ bookings, fixedSchedules, form: formData, ignoredId: editingId });
  }, [bookings, fixedSchedules, formData, editingId]);

  // Fereastra închisă nu se randează.
  if (!open) {
    return null;
  }

  // Camera aleasă și persoanele grupului ales (pentru notificări către persoane anume).
  const selectedRoomId = formData.roomId || rooms.find((room) => room.name === formData.room)?.id || "";
  const selectedGroupMembers = managedUsers.filter((managedUser) =>
    managedUser.groupName.trim().toLowerCase() === formData.group.trim().toLowerCase() &&
    managedUser.email.trim()
  );

  // Ajutoare pentru momentele de notificare: format „15m/2h/7d”, maximum 5, limite de 120 minute, 48 ore, 30 zile.
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

  // Modifică valoarea sau unitatea unui moment de notificare personală.
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

  // Modifică valoarea sau unitatea unui moment de reamintire pentru grup.
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

  // Structura ferestrei.
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={appText(language, "booking.details")}>
        {/* Antetul: „Rezervare nouă” sau „Modifică rezervarea”. */}
        <div className="modal-head">
          <div>
            <span className="eyebrow">{editingId ? appText(language, "booking.editing") : appText(language, "booking.new")}</span>
            <h2>{editingId ? appText(language, "booking.update") : appText(language, "booking.new")}</h2>
          </div>
          <button onClick={onClose} type="button" aria-label={appText(language, "booking.close")}>
            ×
          </button>
        </div>
        {/* Formularul rezervării. */}
        <form className="booking-form" onSubmit={onSubmit}>
          {/* Grupul și camera. */}
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
          {/* Datele și orele; data de sfârșit este opțională (implicit aceeași zi). */}
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
          {/* Motivul rezervării. */}
          <label className="full-field">
            {appText(language, "booking.reason")}
            <input
              value={formData.reason}
              onChange={(event) => onChange({ ...formData, reason: event.target.value })}
              placeholder={appText(language, "booking.reasonPlaceholder")}
              required
            />
          </label>
          {/* Notificări: trimitere imediată, notificare personală și reamintire pentru grup. */}
          <div className="full-field notification-options booking-notification-options">
            {/* Notificare imediată: către grup sau, pentru manageri, către toată locația ori către persoane alese. */}
            <div className="notification-quick-actions">
              {!canNotifyWholeLocation ? (
                <>
                  <button
                    className="primary-button compact"
                    disabled={!formData.group}
                    type="submit"
                    name="bookingAction"
                    value="notify-group-now"
                    onClick={() => onChange({ ...formData, notifyGroupAudience: "all", notifyGroupRecipients: [], notifyNowScope: "group" })}
                  >
                    {appText(language, "booking.notifyToGroup").replace("{{label}}", groupsLabel.toLowerCase())}
                  </button>
                  <span>{formData.group ? appText(language, "booking.groupNowHelp") : appText(language, "booking.groupRequired")}</span>
                </>
              ) : !notifyNowOpen ? (
                <>
                  <button
                    className="primary-button compact"
                    disabled={!formData.group}
                    type="button"
                    onClick={() => setNotifyNowOpen(true)}
                  >
                    {appText(language, "booking.notifyNow")}
                  </button>
                  <span>{formData.group ? appText(language, "booking.groupNowHelp") : appText(language, "booking.groupRequired")}</span>
                </>
              ) : (
                <div className="notify-now-confirm">
                  <strong>{appText(language, "booking.audience")}</strong>

                  <label className="toggle-row compact-toggle">
                    <input
                      type="radio"
                      name="notifyNowAudience"
                      checked={formData.notifyNowScope === "group" && formData.notifyGroupAudience !== "selected"}
                      onChange={() => onChange({ ...formData, notifyGroupAudience: "all", notifyGroupRecipients: [], notifyNowScope: "group" })}
                    />
                    {appText(language, "booking.audienceAll")}
                  </label>
                  <label className="toggle-row compact-toggle">
                    <input
                      type="radio"
                      name="notifyNowAudience"
                      checked={formData.notifyNowScope === "location"}
                      onChange={() => onChange({ ...formData, notifyGroupAudience: "all", notifyGroupRecipients: [], notifyNowScope: "location" })}
                    />
                    {appText(language, "booking.audienceLocation")}
                  </label>
                  <label className="toggle-row compact-toggle">
                    <input
                      type="radio"
                      name="notifyNowAudience"
                      checked={formData.notifyNowScope === "group" && formData.notifyGroupAudience === "selected"}
                      onChange={() => onChange({ ...formData, notifyGroupAudience: "selected", notifyNowScope: "group" })}
                    />
                    {appText(language, "booking.audienceSelected")}
                  </label>

                  {formData.notifyNowScope === "group" && formData.notifyGroupAudience === "selected" && (
                    <div className="recipient-check-grid">
                      {selectedGroupMembers.length === 0 ? (
                        <p className="empty-line">{appText(language, "booking.noActiveUsers")}</p>
                      ) : (
                        selectedGroupMembers.map((managedUser) => {
                          const email = managedUser.email.toLowerCase();

                          return (
                            <label className="toggle-row compact-toggle" key={managedUser.id}>
                              <input
                                type="checkbox"
                                checked={formData.notifyGroupRecipients.includes(email)}
                                onChange={(event) => {
                                  const notifyGroupRecipients = event.target.checked
                                    ? Array.from(new Set([...formData.notifyGroupRecipients, email]))
                                    : formData.notifyGroupRecipients.filter((item) => item !== email);

                                  onChange({ ...formData, notifyGroupRecipients });
                                }}
                              />
                              {managedUser.displayName || managedUser.email}
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}

                  <div className="inline-add">
                    <button className="secondary-button compact" type="button" onClick={() => setNotifyNowOpen(false)}>
                      {appText(language, "action.cancel")}
                    </button>
                    <button
                      className="primary-button compact"
                      type="submit"
                      name="bookingAction"
                      value="notify-group-now"
                      disabled={!formData.group || (formData.notifyGroupAudience === "selected" && formData.notifyGroupRecipients.length === 0)}
                    >
                      {appText(language, "booking.notifyNow")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notificare personală înainte de rezervare, cu până la 5 momente. */}
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

            {/* Momentele notificării personale. */}
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

            {/* Reamintire pentru grupul rezervării. */}
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

            {/* Publicul reamintirii: tot grupul sau persoane alese. */}
            {formData.notifyGroupOnThisBooking && (
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

            {/* Momentele reamintirii pentru grup. */}
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
          {/* Mesajele de eroare: conflictul detectat local sau eroarea de la salvare. */}
          {conflict && !error && (
            <p className="error-line full-field">Există deja o programare: {conflict}.</p>
          )}
          {error && <p className="error-line full-field">{error}</p>}
          {/* Butoanele de anulare și salvare. */}
          <div className="modal-actions full-field">
            <button className="secondary-button" type="button" onClick={onClose}>{appText(language, "action.cancel")}</button>
            <button className="primary-button" type="submit">{editingId ? appText(language, "action.save") : appText(language, "booking.confirm")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
