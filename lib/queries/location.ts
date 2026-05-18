import { collection, limit, orderBy, query, where, type Firestore } from "firebase/firestore";

export const locationUsersQueryLimit = 300;
export const accessCodesQueryLimit = 200;

export function buildLocationUsersQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "users"),
    where("locationId", "==", locationId),
    orderBy("email", "asc"),
    limit(locationUsersQueryLimit)
  );
}

export function buildLocationManagersQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "users"),
    where("locationId", "==", locationId),
    where("role", "==", "manager"),
    limit(3)
  );
}

export function buildLegacyLocationSuperAdminsQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "users"),
    where("locationId", "==", locationId),
    where("role", "==", "superadmin"),
    limit(3)
  );
}

export function buildLocationAccessCodesQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "accessCodes"),
    where("locationId", "==", locationId),
    orderBy("role", "asc"),
    limit(accessCodesQueryLimit)
  );
}
