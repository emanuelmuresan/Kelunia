// Tipurile de date ale aplicației: documentele din Firestore (după normalizare), formularele și stările interfeței.
// Câmpurile marcate cu unknown sunt Timestamp-uri Firestore sau Date, citite defensiv.
import type { AppLanguage, UserRole } from "@/context/AuthContext";
import type { AuditAction, AuditEntityType } from "@/lib/audit";

/** The editable "my settings" draft held on the dashboard and passed to SettingsView. */
export type PersonalDraft = {
  displayName: string;
  groupName: string;
  usePin: boolean;
  lockOnHide: boolean;
  useBiometrics: boolean;
  notifyGroupBookings: boolean;
  notifyFixedGroupSchedules: boolean;
  notifyWeekBefore: boolean;
  notifyDayBefore: boolean;
  notifyOffsets: string[];
  notifyOffsetsDays: number[];
  language: AppLanguage;
};

// Stări de interfață: vederea activă, modul calendarului, filtrarea și sortarea listei, tipul de spațiu, PIN/biometrie, harta.
export type AppView = "calendar" | "fixed" | "list" | "settings";
export type CalendarMode = "month" | "week" | "day" | "year";
export type ListFilter = "future" | "past" | "all";
export type SortDirection = "asc" | "desc";
export type SpaceKind = "room" | "group";
export type PinIntent = "pin" | "biometrics";
export type MapsStatus = "off" | "loading" | "ready" | "error";
export type RoomAccessMode = "all" | "selected";
// Țintele scrierilor (formular, setări, grup, spațiu...), folosite ca să se afișeze mesajul „offline” în fereastra potrivită.
export type WriteTarget = "form" | "settings" | "group" | "space" | "fixed" | "codes" | "location" | "locationSetup" | "password";
// Funcțiile disponibile în planurile de licență.
export type PlanFeature =
  | "calendar"
  | "bookings"
  | "rooms"
  | "groups"
  | "notifications"
  | "recurring"
  | "multiLocationDashboard"
  | "auditLogs";

// Tipurile minime pentru Google Places Autocomplete (adresa locației), fără a depinde de pachetul complet de tipuri.
export interface GooglePlace {
  formatted_address?: string;
  name?: string;
  place_id?: string;
}

export interface GoogleAutocomplete {
  getPlace: () => GooglePlace;
  addListener: (eventName: string, handler: () => void) => { remove: () => void };
}

export interface GooglePlacesWindow extends Window {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          input: HTMLInputElement,
          options: { fields: string[] }
        ) => GoogleAutocomplete;
      };
    };
  };
}

// Locația: nume, adresă, plan, facturare, utilizare, limite și programarea închiderii.
export interface LocationItem {
  id: string;
  name: string;
  ownerEmail: string;
  address: string;
  placeId: string;
  createdAt?: unknown;
  plan?: LocationPlan;
  billingStatus?: BillingStatus;
  subscriptionId?: string;
  subscriptionExpiresAt?: unknown;
  trialEndsAt?: unknown;
  usage?: LocationUsage;
  planLimits?: PlanLimits;
  closureRequestedAt?: unknown;
  closureScheduledFor?: unknown;
}

// Planurile și starea de facturare ale unei locații.
export type LocationPlan = "trial" | "standard" | "pro" | "business";
export type BillingStatus = "trialing" | "active" | "past_due" | "paused" | "canceled" | "expired";

// Contoare de utilizare ale locației (rezervări, camere, grupuri, programe fixe, coduri, membri).
export interface LocationUsage {
  bookingCount: number;
  roomCount: number;
  groupCount: number;
  fixedScheduleCount: number;
  accessCodeCount: number;
  memberCount: number;
}

// Cererile din comunitate (formularul public) și newsletter-ul, gestionate de proprietar.
export type CommunityApplicationStatus = "new" | "reviewed" | "replied" | "approved" | "declined";
export type NewsletterCampaignStatus = "pending" | "sending" | "sent" | "partial" | "failed";

export interface CommunityApplication {
  id: string;
  email: string;
  organizationName: string;
  details: string;
  status: CommunityApplicationStatus;
  source: string;
  createdAt?: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
  reviewedByUid?: string;
  lastReplyAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
  updatedByUid?: string;
}

export interface CommunityApplicationMessage {
  id: string;
  applicationId: string;
  body: string;
  direction: "outbound";
  deliveryStatus: "pending" | "sent" | "failed";
  fromEmail: string;
  fromUid: string;
  toEmail: string;
  createdAt?: unknown;
  sentAt?: unknown;
  failedAt?: unknown;
  resendEmailId?: string;
  errorMessage?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  emailKey: string;
  source: string;
  status: "active" | "inactive";
  unsubscribed: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  body: string;
  status: NewsletterCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt?: unknown;
  completedAt?: unknown;
  createdBy?: string;
  createdByUid?: string;
  recipientEmail?: string;
  errorMessage?: string;
}

