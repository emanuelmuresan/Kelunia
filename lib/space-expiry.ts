const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function readActiveUntil(value: unknown) {
  return typeof value === "string" && dateKeyPattern.test(value) ? value : undefined;
}

// activeUntil is a YYYY-MM-DD key: the item stays selectable through that
// whole day and drops out at midnight (string compare works on ISO keys).
export function isSpaceExpired(item: { activeUntil?: string }, todayKey: string) {
  return Boolean(item.activeUntil) && todayKey > (item.activeUntil as string);
}
