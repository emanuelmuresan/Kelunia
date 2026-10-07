/**
 * Full pass over every Firestore write the CLIENT performs (not the Cloud
 * Functions, which use Admin SDK and bypass rules). Each case seeds a doc shaped
 * exactly like the app/functions write it, then runs the exact client operation
 * and checks it is ALLOWED for the authorized role and DENIED otherwise.
 *
 * Needs the emulator on 127.0.0.1:8080 with firestore.rules loaded.
 *   node scripts/test-rules-full.mjs
 */
import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, collection, increment, runTransaction, Timestamp } from "firebase/firestore";

const LOC = "place_loc1";
const MGR = "managerUid00000000000000000001";
const MGR2 = "managerUid00000000000000000002"; // different location
const MEMBER = "memberUid0000000000000000000001";
const OWNER = "ownerUid00000000000000000000001";
const OWNER_EMAIL = "emanuelmuresan@gmail.com";

const te = await initializeTestEnvironment({
  projectId: "kelunia-890fe",
  firestore: { host: "127.0.0.1", port: Number(process.env.RULES_EMU_PORT || 8080), rules: readFileSync("firestore.rules", "utf8") },
});

const ts = () => Timestamp.now();
const softDelete = () => ({ deleted: true, deletedAt: ts(), deletedBy: "m@x.com", deletedByUid: MGR, updatedBy: "m@x.com", updatedAt: ts() });

const baseUser = (uid, over = {}) => ({
  uid, email: `${uid}@x.com`, displayName: "U", group: "", groupName: "", isOwner: false, language: "ro",
  locationId: LOC, locationName: "L", locationSetupRequired: false, lockOnHide: false, role: "manager",
  roomAccess: "all", allowedRoomIds: [], useBiometrics: false, usePin: false, ...over,
});
const locationDoc = (over = {}) => ({
  name: "L", officialAddress: "Str 1", ownerEmail: "m@x.com", placeId: "P1", plan: "pro",
  subscriptionExpiresAt: null, trialEndsAt: null, updatedAt: ts(), updatedBy: "m@x.com",
  usage: { bookingCount: 5, roomCount: 2, groupCount: 1, fixedScheduleCount: 0, accessCodeCount: 1 }, ...over,
});
const roomDoc = (over = {}) => ({
  name: "Sala 1", locationId: LOC, locationName: "L", createdBy: "m@x.com", createdAt: ts(),
  updatedBy: "m@x.com", updatedAt: ts(), deleted: false, ...over,
});
const groupDoc = (over = {}) => ({ ...roomDoc(), color: "#3366ff", ...over });
const fixedDoc = (over = {}) => ({
  dayIndex: 1, group: "G", room: "R", startTime: "10:00", endTime: "12:00", title: "T",
  locationId: LOC, locationName: "L", createdAt: ts(), updatedBy: "m@x.com", updatedAt: ts(), deleted: false, ...over,
});
const accessCodeDoc = (over = {}) => ({
  code: "CODE1", role: "member", groupName: "G", roomAccess: "all", allowedRoomIds: [],
  locationId: LOC, locationName: "L", maxUses: 10, usedCount: 0, active: true,
  createdBy: "m@x.com", createdAt: ts(), deleted: false, ...over,
});
const settingsDoc = (over = {}) => ({
  fixedSectionTitle: "Programe", fixedPageEnabled: true, listViewTitle: "Lista",
  resourcesSectionTitle: "Resurse", roomsLabel: "Sali", groupsLabel: "Grupuri",
  locationId: LOC, locationName: "L", updatedBy: "m@x.com", updatedAt: ts(), ...over,
});

