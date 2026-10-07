import type { UserRole } from "@/context/AuthContext";
import { defaultLocationName, memberAccessCodeMaxUses } from "@/lib/config/app";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
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

const dateLocales: Record<SupportedLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  es: "es-ES",
  it: "it-IT",
  fr: "fr-FR",
  pt: "pt-PT",
};

export function accessCodeUsageLabel(item: LocationCode, language: SupportedLocale = "ro") {
  if (!item.active) {
    return appText(language, "access.usageOff");
  }

  if (item.maxUses === null) {
    return appText(language, "access.usesMany").replace("{{count}}", String(item.usedCount));
  }

  return appText(language, "access.usesOf")
    .replace("{{used}}", String(item.usedCount))
    .replace("{{max}}", String(item.maxUses));
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

export function accessCodeExpiryLabel(item: Pick<LocationCode, "expiresAt">, language: SupportedLocale = "ro") {
  const expiresAt = item.expiresAt as { toDate?: () => Date } | undefined;

  if (!expiresAt || typeof expiresAt.toDate !== "function") {
    return "";
  }

  const label = expiresAt.toDate().toLocaleDateString(dateLocales[language], { day: "2-digit", month: "short", year: "numeric" });
  return appText(language, isAccessCodeExpired(item) ? "access.expiredOn" : "access.expiresOn").replace("{{date}}", label);
}

const roleShareKeys = {
  manager: "role.administrator",
  member: "role.collaborator",
  guest: "role.guest",
} as const;

function expiryShareDateLabel(item: Pick<LocationCode, "expiresAt">, language: SupportedLocale) {
  const expiresAt = item.expiresAt as { toDate?: () => Date } | undefined;

  if (!expiresAt || typeof expiresAt.toDate !== "function") {
    return "";
  }

  return expiresAt.toDate().toLocaleDateString(dateLocales[language], { day: "2-digit", month: "long", year: "numeric" });
}

// Mirrors accessInviteText() in functions/src/index.ts so the text a manager
// copies to paste into WhatsApp/SMS reads the same as the invite email - in
// whichever language the manager picked for the invitation.
export function buildAccessInviteShareText(
  item: Pick<LocationCode, "code" | "role" | "groupName" | "locationName" | "expiresAt">,
  link: string,
  customMessage?: string,
  language: SupportedLocale = "ro"
) {
  const t = (key: Parameters<typeof appText>[1]) => appText(language, key);
  const groupName = item.role === "manager" ? "" : item.groupName.trim();
  const expiryLabel = expiryShareDateLabel(item, language);
  const intro = customMessage?.trim() || t("invite.defaultIntro").replace("{{location}}", item.locationName);

  return [
    intro,
    "",
    `${t("invite.location")}: ${item.locationName}`,
    `${t("invite.role")}: ${t(roleShareKeys[item.role])}`,
    groupName ? `${t("invite.group")}: ${groupName}` : "",
    "",
    t("invite.stepsTitle"),
    `1. ${t("invite.step1")}`,
    `2. ${t("invite.step2")}`,
    `3. ${t("invite.step3")}`,
    `4. ${t("invite.step4")}`,
    "",
    `${t("invite.linkLabel")}: ${link}`,
    `${t("invite.codeLabel")}: ${item.code}`,
    expiryLabel ? t("invite.expiresOn").replace("{{date}}", expiryLabel) : "",
    "",
    t("invite.fallback"),
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
