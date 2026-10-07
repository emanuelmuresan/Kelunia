/**
 * Exercises purgeLocation() (functions/src/location-closure.ts) against the Auth +
 * Firestore emulators: a closed location's data and member accounts disappear,
 * another location and the platform owner are untouched.
 *
 * Run: (cd functions && npx tsc) && firebase emulators:exec --project demo-kelunia \
 *      --only auth,firestore "node scripts/test-location-purge.mjs"
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const { purgeLocation } = require("../functions/lib/location-closure.js");

initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-kelunia" });
const db = getFirestore();
const auth = getAuth();

const GONE = "loc-closing";
const KEPT = "loc-other";
const OWNER_EMAIL = "owner@example.com";

async function user(uid, email, locationId, extra = {}) {
  await auth.createUser({ uid, email, password: "Test123456", emailVerified: true });
  await db.doc(`users/${uid}`).set({ uid, email, locationId, role: "member", isOwner: false, ...extra });
  await db.doc(`users/${uid}/private/pin`).set({ hash: "x" });
  await db.doc(`notificationTokens/token-${uid}`).set({ uid, email, locationId, token: `t-${uid}` });
}

await db.doc(`locations/${GONE}`).set({ name: "Closing", billingStatus: "canceled", closureScheduledFor: new Date(0) });
await db.doc(`locations/${KEPT}`).set({ name: "Other", billingStatus: "active" });
await db.doc(`settings/calendar_${GONE}`).set({ locationId: GONE });
await db.doc(`settings/calendar_${KEPT}`).set({ locationId: KEPT });

await user("admin-gone", "admin@gone.test", GONE, { role: "manager" });
await user("member-gone", "member@gone.test", GONE);
await user("member-kept", "member@kept.test", KEPT);
await user("owner-uid", OWNER_EMAIL, "", { isOwner: true });

for (const [id, locationId] of [["a", GONE], ["b", GONE], ["c", KEPT]]) {
  await db.doc(`events/${id}`).set({ locationId });
  await db.doc(`groups/${id}`).set({ locationId });
  await db.doc(`rooms/${id}`).set({ locationId });
  await db.doc(`fixedSchedules/${id}`).set({ locationId });
  await db.doc(`accessCodes/${id}`).set({ locationId });
  await db.doc(`auditLogs/${id}`).set({ locationId });
}

const result = await purgeLocation(db, auth, GONE, OWNER_EMAIL);

const exists = async (path) => (await db.doc(path).get()).exists;
const count = async (collection, locationId) =>
  (await db.collection(collection).where("locationId", "==", locationId).get()).size;

assert.equal(result.accountsDeleted, 2, "both members of the closed location are deleted");
assert.equal(await exists(`locations/${GONE}`), false, "location doc removed");
assert.equal(await exists(`settings/calendar_${GONE}`), false, "location settings removed");

for (const uid of ["admin-gone", "member-gone"]) {
  assert.equal(await exists(`users/${uid}`), false, `${uid} profile removed`);
  assert.equal(await exists(`users/${uid}/private/pin`), false, `${uid} private subcollection removed`);
  assert.equal(await exists(`notificationTokens/token-${uid}`), false, `${uid} push token removed`);
  await assert.rejects(auth.getUser(uid), { code: "auth/user-not-found" });
}

for (const collection of ["events", "groups", "rooms", "fixedSchedules", "accessCodes", "auditLogs"]) {
  assert.equal(await count(collection, GONE), 0, `${collection} of the closed location removed`);
  assert.equal(await count(collection, KEPT), 1, `${collection} of the other location kept`);
}

assert.equal(await exists(`locations/${KEPT}`), true, "other location kept");
assert.equal(await exists(`settings/calendar_${KEPT}`), true, "other location settings kept");
assert.equal(await exists("users/member-kept"), true, "other location member kept");
assert.equal((await auth.getUser("member-kept")).email, "member@kept.test");
assert.equal(await exists("users/owner-uid"), true, "platform owner profile kept");
assert.equal((await auth.getUser("owner-uid")).email, OWNER_EMAIL, "platform owner auth user kept");

console.log("location purge: all checks passed", JSON.stringify(result));
