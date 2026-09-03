/**
 * Firestore rules regression tests for the users/{uid} update paths.
 *
 * Needs the Firestore emulator on 127.0.0.1:8080 with firestore.rules loaded:
 *   "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" -jar \
 *     "C:\Users\Raul\.cache\firebase\emulators\cloud-firestore-emulator-v1.21.0.jar" \
 *     --host 127.0.0.1 --port 8080 --rules firestore.rules
 *
 *   npm run test:rules
 */
import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

const EMU_PORT = Number(process.env.RULES_EMU_PORT || 8080);
const MANAGER = "ulvfji9FmdVD3Kun7MEfDb3vrLb2";
const MANAGER2 = "otherManagerUid00000000000001";
const OWNER = "ownerUid000000000000000000001";
const LOCATION = "place_chijhzhrunhbs0ar-8jbkrgjjzw";

const testEnv = await initializeTestEnvironment({
  projectId: "kelunia-890fe",
  firestore: { host: "127.0.0.1", port: EMU_PORT, rules: readFileSync("firestore.rules", "utf8") },
});

const managerDoc = {
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
  role: "manager",
  roomAccess: "all",
  uid: MANAGER,
  useBiometrics: false,
  usePin: false,
  verificationEmailSentAt: Timestamp.fromDate(new Date("2026-05-20T05:17:18Z")),
};

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", MANAGER), managerDoc);
    await setDoc(doc(db, "users", MANAGER2), { ...managerDoc, uid: MANAGER2, email: "manager2@example.com", displayName: "Manager Two" });
    await setDoc(doc(db, "users", OWNER), {
      ...managerDoc, uid: OWNER, email: "emanuelmuresan@gmail.com", displayName: "Owner",
      isOwner: true, locationId: "", locationName: "Kelunia",
    });
    await setDoc(doc(db, "users", "userWithPin"), { ...managerDoc, uid: "userWithPin", email: "pin@example.com", pinSet: true });
    await setDoc(doc(db, "users", "userWithPin", "private", "security"), { algo: "scrypt", salt: "x", hash: "y" });
  });
}

function ctxFor(uid, email) {
  return testEnv.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: "password" } });
}
const mdb = ctxFor(MANAGER, "emadiz@hotmail.com").firestore();
const m2db = ctxFor(MANAGER2, "manager2@example.com").firestore();
const odb = ctxFor(OWNER, "emanuelmuresan@gmail.com").firestore();
const strangerDb = ctxFor("strangerUid0000000000000000001", "stranger@example.com").firestore();

