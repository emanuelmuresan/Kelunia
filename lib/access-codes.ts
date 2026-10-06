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
    expiresAt: data.expiresAt,
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

// Codes created before expiresAt existed carry no such field and never expire
// (grandfathered) - matches firestore.rules' accessCodeNotExpired().
export function isAccessCodeExpired(item: Pick<LocationCode, "expiresAt">) {
  const expiresAt = item.expiresAt as { toMillis?: () => number } | undefined;

  if (!expiresAt || typeof expiresAt.toMillis !== "function") {
    return false;
  }

  return expiresAt.toMillis() <= Date.now();
}

export function accessCodeExpiryLabel(item: Pick<LocationCode, "expiresAt">) {
  const expiresAt = item.expiresAt as { toDate?: () => Date } | undefined;

  if (!expiresAt || typeof expiresAt.toDate !== "function") {
    return "";
  }

  const label = expiresAt.toDate().toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
  return isAccessCodeExpired(item) ? `Expirat pe ${label}` : `Expiră pe ${label}`;
}

function roleShareLabel(role: UserRole) {
  if (role === "manager") {
    return "Administrator";
  }

  if (role === "member") {
    return "Colaborator";
  }

  return "Oaspete";
}

function expiryShareDateLabel(item: Pick<LocationCode, "expiresAt">) {
  const expiresAt = item.expiresAt as { toDate?: () => Date } | undefined;

  if (!expiresAt || typeof expiresAt.toDate !== "function") {
    return "";
  }

  return expiresAt.toDate().toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
}

// Mirrors accessInviteText() in functions/src/index.ts so the text a manager
// copies to paste into WhatsApp/SMS reads the same as the invite email.
export function buildAccessInviteShareText(
  item: Pick<LocationCode, "code" | "role" | "groupName" | "locationName" | "expiresAt">,
  link: string,
  customMessage?: string
) {
  const groupName = item.role === "manager" ? "" : item.groupName.trim();
  const expiryLabel = expiryShareDateLabel(item);
  const intro = customMessage?.trim() || `Ai primit o invitație pentru Kelunia, locația ${item.locationName}.`;

  return [
    intro,
    "",
    `Locație: ${item.locationName}`,
    `Rol: ${roleShareLabel(item.role)}`,
    groupName ? `Grup: ${groupName}` : "",
    "",
    "Pași:",
    "1. Deschide linkul de mai jos pe telefon sau calculator.",
    "2. Creează contul sau intră în cont dacă ai deja unul.",
    "3. Confirmă emailul, dacă aplicația îți cere acest lucru.",
    "4. Kelunia va folosi codul de acces pentru a te conecta la locația potrivită.",
    "",
    `Link invitație: ${link}`,
    `Cod acces: ${item.code}`,
    expiryLabel ? `Acest cod expiră pe ${expiryLabel}. Dacă a trecut termenul, cere unul nou.` : "",
    "",
    "Dacă linkul nu se deschide corect, intră manual în aplicația Kelunia și folosește codul de acces de mai sus.",
    "",
    "---",
    "Kelunia",
  ].filter(Boolean).join("\n");
}

export function generateAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);

  const body = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  return `KEL-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}