async function seedAll() {
  await te.withSecurityRulesDisabled(async (c) => {
    const d = c.firestore();
    await setDoc(doc(d, "users", MGR), baseUser(MGR, { email: "m@x.com" }));
    await setDoc(doc(d, "users", MGR2), baseUser(MGR2, { email: "m2@x.com", locationId: "place_other" }));
    await setDoc(doc(d, "users", MEMBER), baseUser(MEMBER, { email: "mem@x.com", role: "member", groupName: "G" }));
    await setDoc(doc(d, "users", OWNER), baseUser(OWNER, { email: OWNER_EMAIL, isOwner: true, locationId: "" }));
    await setDoc(doc(d, "locations", LOC), locationDoc());
    await setDoc(doc(d, "rooms", "room1"), roomDoc());
    await setDoc(doc(d, "groups", "group1"), groupDoc());
    await setDoc(doc(d, "fixedSchedules", "fx1"), fixedDoc());
    await setDoc(doc(d, "accessCodes", "CODE1"), accessCodeDoc());
    await setDoc(doc(d, "settings", `calendar_${LOC}`), settingsDoc());
  });
}

const dbMgr = () => te.authenticatedContext(MGR, { email: "m@x.com", email_verified: true, firebase: { sign_in_provider: "password" } }).firestore();
const dbMgr2 = () => te.authenticatedContext(MGR2, { email: "m2@x.com", email_verified: true, firebase: { sign_in_provider: "password" } }).firestore();
const dbMember = () => te.authenticatedContext(MEMBER, { email: "mem@x.com", email_verified: true, firebase: { sign_in_provider: "password" } }).firestore();
const dbOwner = () => te.authenticatedContext(OWNER, { email: OWNER_EMAIL, email_verified: true, firebase: { sign_in_provider: "password" } }).firestore();
const dbUnverified = () => te.authenticatedContext(MGR, { email: "m@x.com", email_verified: false, firebase: { sign_in_provider: "password" } }).firestore();
const NEWUSER = "newUserUid00000000000000001";
const dbNewUser = () => te.authenticatedContext(NEWUSER, { email: "new@x.com", email_verified: false, firebase: { sign_in_provider: "password" } }).firestore();

