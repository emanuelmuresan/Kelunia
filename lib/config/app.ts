// Configurări și texte implicite ale aplicației: etichete pentru audit, zilele săptămânii, numele implicite ale paginilor,
// formularele goale și limitele (utilizări de cod, expirare, mărime de pagină, perioada de grație la închiderea unei locații).
import type { UserRole } from "@/context/AuthContext";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import type { Booking, BookingForm, FixedSchedule, FixedScheduleDraft, GroupItem, RoomItem } from "@/lib/types/domain";

// Etichetele afișate în istoricul de modificări (audit).
export const auditActionLabels: Record<AuditAction, string> = {
  create: "Creat",
  update: "Modificat",
  delete: "Șters",
};

export const auditEntityLabels: Record<AuditEntityType, string> = {
  booking: "Programare",
  fixedSchedule: "Programare fixă",
  room: "Sală",
  group: "Grup",
  accessCode: "Cod acces",
  user: "Utilizator",
  location: "Locație",
  license: "Licență",
  settings: "Setări",
};

// Zilele săptămânii, în română, începând cu luni.
export const dayLabels = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
export const shortDayLabels = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
// Numele implicite ale locației și ale paginilor; fiecare locație le poate redenumi din Setări.
export const defaultLocationName = "Kelunia";
export const defaultFixedSectionTitle = "Programări fixe";
export const defaultListViewTitle = "Listă programări";
export const defaultResourcesSectionTitle = "Spații și grupuri";
export const defaultRoomsLabel = "Săli";
export const defaultGroupsLabel = "Grupuri";

// Liste goale folosite ca valori inițiale.
export const defaultRooms: RoomItem[] = [];
export const defaultGroups: GroupItem[] = [];
export const defaultFixedSchedules: FixedSchedule[] = [];
export const demoBookings: Booking[] = [];

// Starea inițială a formularului de rezervare, cu notificări implicite la 15 minute.
export const emptyForm: BookingForm = {
  group: "",
  room: "",
  roomId: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  reason: "",
  notifyOnThisBooking: false,
  notifyOffsets: ["15m"],
  notifyGroupOnThisBooking: false,
  notifyGroupOffsets: ["15m"],
  notifyGroupAudience: "all",
  notifyGroupRecipients: [],
  notifyNowScope: "group",
};

// Starea inițială a formularului de program fix.
export const emptyFixedDraft: FixedScheduleDraft = {
  dayIndex: "",
  group: "",
  room: "",
  startTime: "",
  endTime: "",
  title: "",
};

// Etichetele rolurilor în română (pentru interfețele care nu trec prin catalogul de limbi).
export const roleLabels: Record<UserRole, string> = {
  manager: "Administrator",
  member: "Colaborator",
  guest: "Oaspete",
};

// Eticheta rolului în limba utilizatorului; proprietarul are o etichetă proprie.
export function appRoleLabel(profile: { isOwner?: boolean } | null | undefined, currentRole: UserRole, locale: SupportedLocale = "ro") {
  if (profile?.isOwner) {
    return appText(locale, "role.owner");
  }

  if (currentRole === "manager") {
    return appText(locale, "role.administrator");
  }

  if (currentRole === "member") {
    return appText(locale, "role.collaborator");
  }

  return appText(locale, "role.guest");
}

// Limitele implicite: utilizări pentru un cod de membru, zile până la expirarea unui cod, rezervări pe pagină.
export const memberAccessCodeMaxUses = 10;
export const accessCodeExpiryDays = 7;
export const listPageSize = 50;
// Cea mai mare întârziere acceptată de setTimeout (aproximativ 24,8 zile).
export const maxNotificationDelayMs = 2147483647;

// Keep in step with closureGraceDays in functions/src/location-closure.ts.
export const locationClosureGraceDays = 30;
