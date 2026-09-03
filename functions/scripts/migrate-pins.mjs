/**
 * One-off migration: remove the legacy unsalted `pinHash` from every users/* doc.
 *
 * The old PIN was SHA-256(uid:pin) with no salt, stored on the publicly readable
 * users/{uid} doc. It cannot be re-hashed (no plaintext), so this script strips it
 * and forces a re-enrollment: the app shows a banner and the user sets a new PIN
 * through the `setPin` Cloud Function (scrypt + salt, stored Admin-only under
 * users/{uid}/private/security).
 *
 * Usage (from repo root, after `firebase login`):
 *   node functions/scripts/migrate-pins.mjs --dry-run
 *   node functions/scripts/migrate-pins.mjs
 *
 * Auth: uses Application Default Credentials. Either
 *   - set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file, or
 *   - run `gcloud auth application-default login` for project kelunia-890fe.
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ID = process.env.GCLOUD_PROJECT || "kelunia-890fe";

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });

const db = getFirestore();

async function run() {
  const snapshot = await db.collection("users").get();
  let scanned = 0;
  let migrated = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data();
    const hasLegacyPin = typeof data.pinHash === "string" && data.pinHash.length > 0;

    if (!hasLegacyPin) {
      continue;
    }

    migrated += 1;
    console.log(`${DRY_RUN ? "[dry-run] would migrate" : "migrating"} users/${doc.id}`);

    if (DRY_RUN) {
      continue;
    }

    await doc.ref.set(
      {
        pinHash: FieldValue.delete(),
        pinSet: false,
        usePin: false,
        useBiometrics: false,
        pinResetRequired: true,
      },
      { merge: true }
    );
  }

  console.log(
    `\nDone. scanned=${scanned} ${DRY_RUN ? "toMigrate" : "migrated"}=${migrated}` +
      (DRY_RUN ? "  (no writes performed)" : "")
  );
}

run().then(
  () => process.exit(0),
  (error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  }
);
