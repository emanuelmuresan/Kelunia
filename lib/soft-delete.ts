export function isSoftDeleted(data: Record<string, unknown>) {
  return data.deleted === true || Boolean(data.deletedAt);
}
