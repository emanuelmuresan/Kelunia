import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";

type LocationScopedCollection =
  | "events"
  | "rooms"
  | "groups"
  | "fixedSchedules"
  | "accessCodes"
  | "auditLogs";

export function locationScopedCollection(
  db: Firestore,
  locationId: string,
  collectionName: LocationScopedCollection
): CollectionReference {
  return collection(db, "locations", locationId, collectionName);
}

export function locationScopedDoc(
  db: Firestore,
  locationId: string,
  collectionName: LocationScopedCollection,
  documentId: string
): DocumentReference {
  return doc(db, "locations", locationId, collectionName, documentId);
}

export function locationSettingsDoc(db: Firestore, locationId: string): DocumentReference {
  return doc(db, "locations", locationId, "settings", "calendar");
}
