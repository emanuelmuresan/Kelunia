import type {
  BillingStatus,
  LocationItem,
  LicenseCodeItem,
  LocationPlan,
  LocationSubscription,
  LocationUsage,
  PlanFeature,
  PlanLimits,
} from "@/lib/types/domain";

export const trialDays = 14;
export const defaultLocationPlan: LocationPlan = "standard";
export const defaultBillingStatus: BillingStatus = "trialing";

type FeaturePlanGate = Exclude<LocationPlan, "trial">;

const planAccessRank: Record<LocationPlan, number> = {
  trial: 1,
  standard: 1,
  pro: 2,
  business: 3,
};

export const featureMinimumPlan: Record<PlanFeature, FeaturePlanGate> = {
  calendar: "standard",
  bookings: "standard",
  rooms: "standard",
  groups: "standard",
  notifications: "standard",
  recurring: "standard",
  auditLogs: "standard",
  assets: "pro",
  analyticsBasic: "pro",
  multiLocationDashboard: "business",
  advancedPermissions: "business",
  invoicing: "business",
  aiScheduling: "business",
};

export const standardFeatures: PlanFeature[] = [
  "calendar",
  "bookings",
  "rooms",
  "groups",
  "notifications",
  "recurring",
  "auditLogs",
];

export const proFeatures: PlanFeature[] = [
  ...standardFeatures,
  "assets",
  "analyticsBasic",
];

export const businessFeatures: PlanFeature[] = [
  ...proFeatures,
  "multiLocationDashboard",
  "advancedPermissions",
  "invoicing",
  "aiScheduling",
];

export const defaultPlanLimits: PlanLimits = {
  maxMembers: null,
  maxManagers: 2,
  maxRooms: null,
  maxGroups: null,
  maxActiveBookings: null,
};

export const emptyLocationUsage: LocationUsage = {
  bookingCount: 0,
  roomCount: 0,
  groupCount: 0,
  fixedScheduleCount: 0,
  accessCodeCount: 0,
  memberCount: 0,
};

export interface LocationLicenseAccess {
  plan: LocationPlan;
  planLabel: string;
  status: BillingStatus;
  statusLabel: string;
  features: PlanFeature[];
  canWrite: boolean;
  isReadOnly: boolean;
  message: string;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
}

export function normalizeLocationUsage(value: unknown): LocationUsage {
  const data = typeof value === "object" && value !== null ? value as Partial<Record<keyof LocationUsage, unknown>> : {};

  return {
    bookingCount: normalizeCounter(data.bookingCount),
    roomCount: normalizeCounter(data.roomCount),
    groupCount: normalizeCounter(data.groupCount),
    fixedScheduleCount: normalizeCounter(data.fixedScheduleCount),
    accessCodeCount: normalizeCounter(data.accessCodeCount),
    memberCount: normalizeCounter(data.memberCount),
  };
}

export function normalizePlanLimits(value: unknown): PlanLimits {
  const data = typeof value === "object" && value !== null ? value as Partial<Record<keyof PlanLimits, unknown>> : {};

  return {
    maxMembers: normalizeNullableLimit(data.maxMembers),
    maxManagers: normalizeLimit(data.maxManagers, defaultPlanLimits.maxManagers),
    maxRooms: normalizeNullableLimit(data.maxRooms),
    maxGroups: normalizeNullableLimit(data.maxGroups),
    maxActiveBookings: normalizeNullableLimit(data.maxActiveBookings),
  };
}

export function normalizeLocationPlan(value: unknown): LocationPlan {
  if (value === "pro" || value === "plus") {
    return "pro";
  }

  if (value === "business" || value === "enterprise") {
    return "business";
  }

  if (value === "trial") {
    return "trial";
  }

  return value === "standard" ? "standard" : defaultLocationPlan;
}

export function normalizeBillingStatus(value: unknown): BillingStatus {
  if (
    value === "active" ||
    value === "past_due" ||
    value === "paused" ||
    value === "canceled" ||
    value === "expired"
  ) {
    return value;
  }

  return defaultBillingStatus;
}

export function trialEndsAtDate(now = new Date()) {
  return new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
}

export function subscriptionEndsAtDate(now = new Date()) {
  return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
}

function trialEndsAtFromLocation(location?: LocationItem | null) {
  const explicitTrialEnd = dateFromFirestoreValue(location?.trialEndsAt);

  if (explicitTrialEnd) {
    return explicitTrialEnd;
  }

  const createdAt = dateFromFirestoreValue(location?.createdAt);

  return createdAt ? trialEndsAtDate(createdAt) : null;
}

export function initialLocationBillingFields(now = new Date()) {
  return {
    plan: defaultLocationPlan,
    billingStatus: defaultBillingStatus,
    trialEndsAt: trialEndsAtDate(now),
    subscriptionId: "",
    subscriptionExpiresAt: null,
    usage: emptyLocationUsage,
    planLimits: defaultPlanLimits,
  };
}

export function locationBillingFieldsFromLicense(data: Record<string, unknown>, now = new Date()) {
  const plan = normalizeLocationPlan(data.plan);
  const billingStatus = normalizeBillingStatus(data.billingStatus);
  const trialEnd = dateFromFirestoreValue(data.trialEndsAt);
  const subscriptionEnd = dateFromFirestoreValue(data.subscriptionExpiresAt);

  return {
    plan,
    billingStatus,
    trialEndsAt: billingStatus === "trialing" ? trialEnd ?? trialEndsAtDate(now) : trialEnd,
    subscriptionId: String(data.subscriptionId ?? ""),
    subscriptionExpiresAt: billingStatus === "active" ? subscriptionEnd ?? subscriptionEndsAtDate(now) : subscriptionEnd,
    usage: emptyLocationUsage,
    planLimits: defaultPlanLimits,
  };
}

