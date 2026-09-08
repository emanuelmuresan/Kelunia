/**
 * Seeds the Firebase emulators (Auth + Firestore) with the minimum a signed-in
 * member needs to reach the dashboard: one verified user, their profile, an
 * active-license location, one group and one room.
 *
 * Run inside `firebase emulators:exec` so FIRESTORE_EMULATOR_HOST /
 * FIREBASE_AUTH_EMULATOR_HOST are set. Safe to run repeatedly.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || "demo-kelunia";

initializeApp({ projectId });

export const E2E_USER = {
  uid: "e2e-member-uid-000000000001",
  email: "member@e2e.test",
  password: "Test123456",
  displayName: "Membru E2E",
};

const LOCATION_ID = "loc-e2e";
const LOCATION_NAME = "Sala E2E";
const GROUP_NAME = "Grupa E2E";

async function seedAuth() {
  const auth = getAuth();

  try {
    await auth.deleteUser(E2E_USER.uid);
  } catch {
    // first run — nothing to delete
  }

  await auth.createUser({
    uid: E2E_USER.uid,
    email: E2E_USER.email,
    password: E2E_USER.password,
    emailVerified: true,
    displayName: E2E_USER.displayName,
  });
}

async function seedFirestore() {
  const db = getFirestore();
  const farFuture = Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const now = Timestamp.now();

  await db.doc(`users/${E2E_USER.uid}`).set({
    uid: E2E_USER.uid,
    email: E2E_USER.email,
    displayName: E2E_USER.displayName,
    groupName: GROUP_NAME,
    group: GROUP_NAME,
    role: "member",
    isOwner: false,
    locationId: LOCATION_ID,
    locationName: LOCATION_NAME,
    locationSetupRequired: false,
    accessCodeId: "",
    usePin: false,
    lockOnHide: false,
    useBiometrics: false,
    roomAccess: "all",
    allowedRoomIds: [],
    language: "ro",
    notifyGroupBookings: false,
    notifyFixedGroupSchedules: false,
    notifyWeekBefore: true,
    notifyDayBefore: true,
    notifyOffsets: ["1d", "7d"],
    notifyOffsetsDays: [1, 7],
  });

  await db.doc(`locations/${LOCATION_ID}`).set({
    name: LOCATION_NAME,
    locationName: LOCATION_NAME,
    officialAddress: "Str. Testului 1",
    address: "Str. Testului 1",
    ownerEmail: "owner@e2e.test",
    placeId: "e2e-place",
    plan: "pro",
    billingStatus: "active",
    subscriptionExpiresAt: farFuture,
    trialEndsAt: null,
    updatedAt: now,
    updatedBy: "seed@e2e.test",
    usage: { bookingCount: 0, roomCount: 1, groupCount: 1, fixedScheduleCount: 0, accessCodeCount: 0 },
  });

  await db.doc(`groups/e2e-group-1`).set({
    name: GROUP_NAME,
    locationId: LOCATION_ID,
    locationName: LOCATION_NAME,
    color: "#0f766e",
    createdAt: now,
    createdBy: "seed@e2e.test",
  });

  await db.doc(`rooms/e2e-room-1`).set({
    name: "Sala 1",
    locationId: LOCATION_ID,
    locationName: LOCATION_NAME,
    createdAt: now,
    createdBy: "seed@e2e.test",
  });
}

await seedAuth();
await seedFirestore();
console.info(`Seed complet pentru proiectul ${projectId}.`);
