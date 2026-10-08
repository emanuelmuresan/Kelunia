"use client";

// Pagina de autentificare: conectare, cont de probă (trial), înregistrare cu cod de acces/licență și resetarea parolei.
// Orice cont nou trebuie să-și verifice emailul înainte de a intra în aplicație.
import { useEffect, useRef, useState } from "react";
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
import { appText, normalizeSupportedLocale, supportedLocales } from "@/lib/i18n/app-copy-catalog";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import { passwordSecurityError } from "@/lib/security/password";
import type { RoomAccessMode } from "@/lib/types/domain";

// Cele patru moduri ale formularului; un singur formular le servește pe toate.
type AuthMode = "login" | "trial" | "register" | "reset";

// Transformă codul tastat într-un id de document valid (majuscule, fără caractere speciale).
function accessCodeDocumentId(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

// Citește din documentul codului câte utilizări are voie și câte a avut deja.
function accessCodeUsage(data: Record<string, unknown>, role: UserRole) {
  return {
    active: data.active !== false,
    maxUses: readOptionalNumber(data.maxUses) ?? maxUsesForAccessRole(role),
    usedCount: Math.max(0, readOptionalNumber(data.usedCount) ?? 0),
  };
}

// Codes created before expiresAt existed have no such field and never expire
// (grandfathered) - only a code that explicitly carries a past expiresAt is rejected.
function isAccessCodeExpired(data: Record<string, unknown>) {
  const expiresAt = data.expiresAt as { toMillis?: () => number } | undefined;

  if (!expiresAt || typeof expiresAt.toMillis !== "function") {
    return false;
  }

  return expiresAt.toMillis() <= Date.now();
}

// Verifică dacă un cod de acces poate fi folosit (activ, neexpirat, cu utilizări rămase); altfel aruncă o eroare clară.
function assertAccessCodeCanBeUsed(data: Record<string, unknown>, role: UserRole) {
  const usage = accessCodeUsage(data, role);

  if (!usage.active) {
    throw new Error("Codul de acces este oprit. Cere un cod nou de la administrator.");
  }

  if (isAccessCodeExpired(data)) {
    throw new Error("Codul de acces a expirat. Cere un cod nou de la administrator.");
  }

  if (usage.maxUses !== null && usage.usedCount >= usage.maxUses) {
    throw new Error("Codul de acces a fost folosit de numărul maxim de persoane. Cere un cod nou de la administrator.");
  }

  return usage;
}

// Verifică dacă o licență există și nu a fost deja folosită, revendicată, dezactivată sau ștearsă.
function assertLicenseCodeCanBeUsed(exists: boolean, data: Record<string, unknown>) {
  if (!exists || data.used === true || data.claimed === true || data.active === false || data.deleted === true) {
    throw new Error("Codul de licență nu este valid sau a fost folosit deja.");
  }
}

// Curăță numele afișat: fără spații la capete și fără spații duble.
function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

// Cere cel puțin două cuvinte (nume și prenume), fiecare de minimum două litere.
function assertFullName(value: string) {
  const parts = normalizeDisplayName(value).split(" ").filter(Boolean);

  if (parts.length < 2 || parts.some((part) => part.length < 2)) {
    throw new Error("Scrie numele și prenumele.");
  }
}

// Traduce erorile tehnice (Firebase, rețea, timeout) în mesaje ușor de înțeles pentru utilizator.
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

  if (message.includes("auth/weak-password") || message.includes("auth/password-does-not-meet-requirements")) {
    return "Parola este prea slabă. Folosește cel puțin 8 caractere, cu literă mare, literă mică, cifră și caracter special.";
  }

  if (message.includes("Parolele nu se potrivesc")) {
    return "Parolele nu se potrivesc.";
  }

  if (message.includes("Scrie numele și prenumele")) {
    return "Scrie numele și prenumele.";
  }

  return message.replace("Firebase: ", "");
}

// Oprește o promisiune care durează prea mult și o transformă într-o eroare cu mesajul dat.
function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

// Verifică dacă Firebase Auth poate fi contactat, cu o cerere de test care nu poate reuși (cont inexistent).
// Dacă serverul răspunde cu 5xx sau nu răspunde la timp, utilizatorul primește un mesaj despre conexiune.
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

// Trimite emailul de verificare și deconectează utilizatorul (nu rămâne autentificat până nu confirmă emailul).
async function sendVerificationAndSignOut(language: AppLanguage) {
  await sendCustomVerificationEmail(language);
  await signOut(auth);
}

