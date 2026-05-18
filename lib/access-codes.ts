import type { UserRole } from "@/context/AuthContext";
import { defaultLocationName, memberAccessCodeMaxUses } from "@/lib/config/app";
import { normalizeRoomAccess } from "@/lib/room-access";
import type { LocationCode } from "@/lib/types/domain";

export function normalizeRole(role: unknown): UserRole {
  if (role === "manager" || role === "superadmin") {
    return "manager";
  }

  if (role === "member" || role === "admin") {
    return "member";
  }

  if (role === "guest" || role === "viewer" || role === "user") {
    return "guest";
  }

  return "guest";
}

export function maxUsesForAccessRole(role: UserRole) {
  if (role === "manager") {
    return 1;
  }

  return role === "member" ? memberAccessCodeMaxUses : null;
}

export function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeAccessCode(id: string, data: Record<string, unknown>): LocationCode {
  const role = normalizeRole(data.role);
  const explicitMaxUses = readOptionalNumber(data.maxUses);
  const roomScope = normalizeRoomAccess(data);

  return {
    id,
    code: String(data.code ?? id),
    role,
    groupName: String(data.groupName ?? ""),
    locationId: String(data.locationId ?? "main-location"),
    locationName: String(data.locationName ?? defaultLocationName),
    roomAccess: roomScope.roomAccess,
    allowedRoomIds: roomScope.allowedRoomIds,
    maxUses: explicitMaxUses ?? maxUsesForAccessRole(role),
    usedCount: Math.max(0, readOptionalNumber(data.usedCount) ?? 0),
    active: data.active !== false,
    createdBy: data.createdBy ? String(data.createdBy) : undefined,
    createdAt: data.createdAt,
  };
}

export function accessCodeUsageLabel(item: LocationCode) {
  if (!item.active) {
    return "Oprit";
  }

  if (item.maxUses === null) {
    return `${item.usedCount} folosiri`;
  }

  return `${item.usedCount}/${item.maxUses} folosiri`;
}

export function isAccessCodeFull(item: LocationCode) {
  return item.maxUses !== null && item.usedCount >= item.maxUses;
}

export function generateAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);

  const body = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  return `KEL-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}