// Limitele unui plan; null înseamnă nelimitat.
export interface PlanLimits {
  maxMembers: number | null;
  maxManagers: number;
  maxRooms: number | null;
  maxGroups: number | null;
  maxActiveBookings: number | null;
}

// Numele unui contor de utilizare.
export type LocationCounterName = keyof LocationUsage;

// Abonamentul unei locații la furnizorul de plăți.
export interface LocationSubscription {
  id: string;
  locationId: string;
  locationName: string;
  plan: LocationPlan;
  billingStatus: BillingStatus;
  provider: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  currentPeriodStart: unknown;
  currentPeriodEnd: unknown;
  cancelAtPeriodEnd: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
}

// Starea ferestrelor de editare pentru spații (cameră/grup) și pentru locație.
export interface SpaceEditor {
  kind: SpaceKind;
  id: string | null;
  name: string;
  color?: string;
  activeUntil?: string;
}

export interface LocationEditor {
  id: string | null;
  name: string;
  plan: LocationPlan | "";
  billingStatus: BillingStatus | "";
  durationDays: string;
  // Adresa (doar la o locație nouă) și licența fără expirare.
  address: string;
  lifetime: boolean;
}

// Rezervarea așa cum e citită din Firestore și forma ei din formular, cu opțiunile de notificare.
export interface Booking {
  id: string;
  group: string;
  room: string;
  roomId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  authorEmail: string;
  authorName: string;
  locationId: string;
  locationName: string;
  updatedBy?: string;
  notifyOnThisBooking?: boolean;
  notifyOffsets?: string[];
  notifyForUid?: string;
  notifyGroupOnThisBooking?: boolean;
  notifyGroupOffsets?: string[];
  notifyGroupAudience?: "all" | "selected";
  notifyGroupRecipients?: string[];
  notifyGroupNowAt?: unknown;
  notifyGroupNowBy?: string;
  createdAt?: unknown;
}

export interface BookingForm {
  group: string;
  room: string;
  roomId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  notifyOnThisBooking: boolean;
  notifyOffsets: string[];
  notifyGroupOnThisBooking: boolean;
  notifyGroupOffsets: string[];
  notifyGroupAudience: "all" | "selected";
  notifyGroupRecipients: string[];
  notifyNowScope: "group" | "location";
}

// Camerele și grupurile; activeUntil este data până la care pot fi alese.
export interface RoomItem {
  id: string;
  name: string;
  activeUntil?: string;
}

export interface GroupItem {
  id: string;
  name: string;
  color?: string;
  activeUntil?: string;
}

// Programul fix săptămânal și ciorna lui din formular (dayIndex: 0 = luni).
export interface FixedSchedule {
  id: string;
  dayIndex: number;
  group: string;
  room: string;
  startTime: string;
  endTime: string;
  title: string;
}

export interface FixedScheduleDraft {
  dayIndex: number | "";
  group: string;
  room: string;
  startTime: string;
  endTime: string;
  title: string;
}

// Utilizatorii gestionați într-o locație și codurile de acces/invitațiile ei.
export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  groupName: string;
  role: UserRole;
  isOwner: boolean;
  locationId: string;
  locationName: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
}

export interface LocationCode {
  id: string;
  code: string;
  role: UserRole;
  groupName: string;
  locationId: string;
  locationName: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdBy?: string;
  createdAt?: unknown;
  expiresAt?: unknown;
  lastInviteEmailSentAt?: unknown;
  lastInviteEmailSentBy?: string;
  lastInviteEmailSentTo?: string;
}

// Codurile de licență create de proprietar pentru conturile noi de manager.
export interface LicenseCodeItem {
  id: string;
  code: string;
  plan: LocationPlan;
  billingStatus: BillingStatus;
  intendedLocationName: string;
  intendedAddress: string;
  active: boolean;
  claimed: boolean;
  used: boolean;
  claimedBy?: string;
  usedBy?: string;
  locationId: string;
  locationName: string;
  trialEndsAt?: unknown;
  subscriptionExpiresAt?: unknown;
  createdAt?: unknown;
}

// O înregistrare din istoricul de modificări (audit).
export interface AuditLogItem {
  id: string;
  locationId: string;
  locationName: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorName: string;
  actorEmail: string;
  createdAt: unknown;
}
