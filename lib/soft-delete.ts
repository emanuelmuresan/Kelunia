// Ștergerea în Kelunia este logică: documentul rămâne în Firestore, marcat cu deleted: true și/sau deletedAt.
// Un document este considerat șters dacă are oricare dintre aceste marcaje.
export function isSoftDeleted(data: Record<string, unknown>) {
  return data.deleted === true || Boolean(data.deletedAt);
}