// "sent" = un email nou a plecat; "throttled" = unul a fost trimis cu puțin timp în urmă.
// "sent" = a fresh email went out; "throttled" = one was sent a moment ago.
async function resendVerificationBeforeSignOut(language: AppLanguage): Promise<"sent" | "throttled"> {
  try {
    const result = await sendCustomVerificationEmail(language);
    return result.throttled ? "throttled" : "sent";
  } catch (error) {
    console.error("Emailul de verificare nu a putut fi trimis:", error);
    throw new Error("Emailul de verificare nu a putut fi trimis acum. Încearcă din nou peste câteva minute.");
  } finally {
    await signOut(auth).catch((signOutError) => {
      console.warn("Delogarea după retrimiterea verificării a eșuat:", signOutError);
    });
  }
}

// Apelează funcția cloud care trimite emailul de verificare în limba aleasă.
async function sendCustomVerificationEmail(language: AppLanguage) {
  const sendVerification = httpsCallable<{ language: AppLanguage }, { sent?: boolean; throttled?: boolean }>(
    cloudFunctions,
    "sendAuthVerificationEmail"
  );
  const response = await sendVerification({ language });
  return response.data;
}

// Apelează funcția cloud care trimite emailul de resetare a parolei.
async function sendCustomPasswordResetEmail(email: string, language: AppLanguage) {
  const sendPasswordReset = httpsCallable(cloudFunctions, "sendAuthPasswordResetEmail");
  await sendPasswordReset({ email, language });
}

