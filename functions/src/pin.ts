// Funcții cloud pentru PIN-ul de deblocare al aplicației: setPin, verifyPin și disablePin.
// PIN-ul nu se păstrează niciodată ca text: se stochează un hash scrypt cu sare, într-un document la care clienții nu au acces (users/{uid}/private/security).
// Toate funcțiile cer autentificare, email verificat și App Check.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// Regiunea funcțiilor (aceeași cu cea din client).
const REGION = "europe-west1";

// scrypt cu promisiuni, cu tipurile folosite aici.
const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// PIN-ul acceptat: 4-8 cifre.
const PIN_PATTERN = /^\d{4,8}$/;

// Încercări greșite permise înainte de prima blocare.
// Wrong tries allowed before the first lockout kicks in.
const MAX_ATTEMPTS = 3;

// Durata blocării (30 s, 2 min, 10 min, 1 h), din ce în ce mai mare la fiecare greșeală următoare.
// Lockout applied once failedAttempts >= MAX_ATTEMPTS, escalating with each further miss.
const LOCKOUT_LADDER_MS = [30_000, 120_000, 600_000, 3_600_000];

// Parametrii scrypt (cost ridicat, ca să încetinească ghicirea) și memoria maximă permisă.
const SCRYPT = { N: 32_768, r: 8, p: 1, keylen: 32 } as const;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

// Calea documentului privat cu credențialele PIN-ului.
const securityDocPath = (uid: string) => `users/${uid}/private/security`;

// Calculează hash-ul PIN-ului cu sare (nouă sau cea existentă).
async function derivePinHash(pin: string, saltB64?: string) {
  const salt = saltB64 ? Buffer.from(saltB64, "base64") : randomBytes(16);
  const derived = await scrypt(pin.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: SCRYPT_MAXMEM,
  });

  return { salt: salt.toString("base64"), hash: derived.toString("base64") };
}

// Compară două hash-uri în timp constant, ca durata să nu dezvăluie unde diferă.
function constantTimeEqualB64(a: string, b: string) {
  const bufferA = Buffer.from(a, "base64");
  const bufferB = Buffer.from(b, "base64");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

// Cere un utilizator autentificat cu emailul verificat; întoarce uid-ul.
function requireVerifiedUser(auth: { uid?: string; token?: { email_verified?: boolean } } | undefined) {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Trebuie să fii autentificat.");
  }

  if (auth.token?.email_verified !== true) {
    throw new HttpsError("failed-precondition", "Confirmă adresa de email înainte să folosești PIN-ul.");
  }

  return auth.uid;
}

// Citește și validează PIN-ul din cerere.
function readPin(data: unknown) {
  const pin = typeof (data as { pin?: unknown })?.pin === "string" ? (data as { pin: string }).pin.trim() : "";

  if (!PIN_PATTERN.test(pin)) {
    throw new HttpsError("invalid-argument", "PIN-ul trebuie să aibă între 4 și 8 cifre.");
  }

  return pin;
}

// Setează PIN-ul: scrie hash-ul și sarea în documentul privat și marchează users/{uid}.pinSet.
/**
 * Store the user's unlock PIN as a scrypt hash + salt in an Admin-only
 * subcollection. Also flips users/{uid}.pinSet and clears any legacy pinHash.
 */
export const setPin = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const uid = requireVerifiedUser(request.auth);
  const pin = readPin(request.data);

  const { salt, hash } = await derivePinHash(pin);
  const db = getFirestore();
  const serverTimestamp = FieldValue.serverTimestamp();

  const batch = db.batch();

  batch.set(db.doc(securityDocPath(uid)), {
    algo: "scrypt",
    n: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    keylen: SCRYPT.keylen,
    salt,
    hash,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: serverTimestamp,
    updatedAt: serverTimestamp,
  });

  batch.set(
    db.doc(`users/${uid}`),
    {
      pinSet: true,
      // Cleared rather than set to false so the users/{uid} doc stays within the
      // firestore.rules key allowlist even before the pinHash migration runs.
      pinResetRequired: FieldValue.delete(),
      pinHash: FieldValue.delete(),
    },
    { merge: true }
  );

  await batch.commit();
  logger.info("PIN set", { uid });

  return { ok: true };
});

