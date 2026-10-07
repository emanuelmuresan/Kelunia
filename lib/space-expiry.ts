// Valabilitatea camerelor și a grupurilor: o dată-limită „activeUntil” după care elementul nu mai poate fi ales la rezervări.
// Formatul datei-limită: AAAA-LL-ZZ.
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

// Citește activeUntil din Firestore; valorile care nu au formatul corect sunt ignorate.
export function readActiveUntil(value: unknown) {
  return typeof value === "string" && dateKeyPattern.test(value) ? value : undefined;
}

// activeUntil is a YYYY-MM-DD key: the item stays selectable through that
// whole day and drops out at midnight (string compare works on ISO keys).
export function isSpaceExpired(item: { activeUntil?: string }, todayKey: string) {
  return Boolean(item.activeUntil) && todayKey > (item.activeUntil as string);
}
