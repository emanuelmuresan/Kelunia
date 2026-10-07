// Căi Firestore către colecțiile imbricate ale unei locații (locations/{id}/...), într-un singur loc.
// Colecțiile imbricate permise sub o locație.
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

// Referința către o colecție imbricată a locației.
export function locationScopedCollection(
  db: Firestore,
  locationId: string,
  collectionName: LocationScopedCollection
): CollectionReference {
  return collection(db, "locations", locationId, collectionName);
}

// Referința către un document dintr-o colecție imbricată a locației.
export function locationScopedDoc(
  db: Firestore,
  locationId: string,
  collectionName: LocationScopedCollection,
  documentId: string
): DocumentReference {
  return doc(db, "locations", locationId, collectionName, documentId);
}

// Documentul cu setările calendarului locației.
export function locationSettingsDoc(db: Firestore, locationId: string): DocumentReference {
  return doc(db, "locations", locationId, "settings", "calendar");
}
