/**
 * Isolated Firestore rules test for the "manager cannot update own users/{uid} doc" bug.
 * Needs the Firestore emulator running on 127.0.0.1:8080 with firestore.rules loaded.
 *
 *   "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" -jar \
 *     "C:\Users\Raul\.cache\firebase\emulators\cloud-firestore-emulator-v1.21.0.jar" \
 *     --host 127.0.0.1 --port 8080 --rules firestore.rules
 *
 *   node scripts/test-user-rule.mjs
 */
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";

const UID = "ulvfji9FmdVD3Kun7MEfDb3vrLb2";
const LOCATION = "place_chijhzhrunhbs0ar-8jbkrgjjzw";

const testEnv = await initializeTestEnvironment({
  projectId: "kelunia-890fe",
  firestore: {
    host: "127.0.0.1",
    port: 8080,
    rules: readFileSync("firestore.rules", "utf8"),
  },
});

// Seed the current manager doc exactly as it exists in production.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), "users", UID), {
    allowedRoomIds: [],
    createdAt: Timestamp.fromDate(new Date("2026-05-08T03:13:52Z")),
    displayName: "Emanuel",
    email: "emadiz@hotmail.com",
    groupName: "",
    isOwner: false,
    language: "ro",
    locationId: LOCATION,
    locationName: "Sala Regatului Iuliu Maniu 13",
    locationSetupRequired: false,
    lockOnHide: false,
    notifyDayBefore: true,
    notifyGroupBookings: true,
    notifyWeekBefore: true,
    pinSet: true,
    role: "manager",
    roomAccess: "all",
    uid: UID,
    useBiometrics: false,
    usePin: false,
    verificationEmailSentAt: Timestamp.fromDate(new Date("2026-05-20T05:17:18Z")),
  });
});

const manager = testEnv.authenticatedContext(UID, {
  email: "emadiz@hotmail.com",
  email_verified: true,
  firebase: { sign_in_provider: "password" },
});
const db = manager.firestore();

async function tryWrite(label, payload) {
  process.stdout.write(`\n[${label}]\n`);
  try {
    await assertSucceeds(setDoc(doc(db, "users", UID), payload, { merge: true }));
    console.log("  -> ALLOWED");
  } catch (error) {
    console.log("  -> DENIED");
    console.log("  ", String(error?.message || error).split("\n")[0]);
  }
}

// 1. Minimal name-only change (should pass via validOwnUserUpdate)
await tryWrite("minimal displayName", { displayName: "Test One" });

// 2. OLD payload (identity + settings) — reproduces the 1000-expression denial
await tryWrite("OLD full payload (identity + settings)", {
  uid: UID,
  email: "emadiz@hotmail.com",
  displayName: "Emanuel Muresan",
  groupName: "",
  group: "",
  role: "manager",
  isOwner: false,
  locationId: LOCATION,
  locationName: "Sala Regatului Iuliu Maniu 13",
  accessCodeId: "",
  roomAccess: "all",
  allowedRoomIds: [],
  pendingLicenseId: "",
  pendingLicenseCode: "",
  locationSetupRequired: false,
  usePin: false,
  lockOnHide: false,
  useBiometrics: false,
  notifyGroupBookings: true,
  notifyFixedGroupSchedules: false,
  notifyWeekBefore: true,
  notifyDayBefore: true,
  notifyOffsets: ["1d", "7d"],
  notifyOffsetsDays: [1, 7],
  language: "ro",
});

// 2b. NEW trimmed payload (settings only) — should be ALLOWED
await tryWrite("NEW trimmed payload (settings only)", {
  displayName: "Emanuel Muresan",
  groupName: "",
  group: "",
  usePin: false,
  lockOnHide: false,
  useBiometrics: false,
  notifyGroupBookings: true,
  notifyFixedGroupSchedules: false,
  notifyWeekBefore: true,
  notifyDayBefore: true,
  notifyOffsets: ["1d", "7d"],
  notifyOffsetsDays: [1, 7],
  language: "ro",
});

// 3. Payload minus the fields that get freshly added (accessCodeId / pendingLicense*)
await tryWrite("payload without accessCodeId/pendingLicense*", {
  uid: UID,
  email: "emadiz@hotmail.com",
  displayName: "Emanuel Trei",
  groupName: "",
  group: "",
  role: "manager",
  isOwner: false,
  locationId: LOCATION,
  locationName: "Sala Regatului Iuliu Maniu 13",
  roomAccess: "all",
  allowedRoomIds: [],
  locationSetupRequired: false,
  usePin: false,
  lockOnHide: false,
  useBiometrics: false,
  notifyGroupBookings: true,
  notifyFixedGroupSchedules: false,
  notifyWeekBefore: true,
  notifyDayBefore: true,
  notifyOffsets: ["1d", "7d"],
  notifyOffsetsDays: [1, 7],
  language: "ro",
});

// 4. Just the settings fields validOwnUserUpdate allows
await tryWrite("only validOwnUserUpdate keys", {
  displayName: "Emanuel Patru",
  groupName: "",
  group: "",
  usePin: false,
  lockOnHide: false,
  useBiometrics: false,
  language: "ro",
  notifyGroupBookings: true,
  notifyFixedGroupSchedules: false,
  notifyWeekBefore: true,
  notifyDayBefore: true,
  notifyOffsets: ["1d", "7d"],
  notifyOffsetsDays: [1, 7],
});

await testEnv.cleanup();
console.log("\ndone");
