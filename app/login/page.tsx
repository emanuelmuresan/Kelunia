"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, runTransaction, setDoc, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, cloudFunctions, db, ensureAuthPersistence } from "@/lib/firebase";
import { isInstalledAppShell } from "@/lib/app-shell";
import { useAuth, type AppLanguage, type UserRole } from "@/context/AuthContext";
import { maxUsesForAccessRole, normalizeRole, readOptionalNumber } from "@/lib/access-codes";
import { defaultLocationName } from "@/lib/config/app";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import { passwordSecurityError } from "@/lib/security/password";
import type { RoomAccessMode } from "@/lib/types/domain";

type AuthMode = "login" | "trial" | "register" | "reset";

function accessCodeDocumentId(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function accessCodeUsage(data: Record<string, unknown>, role: UserRole) {
  return {
    active: data.active !== false,
    maxUses: readOptionalNumber(data.maxUses) ?? maxUsesForAccessRole(role),
    usedCount: Math.max(0, readOptionalNumber(data.usedCount) ?? 0),
  };
}

function assertAccessCodeCanBeUsed(data: Record<string, unknown>, role: UserRole) {
  const usage = accessCodeUsage(data, role);

  if (!usage.active) {
    throw new Error("Codul de acces este oprit. Cere un cod nou de la manager.");
  }

  if (usage.maxUses !== null && usage.usedCount >= usage.maxUses) {
    throw new Error("Codul de acces a fost folosit de numărul maxim de persoane. Cere un cod nou de la manager.");
  }

  return usage;
}

function assertLicenseCodeCanBeUsed(exists: boolean, data: Record<string, unknown>) {
  if (!exists || data.used === true || data.claimed === true || data.active === false || data.deleted === true) {
    throw new Error("Codul de licență nu este valid sau a fost folosit deja.");
  }
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function assertFullName(value: string) {
  const parts = normalizeDisplayName(value).split(" ").filter(Boolean);

  if (parts.length < 2 || parts.some((part) => part.length < 2)) {
    throw new Error("Scrie numele și prenumele.");
  }
}

function readableError(message: string) {
  if (message.includes("auth/too-many-requests")) {
    return "Prea multe încercări într-un timp scurt. Așteaptă puțin și încearcă din nou.";
  }

  if (message.includes("Firebase Auth nu poate fi contactat")) {
    return "iPhone-ul nu poate contacta Firebase Auth. Verifică internetul, dezactivează VPN/Private Relay temporar și încearcă din nou.";
  }

  if (message.includes("Emailul nu este verificat")) {
    return "Emailul nu este verificat. Ți-am retrimis emailul de verificare. Verifică inbox-ul și Spam/Promotions.";
  }

  if (message.includes("Emailul de verificare nu a putut fi trimis")) {
    return message;
  }

  if (message.includes("nu a raspuns la timp")) {
    return "Conexiunea a durat prea mult. Verifică internetul pe iPhone și încearcă din nou.";
  }

  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
    return "Emailul sau parola nu sunt corecte.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "Există deja un cont Firebase Authentication cu acest email. Încearcă recuperarea parolei sau șterge utilizatorul din Authentication > Users, nu doar din Firestore.";
  }

  if (message.includes("auth/weak-password")) {
    return "Parola este prea slabă. Folosește cel puțin 8 caractere, cu litere și cifre.";
  }

  if (message.includes("Parolele nu se potrivesc")) {
    return "Parolele nu se potrivesc.";
  }

  if (message.includes("Scrie numele și prenumele")) {
    return "Scrie numele și prenumele.";
  }

  return message.replace("Firebase: ", "");
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

async function verifyFirebaseAuthConnection() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    return;
  }

  const response = await withTimeout(
    fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "kelunia-connectivity-check@example.invalid",
        password: "kelunia-connectivity-check",
        returnSecureToken: true,
      }),
    }),
    8000,
    "Firebase Auth nu poate fi contactat la timp."
  ).catch((error) => {
    throw new Error(`Firebase Auth nu poate fi contactat: ${error instanceof Error ? error.message : "network error"}`);
  });

  if (!response.ok && response.status >= 500) {
    throw new Error("Firebase Auth nu poate fi contactat: server error");
  }
}