let pass = 0, fail = 0;
async function check(label, want, targetDb, targetUid, payload) {
  await seed(); // every test starts from the pristine docs
  let got, detail = "";
  try {
    await setDoc(doc(targetDb, "users", targetUid), payload, { merge: true });
    got = "ALLOWED";
  } catch (error) {
    got = "DENIED";
    detail = String(error?.message || error).replace(/\s+/g, " ").slice(0, 90);
  }
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label} -> ${got}${ok ? "" : ` (wanted ${want}) ${detail}`}`);
}

const TRIMMED = {
  displayName: "Renamed", groupName: "", group: "",
  usePin: false, lockOnHide: false, useBiometrics: false,
  notifyGroupBookings: true, notifyFixedGroupSchedules: false,
  notifyWeekBefore: true, notifyDayBefore: true,
  notifyOffsets: ["1d", "7d"], notifyOffsetsDays: [1, 7], language: "ro",
};
const OLD_FULL = {
  uid: MANAGER, email: "emadiz@hotmail.com", displayName: "Renamed", groupName: "", group: "",
  role: "manager", isOwner: false, locationId: LOCATION, locationName: "Sala Regatului Iuliu Maniu 13",
  accessCodeId: "", roomAccess: "all", allowedRoomIds: [], pendingLicenseId: "", pendingLicenseCode: "",
  locationSetupRequired: false, usePin: false, lockOnHide: false, useBiometrics: false,
  notifyGroupBookings: true, notifyFixedGroupSchedules: false, notifyWeekBefore: true, notifyDayBefore: true,
  notifyOffsets: ["1d", "7d"], notifyOffsetsDays: [1, 7], language: "ro",
};

console.log("\nusers/{uid} update rules:");

// Real app flows — must pass
await check("savePersonalSettings trimmed payload (manager)", "ALLOWED", mdb, MANAGER, TRIMMED);
await check("savePersonalSettings trimmed payload (owner)", "ALLOWED", odb, OWNER, { ...TRIMMED, groupName: "", group: "" });
await check("updateManagedUserRole (other manager, small payload)", "ALLOWED", m2db, MANAGER,
  { role: "member", groupName: "Grup", roomAccess: "all", allowedRoomIds: [] });
await check("full 25-key merge (app no longer sends this, but should still pass)", "ALLOWED", mdb, MANAGER, OLD_FULL);

// Offset shape still enforced
await check("garbage notifyOffsets ['abc']", "DENIED", mdb, MANAGER, { ...TRIMMED, notifyOffsets: ["abc"] });
await check("garbage notifyOffsets ['5x']", "DENIED", mdb, MANAGER, { ...TRIMMED, notifyOffsets: ["5x"] });
await check("garbage notifyOffsetsDays [99]", "DENIED", mdb, MANAGER, { ...TRIMMED, notifyOffsetsDays: [99] });
await check("garbage notifyOffsetsDays ['x']", "DENIED", mdb, MANAGER, { ...TRIMMED, notifyOffsetsDays: ["x"] });
await check("valid mixed offsets ['30m','2h','7d']", "ALLOWED", mdb, MANAGER,
  { ...TRIMMED, notifyOffsets: ["30m", "2h", "7d"], notifyOffsetsDays: [7] });
await check("too many offsets (6)", "DENIED", mdb, MANAGER,
  { ...TRIMMED, notifyOffsets: ["1m", "2m", "3m", "4m", "5m", "6m"] });

// Identity/privilege still protected
await check("manager changes own role -> member", "DENIED", mdb, MANAGER, { ...TRIMMED, role: "member" });
await check("manager sets own isOwner true", "DENIED", mdb, MANAGER, { ...TRIMMED, isOwner: true });
await check("manager changes own locationId", "DENIED", mdb, MANAGER, { ...TRIMMED, locationId: "elsewhere" });
await check("manager promotes another user to isOwner", "DENIED", m2db, MANAGER, { isOwner: true });
await check("stranger (no doc) writes someone's user doc", "DENIED", strangerDb, MANAGER, { displayName: "hax" });

// PIN: pinSet / pinResetRequired are Admin-only; users/{uid}/private is sealed
await check("manager spoofs pinSet: true", "DENIED", mdb, MANAGER, { ...TRIMMED, pinSet: true });
await check("manager writes pinResetRequired", "DENIED", mdb, MANAGER, { ...TRIMMED, pinResetRequired: true });
await check("other manager flips this user's pinSet", "DENIED", m2db, MANAGER, { pinSet: true });

// A settings save on a doc that already has pinSet:true (written by setPin) must still pass
await seed();
{
  const pinCtx = testEnv.authenticatedContext("userWithPin", { email: "pin@example.com", email_verified: true, firebase: { sign_in_provider: "password" } });
  let got;
  try { await setDoc(doc(pinCtx.firestore(), "users", "userWithPin"), TRIMMED, { merge: true }); got = "ALLOWED"; }
  catch { got = "DENIED"; }
  const ok = got === "ALLOWED"; ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} settings save when pinSet already true -> ${got}${ok ? "" : " (wanted ALLOWED)"}`);
}

// The private PIN subcollection must be unreadable by the account itself
await seed();
{
  const ownerReadCtx = testEnv.authenticatedContext("userWithPin", { email: "pin@example.com", email_verified: true, firebase: { sign_in_provider: "password" } });
  let got;
  try { await getDoc(doc(ownerReadCtx.firestore(), "users", "userWithPin", "private", "security")); got = "ALLOWED"; }
  catch { got = "DENIED"; }
  const ok = got === "DENIED"; ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} account reads its own users/{uid}/private/security -> ${got}${ok ? "" : " (wanted DENIED)"}`);
}

await testEnv.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