// Verifică PIN-ul scris: la greșeală nu aruncă eroare, ci întoarce încercările rămase sau blocarea.
/**
 * Check an entered PIN. Returns { ok } rather than throwing on a wrong PIN so the
 * client can show remaining attempts / lockout. 3 misses -> progressive lockout.
 */
export const verifyPin = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const uid = requireVerifiedUser(request.auth);
  const pin = readPin(request.data);

  const db = getFirestore();
  const securityRef = db.doc(securityDocPath(uid));
  const snapshot = await securityRef.get();

  if (!snapshot.exists) {
    throw new HttpsError("failed-precondition", "Nu există un PIN setat pentru acest cont.");
  }

  const data = snapshot.data() as {
    salt?: string;
    hash?: string;
    failedAttempts?: number;
    lockedUntil?: Timestamp | null;
  };

  // Dacă utilizatorul este blocat, răspunde cu timpul rămas fără să mai verifice PIN-ul.
  const nowMs = Date.now();
  const lockedUntilMs = data.lockedUntil ? data.lockedUntil.toMillis() : 0;

  if (lockedUntilMs > nowMs) {
    return {
      ok: false,
      locked: true,
      retryAfterSeconds: Math.ceil((lockedUntilMs - nowMs) / 1000),
      remainingAttempts: 0,
    };
  }

  if (!data.salt || !data.hash) {
    throw new HttpsError("failed-precondition", "PIN-ul trebuie setat din nou.");
  }

  // PIN corect: se resetează contorul de greșeli și blocarea.
  const { hash } = await derivePinHash(pin, data.salt);

  if (constantTimeEqualB64(hash, data.hash)) {
    await securityRef.set(
      {
        failedAttempts: 0,
        lockedUntil: null,
        lastUnlockAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { ok: true };
  }

  // PIN greșit: crește contorul; de la a treia greșeală se aplică o blocare tot mai lungă.
  const failedAttempts = (typeof data.failedAttempts === "number" ? data.failedAttempts : 0) + 1;
  const update: Record<string, unknown> = {
    failedAttempts,
    updatedAt: FieldValue.serverTimestamp(),
  };

  let retryAfterSeconds = 0;

  if (failedAttempts >= MAX_ATTEMPTS) {
    const ladderIndex = Math.min(failedAttempts - MAX_ATTEMPTS, LOCKOUT_LADDER_MS.length - 1);
    const lockMs = LOCKOUT_LADDER_MS[ladderIndex];
    update.lockedUntil = Timestamp.fromMillis(nowMs + lockMs);
    retryAfterSeconds = Math.ceil(lockMs / 1000);
  }

  await securityRef.set(update, { merge: true });
  logger.info("PIN verify failed", { uid, failedAttempts, retryAfterSeconds });

  return {
    ok: false,
    locked: retryAfterSeconds > 0,
    retryAfterSeconds,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - failedAttempts),
  };
});

// Dezactivează PIN-ul: șterge credențialele private și marchează users/{uid}.pinSet ca false.
/** Remove the PIN: delete the private credential and flip users/{uid}.pinSet. */
export const disablePin = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const uid = requireVerifiedUser(request.auth);
  const db = getFirestore();

  const batch = db.batch();
  batch.delete(db.doc(securityDocPath(uid)));
  batch.set(
    db.doc(`users/${uid}`),
    {
      pinSet: false,
      pinResetRequired: FieldValue.delete(),
      pinHash: FieldValue.delete(),
    },
    { merge: true }
  );

  await batch.commit();
  logger.info("PIN disabled", { uid });

  return { ok: true };
});
