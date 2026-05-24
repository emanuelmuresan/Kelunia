import type { UserRole } from "@/context/AuthContext";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import type { Booking, BookingForm, FixedSchedule, FixedScheduleDraft, GroupItem, RoomItem } from "@/lib/types/domain";

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
  floorplan: "Plan",
  floorplanItem: "Element plan",
};

export const dayLabels = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
export const shortDayLabels = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
export const defaultLocationName = "Kelunia";
export const defaultFixedSectionTitle = "Programări fixe";
export const defaultListViewTitle = "Listă programări";
export const defaultResourcesSectionTitle = "Spații și grupuri";
export const defaultRoomsLabel = "Săli";
export const defaultGroupsLabel = "Grupuri";
export const offlineReadOnlyMessage = "Ești offline. Poți vedea datele deja încărcate, dar modificările se fac când revine internetul.";

export const defaultRooms: RoomItem[] = [];
export const defaultGroups: GroupItem[] = [];
export const defaultFixedSchedules: FixedSchedule[] = [];
export const demoBookings: Booking[] = [];

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
  notifyOffsets: ["1h"],
  notifyGroupOnThisBooking: false,
  notifyGroupOffsets: ["1h"],
};

export const emptyFixedDraft: FixedScheduleDraft = {
  dayIndex: "",
  group: "",
  room: "",
  startTime: "",
  endTime: "",
  title: "",
};

export const roleLabels: Record<UserRole, string> = {
  manager: "Administrator",
  member: "Colaborator",
  guest: "Oaspete",
};

export function appRoleLabel(profile: { isOwner?: boolean } | null | undefined, currentRole: UserRole) {
  return profile?.isOwner ? "Proprietar" : roleLabels[currentRole];
}

export const memberAccessCodeMaxUses = 10;
export const listPageSize = 50;
export const maxNotificationDelayMs = 2147483647;
