import { defaultLocationName } from "@/lib/config/app";
import {
  normalizeBillingStatus,
  normalizeLocationPlan,
  normalizeLocationUsage,
  normalizePlanLimits,
} from "@/lib/licensing";
import type { LocationItem } from "@/lib/types/domain";

export function normalizeLocationIdentity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

export function locationDocumentId(placeId: string, address: string, name: string) {
  if (placeId.trim()) {
    return `place_${normalizeLocationIdentity(placeId)}`;
  }

  const identity = normalizeLocationIdentity(address || name || defaultLocationName);
  return `address_${identity}_${stableHash(address || name || defaultLocationName)}`;
}

export function normalizeLocation(id: string, data: Record<string, unknown>, fallback: Partial<LocationItem> = {}): LocationItem {
  return {
    id,
    name: String(data.name ?? data.locationName ?? fallback.name ?? defaultLocationName),
    ownerEmail: String(data.ownerEmail ?? fallback.ownerEmail ?? ""),
    address: String(data.officialAddress ?? data.address ?? fallback.address ?? ""),
    placeId: String(data.placeId ?? fallback.placeId ?? ""),
    createdAt: data.createdAt ?? null,
    plan: normalizeLocationPlan(data.plan),
    billingStatus: normalizeBillingStatus(data.billingStatus),
    subscriptionId: String(data.subscriptionId ?? ""),
    subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
    trialEndsAt: data.trialEndsAt ?? null,
    usage: normalizeLocationUsage(data.usage),
    planLimits: normalizePlanLimits(data.planLimits),
  };
}
