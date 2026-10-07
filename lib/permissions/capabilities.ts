// Permisiunile din interfață: ce are voie să facă un utilizator în locația curentă, derivat din rol.
// Aceasta ajută doar interfața să ascundă butoane; securitatea reală este în firestore.rules și în funcțiile cloud.
import type { UserRole } from "@/context/AuthContext";

// Acțiunile pentru care se verifică permisiunea.
export type Capability =
  | "booking.create"
  | "booking.update"
  | "booking.delete"
  | "location.manage"
  | "spaces.manage"
  | "fixedSchedules.manage"
  | "accessCodes.manage"
  | "settings.manage"
  | "audit.read";

// Contextul verificării: conectat, rol, proprietar, locația potrivită și locație activă pentru scriere (licență).
export interface PermissionContext {
  signedIn: boolean;
  role: UserRole;
  isOwner: boolean;
  locationMatches: boolean;
  locationWritable: boolean;
}

// Regula: citirea auditului este pentru proprietar și manageri; rezervările pentru manageri și membri; restul pentru manageri.
// Proprietarul platformei nu modifică datele unei locații (doar le vede), iar o licență expirată blochează scrierea.
export function can(capability: Capability, context: PermissionContext) {
  if (!context.signedIn) {
    return false;
  }

  if (capability === "audit.read") {
    return context.isOwner || isManager(context);
  }

  if (!context.locationMatches || !context.locationWritable || context.isOwner) {
    return false;
  }

  if (capability === "booking.create" || capability === "booking.update" || capability === "booking.delete") {
    return isManager(context) || isMember(context);
  }

  return isManager(context);
}

function isManager(context: PermissionContext) {
  return context.role === "manager";
}

function isMember(context: PermissionContext) {
  return context.role === "member";
}
