// Interogările Firestore pentru utilizatorii și codurile de acces ale unei locații, cu limite.
import { collection, limit, orderBy, query, where, type Firestore } from "firebase/firestore";

export const locationUsersQueryLimit = 300;
export const accessCodesQueryLimit = 200;

// Toți utilizatorii locației, ordonați după email.
export function buildLocationUsersQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "users"),
    where("locationId", "==", locationId),
    orderBy("email", "asc"),
    limit(locationUsersQueryLimit)
  );
}

// Managerii locației (maximum 3), folosiți pentru verificarea limitei de manageri.
export function buildLocationManagersQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "users"),
    where("locationId", "==", locationId),
    where("role", "==", "manager"),
    limit(3)
  );
}

// Variantă pentru conturile vechi care aveau rolul „superadmin” înainte de redenumirea în „manager”.
export function buildLegacyLocationSuperAdminsQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "users"),
    where("locationId", "==", locationId),
    where("role", "==", "superadmin"),
    limit(3)
  );
}

// Codurile de acces ale locației, grupate după rol.
export function buildLocationAccessCodesQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "accessCodes"),
    where("locationId", "==", locationId),
    orderBy("role", "asc"),
    limit(accessCodesQueryLimit)
  );
}