// Componenta paginii; ține starea formularului și toate acțiunile de autentificare.
export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  // Previne ca un submit în curs să fie întrerupt de deconectarea automată a utilizatorilor neverificați.
  const submittingRef = useRef(false);
  const [emailInput, setEmailInput] = useState("");
  // Firebase Auth lowercases addresses and firestore.rules require the profile's
  // email to equal the token's, so a typed "Dan@Yahoo.com" (or a trailing space)
  // created the account and then got the profile write rejected as a permission error.
  // Emailul folosit în aplicație este mereu normalizat: fără spații, cu litere mici.
  const email = emailInput.trim().toLowerCase();
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

  // Detectează dacă aplicația rulează instalată (PWA/Capacitor), ca să ascundă linkul „înapoi acasă”.
  useEffect(() => {
    const updateShellMode = () => {
      setInstalledAppShell(isInstalledAppShell());
    };
    const delayedUpdate = window.setTimeout(updateShellMode, 250);

    updateShellMode();

    return () => window.clearTimeout(delayedUpdate);
  }, []);

  // Citește din adresă invitația (cod, email, mod, limbă) și precompletează formularul.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitationCode = params.get("invite") || params.get("code") || params.get("cod") || "";
    const invitedEmail = params.get("email") || "";
    const requestedMode = params.get("mode") || "";
    const requestedLanguage = params.has("lang")
      ? normalizeSupportedLocale(params.get("lang"))
      : normalizeSupportedLocale(window.localStorage.getItem("kelunia-language"));

    setLanguage(requestedLanguage);
    window.localStorage.setItem("kelunia-language", requestedLanguage);

    if (requestedMode === "trial") {
      setMode("trial");
    }

    if (invitationCode) {
      setMode("register");
      setAccessCode(invitationCode);
    }

    if (invitedEmail) {
      setEmailInput(invitedEmail);
    }
  }, []);

  // Schimbă limba interfeței, o reține local și o scrie în adresă.
  function changeLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("kelunia-language", nextLanguage);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLanguage);
    window.history.replaceState(null, "", url.toString());
  }

  // Un utilizator cu emailul verificat merge direct în dashboard; unul neverificat este deconectat.
  useEffect(() => {
    if (!authLoading && user?.emailVerified) {
      router.replace("/dashboard");
    }

    // Unverified users do not stay signed in on this screen - except while a
    // submit is running: registering creates the Auth user first and writes its
    // profile right after, and signing it out in between sent that write without a
    // token ("Missing or insufficient permissions"). The submit ends with its own signOut.
    if (!authLoading && user && !user.emailVerified && !submittingRef.current) {
      void signOut(auth);
    }
  }, [authLoading, router, user]);

  // Creează contul cu cod de acces: utilizator Auth, apoi profilul și consumarea codului într-o singură tranzacție.
  // Dacă orice pas eșuează, contul și profilul create pe jumătate sunt șterse.
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
    // Curăță și validează datele primite din cod înainte de a le scrie.
    const cleanLocationId = createdLocationId.trim();
    const cleanGroupName = role === "manager" ? "" : assignedGroupName.trim();
    const cleanAccessCodeId = accessCodeId.trim();
    const cleanRoomAccess = role === "manager" ? "all" : roomAccess;
    const cleanAllowedRoomIds = cleanRoomAccess === "selected" ? normalizeAllowedRoomIds(allowedRoomIds) : [];

    if (!isOwner && !cleanLocationId) {
      throw new Error("Codul de acces nu are o locație setată.");
    }

    if (!isOwner && role !== "manager" && !cleanGroupName) {
      throw new Error("Codul de acces nu are un grup setat. Cere un cod nou de la administrator.");
    }

    // Contul Auth se creează primul; fără el regulile Firestore nu permit scrierea profilului.
    const accessCodeRef = !isOwner && cleanAccessCodeId ? doc(db, "accessCodes", cleanAccessCodeId) : null;
    let profileCreated = false;
    let resolvedLocationName = createdLocationName.trim() || defaultLocationName;
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, "users", result.user.uid);

    try {
      // Pentru un cod de acces, locația trebuie să existe încă; numele ei se ia din document.
      if (!isOwner) {
        const locationSnap = await getDoc(doc(db, "locations", cleanLocationId));

        if (!locationSnap.exists()) {
          throw new Error("Locația acestui cod nu mai există. Cere un cod nou de la administrator.");
        }

        const locationData = locationSnap.data() ?? {};
        resolvedLocationName = String(locationData.name ?? locationData.locationName ?? resolvedLocationName).trim() || resolvedLocationName;
      }

      // Profilul inițial al utilizatorului, așa cum îl cer regulile Firestore.
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
        locationSetupRequired: false,
        usePin: false,
        lockOnHide: false,
        useBiometrics: false,
        language,
        createdAt: Timestamp.now(),
      };

      // Cu cod de acces: profilul și incrementarea utilizărilor se fac atomic, după ce codul este revalidat.
      if (accessCodeRef) {
        // Dacă între timp codul s-a schimbat (rol, locație, grup, camere), înregistrarea este refuzată.
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
      // Fără cod de acces (proprietarul): se scrie doar profilul.
      } else {
        await setDoc(userRef, profilePayload);
      }

      // Profilul e gata; urmează emailul de verificare și deconectarea.
      profileCreated = true;
      await sendVerificationAndSignOut(language);
    // La eroare se șterge ce s-a creat parțial, ca să nu rămână conturi blocate.
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

  // Creează un cont de probă: manager fără locație, care își configurează locația după prima conectare.
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
      await sendVerificationAndSignOut(language);
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

  // Creează un cont manager pe baza unui cod de licență, revendicând licența într-o tranzacție.
  async function createLicensedProfile(licenseId: string, code: string) {
    // Verificare rapidă înainte de a crea contul Auth, ca să nu rămână conturi inutile.
    const licenseRef = doc(db, "licenses", licenseId);
    const preflightLicenseSnap = await getDoc(licenseRef);

    assertLicenseCodeCanBeUsed(preflightLicenseSnap.exists(), preflightLicenseSnap.data() ?? {});

    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, "users", result.user.uid);

    try {
      // Tranzacția scrie profilul și marchează licența ca revendicată; reverificarea evită folosirea dublă a licenței.
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
      await sendVerificationAndSignOut(language);
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

  // Trimiterea formularului: acțiunea depinde de modul curent.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    // Marchează submit-ul ca activ (vezi efectul care deconectează utilizatorii neverificați).
    submittingRef.current = true;

    try {
      await ensureAuthPersistence();

      // Conectare: verifică rețeaua, autentifică, apoi cere emailul verificat.
      if (mode === "login") {
        await verifyFirebaseAuthConnection();
        const credential = await withTimeout(
          signInWithEmailAndPassword(auth, email, password),
          20000,
          "Autentificarea nu a raspuns la timp."
        );

        // Email neverificat: se retrimite verificarea și utilizatorul este deconectat.
        if (!credential.user.emailVerified) {
          const outcome = await resendVerificationBeforeSignOut(language);
          setError(appText(language, outcome === "throttled" ? "auth.unverifiedAlreadySent" : "auth.unverifiedResent"));
          return;
        }

        router.push("/dashboard");
        return;
      }

      // Resetare parolă: trimite emailul de resetare.
      if (mode === "reset") {
        await sendCustomPasswordResetEmail(email, language);
        setMessage(appText(language, "auth.resetSent"));
        return;
      }

      // Cont de probă: validează parolele, numele și parola, apoi creează profilul.
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
        setMessage(appText(language, "auth.verificationSent"));
        return;
      }

      // Înregistrare: validează câmpurile, apoi decide între cod de acces și cod de licență.
      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Parolele nu se potrivesc.");
        }

        assertFullName(displayName);

        const passwordError = passwordSecurityError(password, email);

        if (passwordError) {
          throw new Error(passwordError);
        }

        // Un document accessCodes cu acest id înseamnă cod de acces.
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

        // Cod de acces existent: se citesc rolul, locația, grupul și camerele permise din document.
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
          setMessage(appText(language, "auth.verificationSent"));
          return;
        }

        // Altfel codul este tratat ca licență pentru un manager nou.
        await createLicensedProfile(cleanAccessCode, accessCode.trim());
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setMessage(appText(language, "auth.verificationSent"));
        return;
      }
    // Orice eroare devine un mesaj lizibil; blocarea submit-ului se eliberează mereu.
    } catch (err) {
      setError(readableError(err instanceof Error ? err.message : "A apărut o eroare."));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  // Titlul și subtitlul se aleg după modul curent.
  const title = {
    login: appText(language, "auth.title.login"),
    trial: appText(language, "auth.title.trial"),
    register: appText(language, "auth.title.register"),
    reset: appText(language, "auth.title.reset"),
  }[mode];
  const subtitle = {
    login: appText(language, "auth.subtitle.login"),
    trial: appText(language, "auth.subtitle.trial"),
    register: appText(language, "auth.subtitle.register"),
    reset: appText(language, "auth.subtitle.reset"),
  }[mode];

  // Cât se încarcă sesiunea (sau utilizatorul e deja verificat și va fi redirecționat) se arată ecranul de încărcare.
  if (authLoading || user?.emailVerified) {
    return (
      <main className="loading-screen">
        <div className="loading-logo">
          <img src="/icon-192.png" alt="Kelunia" />
        </div>
        <h1>Kelunia</h1>
        <p>{appText(language, "loading.calendar")}</p>
      </main>
    );
  }

  // Formularul propriu-zis.
  return (
    <main className="auth-shell">
      <section className="auth-card">
        {/* Bara de sus: link înapoi și selectorul de limbă. */}
        <div className="auth-top-row">
          {!installedAppShell && <Link href="/" className="back-link">← {appText(language, "action.backHome")}</Link>}
          <label className="language-selector auth-language-selector">
            {appText(language, "common.language")}
            <select value={language} onChange={(event) => changeLanguage(event.target.value as AppLanguage)}>
              {supportedLocales.map((locale) => (
                <option key={locale.code} value={locale.code}>{locale.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Antetul cardului: sigla, titlul și subtitlul modului. */}
        <div className="auth-card-head">
          <img src="/icon-192.png" alt="Kelunia" />
          <div>
            <span>Kelunia</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>

        {/* Comutator între conectare, cont de probă și înregistrare. */}
        <div className="auth-switcher" role="group" aria-label={appText(language, "auth.type")}>
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">{appText(language, "auth.mode.login")}</button>
          <button className={mode === "trial" ? "active" : ""} onClick={() => setMode("trial")} type="button">{appText(language, "auth.mode.trial")}</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">{appText(language, "auth.mode.code")}</button>
        </div>

        {/* Mesajele de eroare și de succes. */}
        {error && <p className="error-line">{error}</p>}
        {message && <p className="success-line">{message}</p>}

        {/* Câmpurile se afișează în funcție de mod. */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {appText(language, "auth.email")}
            <input
              type="email"
              name="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder={appText(language, "auth.emailPlaceholder")}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              required
            />
          </label>

          {/* Parola (nu se cere la resetare). */}
          {mode !== "reset" && (
            <label>
              {appText(language, "auth.password")}
              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "login" ? appText(language, "auth.loginPasswordPlaceholder") : appText(language, "auth.passwordPlaceholder")}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>
          )}

          {/* Confirmarea parolei (doar la creare de cont). */}
          {(mode === "register" || mode === "trial") && (
            <label>
              {appText(language, "auth.confirmPassword")}
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={appText(language, "auth.confirmPasswordPlaceholder")}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {/* Numele complet (doar la creare de cont). */}
          {(mode === "register" || mode === "trial") && (
            <label>
              {appText(language, "auth.displayName")}
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={appText(language, "auth.displayNamePlaceholder")}
                autoComplete="name"
                required
              />
            </label>
          )}

          {/* Codul de acces sau de licență (doar la înregistrare). */}
          {mode === "register" && (
            <label>
              {appText(language, "auth.accessCode")}
              <input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder={appText(language, "auth.accessCodePlaceholder")}
                required
              />
            </label>
          )}

          {/* Explicația codului de acces. */}
          {mode === "register" && (
            <>
              <p className="muted-note">{appText(language, "auth.accessCodeHelp")}</p>
            </>
          )}

          {/* Butonul principal; textul urmează modul și starea de încărcare. */}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? appText(language, "auth.loading") : mode === "login" ? appText(language, "auth.signIn") : mode === "reset" ? appText(language, "auth.resetSubmit") : mode === "trial" ? appText(language, "auth.trialSubmit") : appText(language, "auth.createAccount")}
          </button>
        </form>

        {/* Link între conectare și resetarea parolei. */}
        <div className="auth-links">
          {mode === "login" ? (
            <button onClick={() => setMode("reset")} type="button">{appText(language, "auth.forgotPassword")}</button>
          ) : (
            <button onClick={() => setMode("login")} type="button">{appText(language, "auth.backToLogin")}</button>
          )}
        </div>
      </section>
    </main>
  );
}