let pass = 0, fail = 0;
async function chk(label, want, fn) {
  await seedAll();
  let got, detail = "";
  try { await fn(); got = "ALLOW"; }
  catch (e) { got = "DENY"; detail = String(e?.message || e).replace(/\s+/g, " ").replace(/^.*PERMISSION_DENIED:?/, "").slice(0, 110); }
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label} -> ${got}${ok ? "" : ` (want ${want})${detail ? "  " + detail : ""}`}`);
}

console.log("\n--- rooms / groups (manager owns location) ---");
await chk("room: edit name (updateDoc)", "ALLOW", () => updateDoc(doc(dbMgr(), "rooms", "room1"), { name: "Sala X", locationId: LOC, locationName: "L", updatedBy: "m@x.com", updatedAt: ts() }));
await chk("room: soft-delete (updateDoc softDeletePayload)", "ALLOW", () => updateDoc(doc(dbMgr(), "rooms", "room1"), softDelete()));
await chk("room: undo soft-delete (restore)", "ALLOW", async () => { await updateDoc(doc(dbMgr(), "rooms", "room1"), softDelete()); await updateDoc(doc(dbMgr(), "rooms", "room1"), { deleted: false, deletedAt: null, deletedBy: "", deletedByUid: "", updatedBy: "m@x.com", updatedAt: ts() }); });
await chk("room: create (addDoc)", "ALLOW", () => addDoc(collection(dbMgr(), "rooms"), roomDoc({ name: "Noua" })));
await chk("group: edit name+color (updateDoc)", "ALLOW", () => updateDoc(doc(dbMgr(), "groups", "group1"), { name: "Gr X", color: "#112233", locationId: LOC, locationName: "L", updatedBy: "m@x.com", updatedAt: ts() }));
await chk("group: soft-delete (updateDoc softDeletePayload)", "ALLOW", () => updateDoc(doc(dbMgr(), "groups", "group1"), softDelete()));
await chk("group: undo soft-delete (restore)", "ALLOW", async () => { await updateDoc(doc(dbMgr(), "groups", "group1"), softDelete()); await updateDoc(doc(dbMgr(), "groups", "group1"), { deleted: false, deletedAt: null, deletedBy: "", deletedByUid: "", updatedBy: "m@x.com", updatedAt: ts() }); });
await chk("group: set temporary activeUntil (valid date key)", "ALLOW", () => updateDoc(doc(dbMgr(), "groups", "group1"), { name: "Gr T", color: "#112233", activeUntil: "2026-12-31", locationId: LOC, locationName: "L", updatedBy: "m@x.com", updatedAt: ts() }));
await chk("room: create temporary (activeUntil)", "ALLOW", () => addDoc(collection(dbMgr(), "rooms"), roomDoc({ name: "Temp", activeUntil: "2026-12-31" })));
await chk("group: malformed activeUntil denied", "DENY", () => updateDoc(doc(dbMgr(), "groups", "group1"), { name: "Gr T", color: "#112233", activeUntil: "31/12/2026", locationId: LOC, locationName: "L", updatedBy: "m@x.com", updatedAt: ts() }));
await chk("group: non-string activeUntil denied", "DENY", () => updateDoc(doc(dbMgr(), "groups", "group1"), { name: "Gr T", color: "#112233", activeUntil: 20261231, locationId: LOC, locationName: "L", updatedBy: "m@x.com", updatedAt: ts() }));
await chk("room: manager of OTHER location cannot edit", "DENY", () => updateDoc(doc(dbMgr2(), "rooms", "room1"), { name: "Hax", locationId: LOC, locationName: "L", updatedBy: "x", updatedAt: ts() }));
await chk("room: member cannot soft-delete", "DENY", () => updateDoc(doc(dbMember(), "rooms", "room1"), softDelete()));

console.log("\n--- fixedSchedules ---");
await chk("fixed: edit (updateDoc)", "ALLOW", () => updateDoc(doc(dbMgr(), "fixedSchedules", "fx1"), { dayIndex: 2, group: "G", room: "R", startTime: "09:00", endTime: "11:00", title: "T2", locationId: LOC, locationName: "L", updatedBy: "m@x.com", updatedAt: ts() }));
await chk("fixed: soft-delete (updateDoc softDeletePayload)", "ALLOW", () => updateDoc(doc(dbMgr(), "fixedSchedules", "fx1"), softDelete()));
await chk("fixed: undo soft-delete (restore)", "ALLOW", async () => { await updateDoc(doc(dbMgr(), "fixedSchedules", "fx1"), softDelete()); await updateDoc(doc(dbMgr(), "fixedSchedules", "fx1"), { deleted: false, deletedAt: null, deletedBy: "", deletedByUid: "", updatedBy: "m@x.com", updatedAt: ts() }); });
await chk("fixed: create (addDoc)", "ALLOW", () => addDoc(collection(dbMgr(), "fixedSchedules"), fixedDoc({ title: "New" })));

console.log("\n--- locations ---");
await chk("location: usage counter increment (manager, updateDoc)", "ALLOW", () => updateDoc(doc(dbMgr(), "locations", LOC), { "usage.bookingCount": increment(-1), updatedAt: ts() }));
await chk("location: owner license update (plan+billingStatus)", "ALLOW", () => updateDoc(doc(dbOwner(), "locations", LOC), { plan: "pro", billingStatus: "active", updatedBy: OWNER_EMAIL, updatedAt: ts() }));
await chk("location: owner full edit (name+address)", "ALLOW", () => updateDoc(doc(dbOwner(), "locations", LOC), { name: "L2", officialAddress: "Str 2", updatedBy: OWNER_EMAIL, updatedAt: ts() }));
await chk("location: manager cannot change plan", "DENY", () => updateDoc(doc(dbMgr(), "locations", LOC), { plan: "trial", updatedAt: ts() }));

console.log("\n--- settings (calendar_<loc>) ---");
await chk("settings: manager update (setDoc)", "ALLOW", () => setDoc(doc(dbMgr(), "settings", `calendar_${LOC}`), settingsDoc({ fixedSectionTitle: "Nou" })));
await chk("settings: member cannot update", "DENY", () => setDoc(doc(dbMember(), "settings", `calendar_${LOC}`), settingsDoc({ fixedSectionTitle: "Hax" })));
await chk("settings: member reads own-location settings", "ALLOW", () => getDoc(doc(dbMember(), "settings", `calendar_${LOC}`)));
await chk("settings: member reads own-location settings when doc is absent", "ALLOW", async () => {
  await te.withSecurityRulesDisabled((c) => deleteDoc(doc(c.firestore(), "settings", `calendar_${LOC}`)));
  await getDoc(doc(dbMember(), "settings", `calendar_${LOC}`));
});
await chk("settings: member cannot read another location's settings", "DENY", () => getDoc(doc(dbMember(), "settings", "calendar_place_other")));

console.log("\n--- errorReports ---");
const errReport = (over = {}) => ({
  message: "TypeError: x is undefined", componentStack: "at Foo", userMessage: "s-a blocat calendarul",
  path: "/dashboard", userAgent: "test", appVersion: "web", uid: MEMBER, email: "mem@x.com",
  status: "new", createdAt: ts(), ...over,
});
await chk("errorReports: signed-in user files own report", "ALLOW", () => addDoc(collection(dbMember(), "errorReports"), errReport()));
await chk("errorReports: cannot spoof another uid", "DENY", () => addDoc(collection(dbMember(), "errorReports"), errReport({ uid: OWNER })));
await chk("errorReports: cannot create pre-resolved", "DENY", () => addDoc(collection(dbMember(), "errorReports"), errReport({ status: "resolved" })));
await chk("errorReports: non-owner cannot read", "DENY", async () => {
  await te.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "errorReports", "er1"), errReport()));
  await getDoc(doc(dbMember(), "errorReports", "er1"));
});
await chk("errorReports: owner reads", "ALLOW", async () => {
  await te.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "errorReports", "er1"), errReport()));
  await getDoc(doc(dbOwner(), "errorReports", "er1"));
});
await chk("errorReports: owner marks resolved", "ALLOW", async () => {
  await te.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "errorReports", "er1"), errReport()));
  await updateDoc(doc(dbOwner(), "errorReports", "er1"), { status: "resolved", resolvedAt: ts(), resolvedBy: OWNER_EMAIL });
});

console.log("\n--- auditLogs (one per entity type, manager) ---");
for (const et of ["booking", "fixedSchedule", "room", "group", "accessCode", "user", "location", "settings"]) {
  await chk(`audit: create ${et}`, "ALLOW", () => addDoc(collection(dbMgr(), "auditLogs"), {
    locationId: LOC, locationName: "L", entityType: et, entityId: "x", action: "delete",
    actorUid: MGR, actorEmail: "m@x.com", actorName: "U", before: { a: 1 }, after: null, createdAt: ts(),
  }));
}
await chk("audit: spoofed actorUid rejected", "DENY", () => addDoc(collection(dbMgr(), "auditLogs"), {
  locationId: LOC, locationName: "L", entityType: "room", entityId: "x", action: "delete",
  actorUid: "someoneElse", actorEmail: "m@x.com", actorName: "U", before: null, after: null, createdAt: ts(),
}));

console.log("\n--- locations: closure ---");
await chk("locations: owner can save a location carrying closure fields", "ALLOW", () => updateDoc(doc(dbOwner(), "locations", LOC), { closureRequestedBy: "m@x.com", statusBeforeClosure: "active", closureScheduledFor: Timestamp.fromMillis(Date.now() + 30 * 86400000), closureRequestedAt: ts() }));
await chk("locations: manager can no longer delete the location", "DENY", () => deleteDoc(doc(dbMgr(), "locations", LOC)));
await chk("locations: owner can delete a location", "ALLOW", () => deleteDoc(doc(dbOwner(), "locations", LOC)));

await chk("closedLocations: owner can read the archived billing record", "ALLOW", async () => { await te.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "closedLocations", LOC), { name: "L", plan: "pro" })); return getDoc(doc(dbOwner(), "closedLocations", LOC)); });
await chk("closedLocations: a location manager cannot read it", "DENY", async () => { await te.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "closedLocations", LOC), { name: "L" })); return getDoc(doc(dbMgr(), "closedLocations", LOC)); });
await chk("closedLocations: nobody writes from a client (not even the owner)", "DENY", () => setDoc(doc(dbOwner(), "closedLocations", LOC), { name: "x" }));

console.log("\n--- users: administrator safety ---");
await chk("users: manager cannot change their OWN role", "DENY", () => updateDoc(doc(dbMgr(), "users", MGR), { role: "member" }));
await chk("users: manager can change ANOTHER user's role", "ALLOW", () => updateDoc(doc(dbMgr(), "users", MEMBER), { role: "guest" }));
await chk("users: manager cannot delete their own users doc", "DENY", () => deleteDoc(doc(dbMgr(), "users", MGR)));
await chk("users: manager can delete another user of the location", "ALLOW", () => deleteDoc(doc(dbMgr(), "users", MEMBER)));

console.log("\n--- accessCodes ---");
await chk("accessCode: soft-delete (updateDoc {...softDelete, active:false})", "ALLOW", () => updateDoc(doc(dbMgr(), "accessCodes", "CODE1"), { ...softDelete(), active: false }));
await chk("accessCode: undo soft-delete (restore)", "ALLOW", async () => { await updateDoc(doc(dbMgr(), "accessCodes", "CODE1"), { ...softDelete(), active: false }); await updateDoc(doc(dbMgr(), "accessCodes", "CODE1"), { ...{ deleted: false, deletedAt: null, deletedBy: "", deletedByUid: "", updatedBy: "m@x.com", updatedAt: ts() }, active: true }); });
await chk("accessCode: create with expiresAt timestamp", "ALLOW", () =>
  setDoc(doc(dbMgr(), "accessCodes", "CODE_NEW"), accessCodeDoc({ code: "CODE_NEW", expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000) }))
);
await chk("accessCode: manager extends expiresAt on an existing code", "ALLOW", () =>
  updateDoc(doc(dbMgr(), "accessCodes", "CODE1"), {
    role: "member", groupName: "G", roomAccess: "all", allowedRoomIds: [],
    locationId: LOC, locationName: "L", maxUses: 10, usedCount: 0, active: true,
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000),
    updatedBy: "m@x.com", updatedAt: ts(),
  })
);

console.log("\n--- email_verified gate ---");
await chk("unverified manager cannot edit room", "DENY", () => updateDoc(doc(dbUnverified(), "rooms", "room1"), { name: "x", locationId: LOC, locationName: "L", updatedBy: "x", updatedAt: ts() }));
await chk("unverified manager cannot soft-delete booking-style", "DENY", () => updateDoc(doc(dbUnverified(), "rooms", "room1"), softDelete()));

console.log("\n--- locations: unverified bootstrap read (access-code registration) ---");
// Regression for: a brand-new access-code signup creates the Auth user, then
// reads /locations/{id} to confirm it exists and get its live name - BEFORE
// the users/{uid} profile doc is written and BEFORE verification even starts.
// signedInVerified() can never be true at that point.
await chk("locations: brand-new unverified user (no users doc) reads a location by id", "ALLOW", () => getDoc(doc(dbNewUser(), "locations", LOC)));
await chk("locations: unverified user WITH an existing users doc still cannot read", "DENY", () => getDoc(doc(dbUnverified(), "locations", LOC)));
await chk("locations: brand-new unverified user cannot list locations", "DENY", () => getDocs(collection(dbNewUser(), "locations")));

console.log("\n--- access-code self-registration (full transaction, all 3 roles) ---");
// Mirrors createProfile()'s runTransaction in app/login/page.tsx exactly: the
// brand-new, unverified Auth user reads the access code, writes their own
// users/{uid} doc, and bumps the code's usedCount - in one transaction, with
// no users/{uid} doc existing beforehand. Covers manager/member/guest since
// each has a different maxUses convention (1 / 10 / null).
async function seedAccessCode(codeId, role, over = {}) {
  await te.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), "accessCodes", codeId), {
      code: codeId, role, locationId: LOC, locationName: "L",
      groupName: role === "manager" ? "" : "G",
      roomAccess: "all", allowedRoomIds: [],
      maxUses: role === "manager" ? 1 : role === "member" ? 10 : null,
      usedCount: 0, active: true, createdBy: "m@x.com", createdAt: ts(),
      ...over,
    })
  );
}

async function attemptAccessCodeSignup(uid, codeId) {
  const d = te.authenticatedContext(uid, { email: `${uid}@x.com`, email_verified: false, firebase: { sign_in_provider: "password" } }).firestore();
  const userRef = doc(d, "users", uid);
  const codeRef = doc(d, "accessCodes", codeId);

  await runTransaction(d, async (transaction) => {
    const codeSnap = await transaction.get(codeRef);
    const codeData = codeSnap.data();

    transaction.set(userRef, {
      uid, email: `${uid}@x.com`, displayName: "New User", group: codeData.groupName, groupName: codeData.groupName,
      role: codeData.role, isOwner: false, locationId: codeData.locationId, locationName: codeData.locationName,
      accessCodeId: codeId, accessCodeRole: codeData.role, roomAccess: codeData.roomAccess, allowedRoomIds: codeData.allowedRoomIds,
      locationSetupRequired: false,
      usePin: false, lockOnHide: false, useBiometrics: false, language: "ro", createdAt: ts(),
    });
    transaction.update(codeRef, {
      active: true, maxUses: codeData.maxUses, usedCount: (codeData.usedCount ?? 0) + 1,
      lastUsedAt: ts(), lastUsedBy: `${uid}@x.com`, lastUsedByUid: uid,
    });
  });
}

for (const role of ["manager", "member", "guest"]) {
  const codeId = `SELFCODE_${role.toUpperCase()}`;
  const uid = `selfSignupUid${role}0000000001`;
  await chk(`access-code self-registration: new unverified ${role} completes signup`, "ALLOW", async () => {
    await seedAccessCode(codeId, role);
    await attemptAccessCodeSignup(uid, codeId);
  });
}

await chk("access-code self-registration: expired code is denied", "DENY", async () => {
  await seedAccessCode("SELFCODE_EXPIRED", "member", { expiresAt: Timestamp.fromMillis(Date.now() - 86400000) });
  await attemptAccessCodeSignup("selfSignupUidExpired00001", "SELFCODE_EXPIRED");
});

await chk("access-code self-registration: profile email with different case than the token is denied", "DENY", async () => {
  await seedAccessCode("SELFCODE_CASE", "guest");
  const uid = "selfSignupUidCase0000000001";
  const d = te.authenticatedContext(uid, { email: `${uid}@x.com`, email_verified: false, firebase: { sign_in_provider: "password" } }).firestore();
  await runTransaction(d, async (transaction) => {
    transaction.set(doc(d, "users", uid), {
      uid, email: `${uid.charAt(0).toUpperCase()}${uid.slice(1)}@x.com`, displayName: "New User", group: "G", groupName: "G",
      role: "guest", isOwner: false, locationId: LOC, locationName: "L", accessCodeId: "SELFCODE_CASE", accessCodeRole: "guest",
      roomAccess: "all", allowedRoomIds: [], locationSetupRequired: false, usePin: false, lockOnHide: false, useBiometrics: false,
      language: "ro", createdAt: ts(),
    });
    transaction.update(doc(d, "accessCodes", "SELFCODE_CASE"), { active: true, maxUses: null, usedCount: 1, lastUsedAt: ts(), lastUsedBy: `${uid}@x.com`, lastUsedByUid: uid });
  });
});
await chk("access-code self-registration: no-expiresAt (legacy) code still works", "ALLOW", async () => {
  await seedAccessCode("SELFCODE_LEGACY", "guest");
  await attemptAccessCodeSignup("selfSignupUidLegacy000001", "SELFCODE_LEGACY");
});

await te.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
