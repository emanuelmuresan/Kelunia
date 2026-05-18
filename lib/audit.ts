import { addDoc, collection, Timestamp, type Firestore } from "firebase/firestore";

export type AuditEntityType =
  | "booking"
  | "fixedSchedule"
  | "room"
  | "group"
  | "accessCode"
  | "user"
  | "location"
  | "license"
  | "settings"
  | "floorplan"
  | "floorplanItem";

export type AuditAction = "create" | "update" | "delete";

interface AuditActor {
  uid: string;
  email: string;
  name: string;
}

interface AuditLogInput {
  locationId: string;
  locationName: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actor: AuditActor;
  before?: unknown;
  after?: unknown;
}

function cleanAuditValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Timestamp) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cleanAuditValue);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => typeof entryValue !== "function" && entryValue !== undefined)
      .map(([key, entryValue]) => [key, key === "pinHash" ? "[redacted]" : cleanAuditValue(entryValue)])
  );
}

export async function writeAuditLog(db: Firestore, input: AuditLogInput) {
  await addDoc(collection(db, "auditLogs"), {
    locationId: input.locationId,
    locationName: input.locationName,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorUid: input.actor.uid,
    actorEmail: input.actor.email,
    actorName: input.actor.name,
    before: cleanAuditValue(input.before ?? null),
    after: cleanAuditValue(input.after ?? null),
    createdAt: Timestamp.now(),
  });
}
