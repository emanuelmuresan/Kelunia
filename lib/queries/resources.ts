// Interogările Firestore pentru resursele unei locații (locații, camere, grupuri, programe fixe), cu limite ca să nu se citească prea mult.
import { collection, limit, orderBy, query, where, type Firestore } from "firebase/firestore";

export const locationsQueryLimit = 200;
export const roomsQueryLimit = 100;
export const groupsQueryLimit = 150;
export const fixedSchedulesQueryLimit = 500;

// Fiecare funcție construiește interogarea; abonarea la rezultate se face în hook-urile din features/.
export function buildLocationsQuery(db: Firestore) {
  return query(collection(db, "locations"), orderBy("name", "asc"), limit(locationsQueryLimit));
}

export function buildRoomsQuery(db: Firestore, locationId: string) {
  return query(collection(db, "rooms"), where("locationId", "==", locationId), limit(roomsQueryLimit));
}

export function buildGroupsQuery(db: Firestore, locationId: string) {
  return query(collection(db, "groups"), where("locationId", "==", locationId), limit(groupsQueryLimit));
}

export function buildFixedSchedulesQuery(db: Firestore, locationId: string) {
  return query(collection(db, "fixedSchedules"), where("locationId", "==", locationId), limit(fixedSchedulesQueryLimit));
}
