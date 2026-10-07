// Funcții pentru date, lucrând cu chei „AAAA-LL-ZZ” (ora locală) în loc de obiecte Date, ca să evite problemele de fus orar.
// Cheia zilei, în ora locală.
export function dateKey(date: Date) {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

// Data de la cheie, la prânz, ca schimbările de oră să nu o mute în altă zi.
export function parseDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

// Adaugă (sau scade) zile.
export function addDays(date: Date, count: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + count);
  return copy;
}

// Începutul săptămânii (luni).
export function getWeekStart(date: Date) {
  const copy = new Date(date);
  const dayIndex = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - dayIndex);
  return copy;
}

// Prima și ultima zi a lunii.
export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Etichete de dată în limba română.
export function formatDateLabel(key: string, options: Intl.DateTimeFormatOptions = {}) {
  return parseDateKey(key).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    ...options,
  });
}

// Moment din jurnalul de audit (Timestamp Firestore sau Date) în format scurt.
export function formatAuditTimestamp(value: unknown) {
  const maybeTimestamp = value as { toDate?: () => Date } | null;
  const date = value instanceof Date ? value : maybeTimestamp?.toDate?.();

  if (!date) {
    return "";
  }

  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Toate zilele dintre două date, inclusiv capetele.
export function datesInRange(start: string, end: string) {
  const days: string[] = [];
  let cursor = parseDateKey(start);
  const last = parseDateKey(end || start);

  while (cursor <= last) {
    days.push(dateKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
}

// Ziua săptămânii cu luni = 0.
export function weekdayIndexFromKey(key: string) {
  return (parseDateKey(key).getDay() + 6) % 7;
}