export function featuresForPlan(plan: LocationPlan): PlanFeature[] {
  const normalizedPlan = normalizeLocationPlan(plan);

  if (normalizedPlan === "business") {
    return businessFeatures;
  }

  if (normalizedPlan === "pro") {
    return proFeatures;
  }

  return standardFeatures;
}

export function planIncludesFeature(plan: LocationPlan, feature: PlanFeature) {
  const normalizedPlan = normalizeLocationPlan(plan);
  const minimumPlan = featureMinimumPlan[feature];

  return planAccessRank[normalizedPlan] >= planAccessRank[minimumPlan];
}

export function planLabel(plan: LocationPlan) {
  if (plan === "trial") {
    return "Trial";
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "Standard";
}

export function billingStatusLabel(status: BillingStatus) {
  if (status === "active") {
    return "Activ";
  }

  if (status === "trialing") {
    return "Trial";
  }

  if (status === "past_due") {
    return "Plata intarziata";
  }

  if (status === "paused") {
    return "Pauzat";
  }

  if (status === "expired") {
    return "Expirat";
  }

  return "Anulat";
}

export function dateFromFirestoreValue(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number };

    if (typeof maybeTimestamp.toDate === "function") {
      const date = maybeTimestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof maybeTimestamp.seconds === "number") {
      return new Date(maybeTimestamp.seconds * 1000);
    }
  }

  return null;
}

export function locationLicenseAccess(location?: LocationItem | null, now = new Date()): LocationLicenseAccess {
  const plan = normalizeLocationPlan(location?.plan);
  const status = normalizeBillingStatus(location?.billingStatus);
  const features = featuresForPlan(plan);
  const trialEndsAt = trialEndsAtFromLocation(location);
  const subscriptionExpiresAt = dateFromFirestoreValue(location?.subscriptionExpiresAt);
  const activeUntil = status === "trialing" ? trialEndsAt : subscriptionExpiresAt;
  const daysRemaining = activeUntil ? Math.ceil((activeUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;
  const trialExpired = status === "trialing" && Boolean(trialEndsAt) && trialEndsAt!.getTime() < now.getTime();
  const subscriptionExpired = status === "active" && Boolean(subscriptionExpiresAt) && subscriptionExpiresAt!.getTime() < now.getTime();
  const blockedStatus = status === "past_due" || status === "paused" || status === "canceled" || status === "expired";
  const canWrite = !trialExpired && !subscriptionExpired && !blockedStatus;
  const label = planLabel(plan);
  const statusLabel = billingStatusLabel(trialExpired || subscriptionExpired ? "expired" : status);

  return {
    plan,
    planLabel: label,
    status: trialExpired || subscriptionExpired ? "expired" : status,
    statusLabel,
    features,
    canWrite,
    isReadOnly: !canWrite,
    message: canWrite
      ? ""
      : `Licenta ${label} este ${statusLabel.toLowerCase()}. Datele raman vizibile, dar modificarile sunt oprite pana la reactivare.`,
    trialEndsAt,
    daysRemaining,
  };
}

export function hasPlanFeature(access: LocationLicenseAccess, feature: PlanFeature) {
  return planIncludesFeature(access.plan, feature) && access.features.includes(feature);
}

export function normalizeLocationSubscription(id: string, data: Record<string, unknown>): LocationSubscription {
  return {
    id,
    locationId: String(data.locationId ?? ""),
    locationName: String(data.locationName ?? ""),
    plan: normalizeLocationPlan(data.plan),
    billingStatus: normalizeBillingStatus(data.billingStatus),
    provider: String(data.provider ?? ""),
    providerCustomerId: String(data.providerCustomerId ?? ""),
    providerSubscriptionId: String(data.providerSubscriptionId ?? ""),
    currentPeriodStart: data.currentPeriodStart ?? null,
    currentPeriodEnd: data.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy ? String(data.updatedBy) : undefined,
  };
}

export function normalizeLicenseCode(id: string, data: Record<string, unknown>): LicenseCodeItem {
  const code = String(data.code ?? id);

  return {
    id,
    code,
    plan: normalizeLocationPlan(data.plan),
    billingStatus: normalizeBillingStatus(data.billingStatus),
    intendedLocationName: String(data.intendedLocationName ?? ""),
    intendedAddress: String(data.intendedAddress ?? data.officialAddress ?? ""),
    active: data.active !== false,
    claimed: data.claimed === true,
    used: data.used === true,
    claimedBy: data.claimedBy ? String(data.claimedBy) : undefined,
    usedBy: data.usedBy ? String(data.usedBy) : undefined,
    locationId: String(data.locationId ?? ""),
    locationName: String(data.locationName ?? ""),
    trialEndsAt: data.trialEndsAt ?? null,
    subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
    createdAt: data.createdAt,
  };
}

function normalizeCounter(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function normalizeLimit(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function normalizeNullableLimit(value: unknown) {
  if (value === null) {
    return null;
  }

  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}
