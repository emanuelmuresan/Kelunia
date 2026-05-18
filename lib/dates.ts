export function dateKey(date: Date) {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

export function parseDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

export function addDays(date: Date, count: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + count);
  return copy;
}

export function getWeekStart(date: Date) {
  const copy = new Date(date);
  const dayIndex = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - dayIndex);
  return copy;
}

export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function formatDateLabel(key: string, options: Intl.DateTimeFormatOptions = {}) {
  return parseDateKey(key).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    ...options,
  });
}

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

export function weekdayIndexFromKey(key: string) {
  return (parseDateKey(key).getDay() + 6) % 7;
}
