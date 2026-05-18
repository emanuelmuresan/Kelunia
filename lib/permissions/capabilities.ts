import type { UserRole } from "@/context/AuthContext";

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

export interface PermissionContext {
  signedIn: boolean;
  role: UserRole;
  isOwner: boolean;
  locationMatches: boolean;
  locationWritable: boolean;
}

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
