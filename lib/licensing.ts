// Licențierea locațiilor: planuri, stare de facturare, limite, perioada de probă și dacă o locație mai poate fi modificată.
// O locație cu perioada de probă sau abonamentul expirat, sau cu facturare blocată, devine doar pentru citire.
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
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

// Durata perioadei de probă și planul/starea implicite pentru o locație nouă.
export const trialDays = 14;
export const defaultLocationPlan: LocationPlan = "standard";
export const defaultBillingStatus: BillingStatus = "trialing";

// Ierarhia planurilor și planul minim necesar fiecărei funcții.
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
  multiLocationDashboard: "business",
};

// Funcțiile incluse în fiecare plan (în prezent toate planurile au aceleași funcții, mai puțin tabloul pentru mai multe locații).
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
];

export const businessFeatures: PlanFeature[] = [
  ...proFeatures,
  "multiLocationDashboard",
];

// Limitele implicite ale planului (null = nelimitat; maximum 2 manageri) și contoarele de utilizare goale.
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

// Rezultatul calculului de acces: plan, stare, funcții, dacă se poate scrie, mesajul de afișat și zilele rămase.
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
  // Licență fără expirare (data de expirare este în 2099 sau mai târziu).
  isLifetime: boolean;
}

// Normalizează contoarele și limitele citite din Firestore (valori lipsă sau invalide devin 0/implicit).
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

// Acceptă și numele vechi ale planurilor (plus, enterprise) și le mapează pe cele curente.
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

// Stare de facturare necunoscută se tratează ca perioadă de probă.
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

// Calculează sfârșitul perioadei de probă (14 zile) și al unui abonament anual (365 zile).
// Licență „pe viață”: nu există un câmp separat, ci o dată de expirare foarte îndepărtată (1 ianuarie 2100).
// Astfel toate verificările de expirare (interfață, funcții cloud, reguli) rămân neschimbate.
export const lifetimeExpiryKey = "2100-01-01";

export function lifetimeExpiryDate() {
  return new Date(`${lifetimeExpiryKey}T12:00:00`);
}

// O dată de la 2099 încolo este tratată ca „pe viață”.
export function isLifetimeDate(date: Date | null) {
  return date !== null && date.getFullYear() >= 2099;
}

export function trialEndsAtDate(now = new Date()) {
  return new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
}

export function subscriptionEndsAtDate(now = new Date()) {
  return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
}

// Sfârșitul probei unei locații: câmpul explicit sau data creării plus durata probei.
function trialEndsAtFromLocation(location?: LocationItem | null) {
  const explicitTrialEnd = dateFromFirestoreValue(location?.trialEndsAt);

  if (explicitTrialEnd) {
    return explicitTrialEnd;
  }

  const createdAt = dateFromFirestoreValue(location?.createdAt);

  return createdAt ? trialEndsAtDate(createdAt) : null;
}

// Câmpurile de facturare pentru o locație nouă și pentru una creată dintr-o licență.
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

// Funcțiile pe care le are un plan și verificarea dacă un plan include o funcție.
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

// Etichetele afișate pentru plan și pentru starea de facturare.
export function planLabel(plan: LocationPlan, language: SupportedLocale = "ro") {
  if (plan === "trial") {
    return appText(language, "license.planTrial");
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "Standard";
}

export function billingStatusLabel(status: BillingStatus, language: SupportedLocale = "ro") {
  if (status === "active") {
    return appText(language, "license.statusActive");
  }

  if (status === "trialing") {
    return appText(language, "license.planTrial");
  }

  if (status === "past_due") {
    return appText(language, "license.statusPastDue");
  }

  if (status === "paused") {
    return appText(language, "license.statusPaused");
  }

  if (status === "expired") {
    return appText(language, "license.statusExpired");
  }

  return appText(language, "license.statusCanceled");
}

// Transformă Timestamp-ul Firestore, un Date sau {seconds} într-un Date; valorile invalide dau null.
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

// Data unei cereri din comunitate în format scurt, în română.
/** "12 sept. 2026, 14:30" from a Firestore Timestamp/Date/`{seconds}` value. */
export function communityDateLabel(value: unknown): string {
  const date = dateFromFirestoreValue(value);

  if (!date) {
    return "data nespecificata";
  }

  return date.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calculează accesul locației: scrierea este blocată dacă proba/abonamentul au expirat sau starea de facturare este blocată.
export function locationLicenseAccess(location?: LocationItem | null, now = new Date(), language: SupportedLocale = "ro"): LocationLicenseAccess {
  const plan = normalizeLocationPlan(location?.plan);
  const status = normalizeBillingStatus(location?.billingStatus);
  const features = featuresForPlan(plan);
  const trialEndsAt = trialEndsAtFromLocation(location);
  const subscriptionExpiresAt = dateFromFirestoreValue(location?.subscriptionExpiresAt);
  const activeUntil = status === "trialing" ? trialEndsAt : subscriptionExpiresAt;
  const isLifetime = status === "active" && isLifetimeDate(subscriptionExpiresAt);
  const daysRemaining = activeUntil && !isLifetime ? Math.ceil((activeUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;
  const trialExpired = status === "trialing" && Boolean(trialEndsAt) && trialEndsAt!.getTime() < now.getTime();
  const subscriptionExpired = status === "active" && Boolean(subscriptionExpiresAt) && subscriptionExpiresAt!.getTime() < now.getTime();
  const blockedStatus = status === "past_due" || status === "paused" || status === "canceled" || status === "expired";
  const canWrite = !trialExpired && !subscriptionExpired && !blockedStatus;
  const label = planLabel(plan, language);
  const statusLabel = billingStatusLabel(trialExpired || subscriptionExpired ? "expired" : status, language);

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
      : appText(language, "license.readOnlyMessage").replace("{{plan}}", label).replace("{{status}}", statusLabel.toLowerCase()),
    trialEndsAt,
    daysRemaining,
    isLifetime,
  };
}

// Verifică dacă accesul curent include o funcție.
export function hasPlanFeature(access: LocationLicenseAccess, feature: PlanFeature) {
  return planIncludesFeature(access.plan, feature) && access.features.includes(feature);
}

// Normalizează documentele de abonament și de licență din Firestore.
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

// Funcții mici de curățare a numerelor: contor ≥ 0, limită ≥ 0, limită opțională (null = nelimitat).
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