async function sendVerificationAndSignOut() {
  await sendCustomVerificationEmail();
  await signOut(auth);
}

async function resendVerificationBeforeSignOut() {
  try {
    await sendCustomVerificationEmail();
  } catch (error) {
    console.error("Emailul de verificare nu a putut fi trimis:", error);
    throw new Error(
      "Emailul de verificare nu a putut fi trimis prin Kelunia. Verifică secretul RESEND_API_KEY, EMAIL_FROM și domeniul Resend."
    );
  } finally {
    await signOut(auth).catch((signOutError) => {
      console.warn("Delogarea după retrimiterea verificării a eșuat:", signOutError);
    });
  }
}

async function sendCustomVerificationEmail() {
  const sendVerification = httpsCallable(cloudFunctions, "sendAuthVerificationEmail");
  await sendVerification();
}

async function sendCustomPasswordResetEmail(email: string) {
  const sendPasswordReset = httpsCallable(cloudFunctions, "sendAuthPasswordResetEmail");
  await sendPasswordReset({ email });
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [installedAppShell, setInstalledAppShell] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>("ro");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const updateShellMode = () => {
      setInstalledAppShell(isInstalledAppShell());
    };
    const delayedUpdate = window.setTimeout(updateShellMode, 250);

    updateShellMode();

    return () => window.clearTimeout(delayedUpdate);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitationCode = params.get("invite") || params.get("code") || params.get("cod") || "";
    const invitedEmail = params.get("email") || "";
    const requestedMode = params.get("mode") || "";

    if (requestedMode === "trial") {
      setMode("trial");
    }

    if (invitationCode) {
      setMode("register");
      setAccessCode(invitationCode);
    }

    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.emailVerified) {
      router.replace("/dashboard");
    }

    if (!authLoading && user && !user.emailVerified) {
      void signOut(auth);
    }
  }, [authLoading, router, user]);

  async function createProfile(
    role: UserRole,
    createdLocationName: string,
    createdLocationId = "main-location",
    assignedGroupName = "",
    accessCodeId = "",
    isOwner = false,
    roomAccess: RoomAccessMode = "all",
    allowedRoomIds: string[] = []
  ) {
    const cleanLocationId = createdLocationId.trim();
    const cleanGroupName = role === "manager" ? "" : assignedGroupName.trim();
    const cleanAccessCodeId = accessCodeId.trim();
    const cleanRoomAccess = role === "manager" ? "all" : roomAccess;
    const cleanAllowedRoomIds = cleanRoomAccess === "selected" ? normalizeAllowedRoomIds(allowedRoomIds) : [];

    if (!isOwner && !cleanLocationId) {
      throw new Error("Codul de acces nu are o locație setată.");
    }

    if (!isOwner && role !== "manager" && !cleanGroupName) {
      throw new Error("Codul de acces nu are un grup setat. Cere un cod nou de la manager.");
    }

    const accessCodeRef = !isOwner && cleanAccessCodeId ? doc(db, "accessCodes", cleanAccessCodeId) : null;
    let profileCreated = false;
    let resolvedLocationName = createdLocationName.trim() || defaultLocationName;
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, "users", result.user.uid);

    try {
      if (!isOwner) {
        const locationSnap = await getDoc(doc(db, "locations", cleanLocationId));

        if (!locationSnap.exists()) {
          throw new Error("Locația acestui cod nu mai există. Cere un cod nou de la manager.");
        }

        const locationData = locationSnap.data() ?? {};
        resolvedLocationName = String(locationData.name ?? locationData.locationName ?? resolvedLocationName).trim() || resolvedLocationName;
      }

      const profilePayload = {
        uid: result.user.uid,
        email,
        displayName: normalizeDisplayName(displayName) || email,
        groupName: cleanGroupName,
        group: cleanGroupName,
        role,
        isOwner,
        locationId: cleanLocationId,
        locationName: resolvedLocationName,
        accessCodeId: cleanAccessCodeId,
        accessCodeRole: role,
        roomAccess: cleanRoomAccess,
        allowedRoomIds: cleanAllowedRoomIds,
        usePin: false,
        lockOnHide: false,
        useBiometrics: false,
        language,
        createdAt: Timestamp.now(),
      };

      if (accessCodeRef) {
        await runTransaction(db, async (transaction) => {
          const codeSnap = await transaction.get(accessCodeRef);

          if (!codeSnap.exists()) {
            throw new Error("Codul de acces nu mai este valid.");
          }

          const codeData = codeSnap.data() ?? {};
          const codeRole = normalizeRole(codeData.role);
          const codeLocationId = String(codeData.locationId ?? "").trim();
          const codeLocationName = String(codeData.locationName ?? resolvedLocationName).trim() || resolvedLocationName;
          const codeGroupName = codeRole === "manager" ? "" : String(codeData.groupName ?? "").trim();
          const codeRoomAccess = codeRole === "manager" ? "all" : normalizeRoomAccessMode(codeData.roomAccess);
          const codeAllowedRoomIds = codeRoomAccess === "selected" ? normalizeAllowedRoomIds(codeData.allowedRoomIds) : [];
          const usage = assertAccessCodeCanBeUsed(codeData, codeRole);

          if (
            codeRole !== role ||
            codeLocationId !== cleanLocationId ||
            codeGroupName !== cleanGroupName ||
            codeRoomAccess !== cleanRoomAccess ||
            codeAllowedRoomIds.join("|") !== cleanAllowedRoomIds.join("|")
          ) {
            throw new Error("Codul de acces a fost schimbat. Încearcă din nou sau cere un cod nou.");
          }

          transaction.set(userRef, {
            ...profilePayload,
            locationName: codeLocationName,
          });

          transaction.update(accessCodeRef, {
            active: true,
            maxUses: usage.maxUses,
            usedCount: usage.usedCount + 1,
            lastUsedAt: Timestamp.now(),
            lastUsedBy: email,
            lastUsedByUid: result.user.uid,
          });
        });
      } else {
        await setDoc(userRef, profilePayload);
      }

      profileCreated = true;
      await sendVerificationAndSignOut();
    } catch (profileError) {
      if (profileCreated) {
        await deleteDoc(userRef).catch((deleteProfileError) => {
          console.warn("Profilul creat incomplet nu a putut fi șters automat:", deleteProfileError);
        });
      }

      await deleteUser(result.user).catch((deleteUserError) => {
        console.warn("Contul creat incomplet nu a putut fi șters automat:", deleteUserError);
      });

      throw profileError;
    }
  }

  async function createTrialProfile() {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, "users", result.user.uid);

    try {
      await setDoc(userRef, {
        uid: result.user.uid,
        email,
        displayName: normalizeDisplayName(displayName) || email,
        groupName: "",
        group: "",
        role: "manager",
        isOwner: false,
        locationId: "",
        locationName: "",
        pendingLicenseId: "",
        pendingLicenseCode: "",
        locationSetupRequired: true,
        roomAccess: "all",
        allowedRoomIds: [],
        usePin: false,
        lockOnHide: false,
        useBiometrics: false,
        language,
        createdAt: Timestamp.now(),
      });
      await sendVerificationAndSignOut();
    } catch (trialError) {
      await deleteDoc(userRef).catch((deleteProfileError) => {
        console.warn("Profilul trial creat incomplet nu a putut fi sters automat:", deleteProfileError);
      });

      await deleteUser(result.user).catch((deleteError) => {
        console.warn("Contul trial creat incomplet nu a putut fi sters automat:", deleteError);
      });

      throw trialError;
    }
  }

  async function createLicensedProfile(licenseId: string, code: string) {
    const licenseRef = doc(db, "licenses", licenseId);
    const preflightLicenseSnap = await getDoc(licenseRef);

    assertLicenseCodeCanBeUsed(preflightLicenseSnap.exists(), preflightLicenseSnap.data() ?? {});

    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, "users", result.user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const licenseSnap = await transaction.get(licenseRef);
        const licenseData = licenseSnap.data() ?? {};

        assertLicenseCodeCanBeUsed(licenseSnap.exists(), licenseData);

        const licenseLocationName = String(
          licenseData.intendedLocationName ??
          licenseData.locationName ??
          licenseData.officialAddress ??
          licenseData.intendedAddress ??
          ""
        ).trim();

        transaction.set(userRef, {
          uid: result.user.uid,
          email,
          displayName: normalizeDisplayName(displayName) || email,
          groupName: "",
          group: "",
          role: "manager",
          isOwner: false,
          locationId: "",
          locationName: licenseLocationName,
          pendingLicenseId: licenseId,
          pendingLicenseCode: code,
          locationSetupRequired: true,
          roomAccess: "all",
          allowedRoomIds: [],
          usePin: false,
          lockOnHide: false,
          useBiometrics: false,
          language,
          createdAt: Timestamp.now(),
        });

        transaction.update(licenseRef, {
          claimed: true,
          claimedAt: Timestamp.now(),
          claimedBy: email,
          claimedByUid: result.user.uid,
        });
      });
      await sendVerificationAndSignOut();
    } catch (licenseError) {
      await deleteDoc(userRef).catch((deleteProfileError) => {
        console.warn("Profilul creat cu licență invalidă nu a putut fi șters automat:", deleteProfileError);
      });

      await deleteUser(result.user).catch((deleteError) => {
        console.warn("Contul creat cu licență invalidă nu a putut fi șters automat:", deleteError);
      });
      throw licenseError;
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await ensureAuthPersistence();

      if (mode === "login") {
        await verifyFirebaseAuthConnection();
        const credential = await withTimeout(
          signInWithEmailAndPassword(auth, email, password),
          20000,
          "Autentificarea nu a raspuns la timp."
        );

        if (!credential.user.emailVerified) {
          await resendVerificationBeforeSignOut();
          throw new Error("Emailul nu este verificat.");
        }

        router.push("/dashboard");
        return;
      }

      if (mode === "reset") {
        await sendCustomPasswordResetEmail(email);
        setMessage("Emailul de resetare a fost trimis.");
        return;
      }

      if (mode === "trial") {
        if (password !== confirmPassword) {
          throw new Error("Parolele nu se potrivesc.");
        }

        assertFullName(displayName);

        const passwordError = passwordSecurityError(password, email);

        if (passwordError) {
          throw new Error(passwordError);
        }

        await createTrialProfile();
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setMessage("Ți-am trimis un email de verificare. Confirmă adresa, apoi intră în cont.");
        return;
      }

      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Parolele nu se potrivesc.");
        }

        assertFullName(displayName);

        const passwordError = passwordSecurityError(password, email);

        if (passwordError) {
          throw new Error(passwordError);
        }

        const cleanAccessCode = accessCodeDocumentId(accessCode);

        if (!cleanAccessCode) {
          throw new Error("Cod de acces invalid.");
        }

        const accessCodeSnap = await getDoc(doc(db, "accessCodes", cleanAccessCode));

        let role: UserRole = "guest";
        let createdLocationId = "main-location";
        let createdLocationName = defaultLocationName;
        let assignedGroupName = "";
        let roomAccess: RoomAccessMode = "all";
        let allowedRoomIds: string[] = [];

        if (accessCodeSnap.exists()) {
          const accessCodeData = accessCodeSnap.data() ?? {};
          role = normalizeRole(accessCodeData.role);
          createdLocationId = String(accessCodeData.locationId ?? "").trim();
          createdLocationName = String(accessCodeData.locationName ?? createdLocationName).trim() || createdLocationName;
          assignedGroupName = String(accessCodeData.groupName ?? "").trim();
          roomAccess = role === "manager" ? "all" : normalizeRoomAccessMode(accessCodeData.roomAccess);
          allowedRoomIds = roomAccess === "selected" ? normalizeAllowedRoomIds(accessCodeData.allowedRoomIds) : [];
          assertAccessCodeCanBeUsed(accessCodeData, role);

          if (!createdLocationId) {
            throw new Error("Codul de acces nu are o locație setată.");
          }

          await createProfile(role, createdLocationName, createdLocationId, assignedGroupName, cleanAccessCode, false, roomAccess, allowedRoomIds);
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setMessage("Ți-am trimis un email de verificare. Confirmă adresa, apoi intră în cont.");
          return;
        }

        await createLicensedProfile(cleanAccessCode, accessCode.trim());
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setMessage("Ți-am trimis un email de verificare. Confirmă adresa, apoi intră în cont.");
        return;
      }
    } catch (err) {
      setError(readableError(err instanceof Error ? err.message : "A apărut o eroare."));
    } finally {
      setLoading(false);
    }
  }

  const title = {
    login: "Bine ai revenit",
    trial: "Începe trialul",
    register: "Cont cu cod",
    reset: "Recuperare parolă",
  }[mode];
  const subtitle = {
    login: "Intră direct în calendarul locației tale.",
    trial: "Creează un spațiu de test și confirmă emailul.",
    register: "Folosește codul primit pentru locația ta.",
    reset: "Primești un link sigur pentru o parolă nouă.",
  }[mode];

  if (authLoading || user?.emailVerified) {
    return (
      <main className="loading-screen">
        <div className="loading-logo">
          <img src="/icon-192.png" alt="Kelunia" />
        </div>
        <h1>Kelunia</h1>
        <p>Se pregătește calendarul...</p>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-top-row">
          {!installedAppShell && <Link href="/" className="back-link">← Acasă</Link>}
          <label className="language-selector auth-language-selector">
            Limba
            <select value={language} onChange={(event) => setLanguage(event.target.value as AppLanguage)}>
              <option value="ro">Romana</option>
            </select>
          </label>
        </div>

        <div className="auth-card-head">
          <img src="/icon-192.png" alt="Kelunia" />
          <div>
            <span>Kelunia</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>

        <div className="auth-switcher" role="group" aria-label="Tip cont">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Intră</button>
          <button className={mode === "trial" ? "active" : ""} onClick={() => setMode("trial")} type="button">Trial</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Am cod</button>
        </div>

        {error && <p className="error-line">{error}</p>}
        {message && <p className="success-line">{message}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="emailul tău, ex. nume@email.com"
              autoComplete="email"
              required
            />
          </label>

          {mode !== "reset" && (
            <label>
              Parolă
              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "login" ? "parola contului tău" : "minimum 8 caractere, litere și cifre"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>
          )}

          {(mode === "register" || mode === "trial") && (
            <label>
              Repetă parola
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="scrie aceeași parolă încă o dată"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {(mode === "register" || mode === "trial") && (
            <label>
              Nume și prenume
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="ex. Emanuel Mureșan"
                autoComplete="name"
                required
              />
            </label>
          )}

          {mode === "register" && (
            <label>
              Cod acces
              <input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="codul primit de la manager sau la licența locației"
                required
              />
            </label>
          )}

          {mode === "register" && (
            <>
              <p className="muted-note">Dacă acesta este cod de licență, vei deschide locația după ce intri în cont. Dacă este cod primit de la manager, locația este aleasă automat.</p>
            </>
          )}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Se procesează..." : mode === "login" ? "Intră în cont" : mode === "reset" ? "Trimite email" : mode === "trial" ? "Începe trial" : "Creează cont"}
          </button>
        </form>

        <div className="auth-links">
          {mode === "login" ? (
            <button onClick={() => setMode("reset")} type="button">Am uitat parola</button>
          ) : (
            <button onClick={() => setMode("login")} type="button">Înapoi la login</button>
          )}
        </div>
      </section>
    </main>
  );
}
