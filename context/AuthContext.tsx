"use client";

// Contextul de autentificare: ține utilizatorul Firebase și profilul lui din Firestore (users/{uid}) și derivă rolurile.
// Folosit în toată aplicația prin hook-ul useAuth().
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { appCheckReadyPromise, auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, type DocumentData, type DocumentReference } from "firebase/firestore";
import { normalizeSupportedLocale, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import { normalizeNotificationOffsetRules, normalizeNotificationOffsets, notificationOffsetToKey } from "@/lib/notifications";
import type { RoomAccessMode } from "@/lib/types/domain";

// Rolurile aplicației și limba interfeței.
export type UserRole = "manager" | "member" | "guest";
export type AppLanguage = SupportedLocale;

// Profilul utilizatorului așa cum îl folosește interfața (câmpurile brute din Firestore sunt normalizate).
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  groupName: string;
  role: UserRole;
  locationId: string;
  locationName: string;
  isOwner: boolean;
  usePin: boolean;
  hasPin: boolean;
  pinResetRequired: boolean;
  lockOnHide: boolean;
  useBiometrics: boolean;
  pendingLicenseId: string;
  locationSetupRequired: boolean;
  accessCodeId: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
  language: AppLanguage;
  notifyGroupBookings: boolean;
  notifyFixedGroupSchedules: boolean;
  notifyWeekBefore: boolean;
  notifyDayBefore: boolean;
  notifyOffsets: string[];
  notifyOffsetsDays: number[];
}

// Valoarea expusă de context: utilizatorul, profilul, rolurile derivate, starea de încărcare și actualizarea locală a profilului.
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isViewer: boolean;
  loading: boolean;
  // Codul erorii dacă profilul nu a putut fi citit (altfel șir gol) și funcția care reia citirea.
  profileError: string;
  reloadProfile: () => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
}

// Proprietarul platformei se recunoaște după emailurile din variabila de mediu și/sau după câmpul isOwner din profil.
const defaultLocationName = "Kelunia";
const configuredOwnerEmails = (
  process.env.NEXT_PUBLIC_OWNER_EMAILS ??
  process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS ??
  ""
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

// Valoarea implicită: neconectat, rol de vizitator, în curs de încărcare.
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: "guest",
  isAdmin: false,
  isSuperAdmin: false,
  isOwner: false,
  isViewer: true,
  loading: true,
  profileError: "",
  reloadProfile: () => undefined,
  updateProfile: () => undefined,
});

// Acceptă și numele vechi ale rolurilor (superadmin, admin, viewer, user) și le mapează pe cele curente.
function normalizeRole(role: unknown): UserRole {
  if (role === "manager" || role === "superadmin") {
    return "manager";
  }

  if (role === "member" || role === "admin") {
    return "member";
  }

  if (role === "guest" || role === "viewer" || role === "user") {
    return "guest";
  }

  return "guest";
}

function normalizeLanguage(language: unknown): AppLanguage {
  return normalizeSupportedLocale(language);
}

// Verificări pentru proprietar.
function isConfiguredOwner(email: string) {
  return configuredOwnerEmails.includes(email.toLowerCase());
}

function isOwnerProfile(data: Record<string, unknown>, email: string) {
  return Boolean(data.isOwner) || isConfiguredOwner(email);
}

// Profil minimal folosit când documentul din Firestore lipsește sau nu poate fi citit.
function buildFallbackProfile(userData: User): UserProfile {
  return {
    uid: userData.uid,
    email: userData.email ?? "",
    displayName: userData.displayName ?? userData.email ?? "Utilizator",
    groupName: "",
    role: "guest",
    locationId: "main-location",
    locationName: defaultLocationName,
    isOwner: false,
    usePin: false,
    hasPin: false,
    pinResetRequired: false,
    lockOnHide: false,
    useBiometrics: false,
    pendingLicenseId: "",
    locationSetupRequired: false,
    accessCodeId: "",
    roomAccess: "all",
    allowedRoomIds: [],
    language: "ro",
    notifyGroupBookings: false,
    notifyFixedGroupSchedules: false,
    notifyWeekBefore: true,
    notifyDayBefore: true,
    notifyOffsets: ["1d", "7d"],
    notifyOffsetsDays: [1, 7],
  };
}

// Așteaptă (cel mult ~3 secunde) apariția documentului de profil imediat după înregistrare.
function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForUserDocument(userDocRef: DocumentReference<DocumentData>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(150);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      return userSnap;
    }
  }

  return null;
}

// Provider: urmărește starea autentificării și încarcă profilul.
// Marcaj în sessionStorage: dacă citirea profilului a eșuat, pagina se reîncarcă o singură dată.
const profileReloadKey = "kelunia-profile-reloaded";

// Canalul prin care filele deschise ale aplicației își răspund una alteia (pentru a număra filele la diagnosticarea erorii de profil).
const tabProbeChannelName = "kelunia-tab-probe";

// Câte alte file ale aplicației sunt deschise acum (răspund în 400 ms).
function countOtherTabs() {
  return new Promise<number>((resolve) => {
    if (typeof BroadcastChannel === "undefined") {
      resolve(0);
      return;
    }

    const channel = new BroadcastChannel(tabProbeChannelName);
    let replies = 0;
    channel.onmessage = (event) => {
      if (event.data === "pong") {
        replies += 1;
      }
    };
    channel.postMessage("ping");
    window.setTimeout(() => {
      channel.close();
      resolve(replies);
    }, 400);
  });
}

// Detalii scurte pentru ecranul de eroare al profilului, ca o problemă rară să poată fi diagnosticată dintr-o captură de ecran:
// starea jetonului (emailul verificat în jeton), o citire directă prin API-ul REST cu același jeton (dacă reușește, clientul Firestore
// din pagină este cel blocat, nu regulile sau jetonul) și numărul de file deschise.
async function describeProfileFailure(userData: User) {
  const parts = [`online=${navigator.onLine}`];

  try {
    const token = await userData.getIdTokenResult(true);
    parts.push(`email_verified=${String(token.claims.email_verified)}`, `jeton=${token.issuedAtTime.slice(11, 19)}`);

    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userData.uid}`,
        { headers: { Authorization: `Bearer ${token.token}` } }
      );
      parts.push(`rest=${response.status}`);
    } catch {
      parts.push("rest=retea");
    }
  } catch (tokenError) {
    parts.push(`jeton=${String((tokenError as { code?: string }).code ?? "eroare")}`);
  }

  parts.push(`file=${(await countOtherTabs()) + 1}`);

  return parts.join(" · ");
}

// Citește profilul propriu. Dacă Firestore îl refuză (jeton vechi sau invalidat, de exemplu după resetarea parolei,
// sau o cerere trimisă înainte ca App Check să fie gata), reîmprospătează jetonul și încearcă din nou de câteva ori
// înainte de a renunța; dacă jetonul nu se mai poate reîmprospăta (sesiune revocată), utilizatorul este deconectat.
async function readUserDocument(userData: User, userDocRef: DocumentReference<DocumentData>) {
  const retryableCodes = ["permission-denied", "unauthenticated", "unavailable"];
  const revokedTokenCodes = ["auth/user-token-expired", "auth/invalid-user-token", "auth/user-disabled", "auth/user-not-found"];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await getDoc(userDocRef);
    } catch (error) {
      const code = String((error as { code?: string }).code ?? "");

      if (attempt >= 3 || !retryableCodes.includes(code)) {
        throw error;
      }

      try {
        await userData.getIdToken(true);
      } catch (tokenError) {
        if (revokedTokenCodes.includes(String((tokenError as { code?: string }).code ?? ""))) {
          await signOut(auth).catch(() => undefined);
        }

        throw error;
      }

      await wait(500 * (attempt + 1));
    }
  }
}

export const AuthProvider =({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const authStateResolvedRef = useRef(false);

  // Răspunde la sondajele altor file (vezi describeProfileFailure).
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(tabProbeChannelName);
    channel.onmessage = (event) => {
      if (event.data === "ping") {
        channel.postMessage("pong");
      }
    };

    return () => channel.close();
  }, []);

  // Dacă Firebase nu răspunde în 6 secunde, aplicația continuă ca neconectată în loc să rămână blocată.
  useEffect(() => {
    const authTimeout = window.setTimeout(() => {
      if (authStateResolvedRef.current) {
        return;
      }

      console.warn("Kelunia auth init timed out; continuing without a resolved Firebase user.");
      authStateResolvedRef.current = true;
      setUser(null);
      setProfile(null);
      setLoading(false);
    }, 6000);

    // La orice schimbare a autentificării: fără utilizator se golește starea, altfel se încarcă profilul.
    const unsubscribe = onAuthStateChanged(auth, async (userData) => {
      authStateResolvedRef.current = true;
      window.clearTimeout(authTimeout);
      setLoading(true);
      setProfileError("");

      if (!userData) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(userData);

      try {
        // On native (Android/iOS), App Check needs a couple of seconds to attest the
        // device via Play Integrity/App Attest before Firestore will accept requests
        // (it's enforced). Reading the profile before that resolves used to race
        // ahead and get hard permission-denied. See lib/firebase.js for details.
        await appCheckReadyPromise;

        // Profilul se citește după ce App Check este gata, altfel Firestore respinge cererea.
        const userDocRef = doc(db, "users", userData.uid);
        let userSnap = await readUserDocument(userData, userDocRef);
        const fallback = buildFallbackProfile(userData);

        // Profil lipsă: proprietarul configurat este recreat automat; ceilalți așteaptă puțin și apoi primesc profilul minimal.
        if (!userSnap.exists()) {
          if (isConfiguredOwner(fallback.email)) {
            const ownerFallback: UserProfile = {
              ...fallback,
              role: "manager",
              isOwner: true,
              locationId: "",
              locationName: defaultLocationName,
              groupName: "",
            };

            setDoc(
              userDocRef,
              {
                uid: userData.uid,
                email: fallback.email,
                displayName: fallback.displayName,
                groupName: "",
                role: "manager",
                isOwner: true,
                locationId: "",
                locationName: defaultLocationName,
                usePin: false,
                lockOnHide: false,
                useBiometrics: false,
                pendingLicenseId: "",
                locationSetupRequired: false,
                accessCodeId: "",
                roomAccess: "all",
                allowedRoomIds: [],
                language: "ro",
                notifyGroupBookings: false,
                notifyFixedGroupSchedules: false,
                notifyWeekBefore: true,
                notifyDayBefore: true,
                notifyOffsets: ["1d", "7d"],
                notifyOffsetsDays: [1, 7],
              },
              { merge: true }
            ).catch((error) => {
              console.warn("Profilul de owner nu a putut fi recreat automat:", error);
            });

            setProfile(ownerFallback);
            setLoading(false);
            return;
          }

          const delayedUserSnap = await waitForUserDocument(userDocRef);

          if (!delayedUserSnap) {
            setProfile(fallback);
            setLoading(false);
            return;
          }

          userSnap = delayedUserSnap;
        }

        // Profilul existent se normalizează câmp cu câmp (valori implicite, roluri vechi, momente de notificare).
        const data = userSnap.data();

        if (!data) {
          setProfile(fallback);
          setLoading(false);
          return;
        }

        const email = String(data.email ?? fallback.email);
        const rawRole = normalizeRole(data.role);
        const ownerProfile = isOwnerProfile(data, email);
        const locationId = ownerProfile ? "" : String(data.locationId ?? "main-location");
        const role = ownerProfile ? "manager" : rawRole;

        // Dacă documentul proprietarului nu are rolul/câmpurile corecte, se sincronizează în fundal.
        if (
          ownerProfile &&
          (normalizeRole(data.role) !== "manager" ||
            data.isOwner !== true ||
            data.locationId ||
            data.groupName)
        ) {
          setDoc(
            userDocRef,
            {
              role: "manager",
              isOwner: true,
              locationId: "",
              locationName: defaultLocationName,
              groupName: "",
            },
            { merge: true }
          ).catch((error) => {
            console.warn("Rolul de proprietar nu a putut fi sincronizat:", error);
          });
        }

        // Profilul final expus aplicației.
        try {
          window.sessionStorage.removeItem(profileReloadKey);
        } catch {
          // ignorat
        }

        setProfile({
          uid: userData.uid,
          email,
          displayName: String(data.displayName ?? data.name ?? fallback.displayName),
          groupName: ownerProfile ? "" : String(data.groupName ?? data.group ?? ""),
          role,
          locationId,
          locationName: String(data.locationName ?? defaultLocationName),
          isOwner: ownerProfile,
          usePin: Boolean(data.usePin),
          hasPin: Boolean(data.pinSet),
          pinResetRequired: Boolean(data.pinResetRequired),
          lockOnHide: Boolean(data.lockOnHide),
          useBiometrics: Boolean(data.useBiometrics),
          pendingLicenseId: String(data.pendingLicenseId ?? ""),
          locationSetupRequired: Boolean(data.locationSetupRequired),
          accessCodeId: String(data.accessCodeId ?? ""),
          roomAccess: normalizeRoomAccessMode(data.roomAccess),
          allowedRoomIds: normalizeAllowedRoomIds(data.allowedRoomIds),
          language: normalizeLanguage(data.language),
          notifyGroupBookings: Boolean(data.notifyGroupBookings),
          notifyFixedGroupSchedules: Boolean(data.notifyFixedGroupSchedules),
          notifyWeekBefore: data.notifyWeekBefore !== false,
          notifyDayBefore: data.notifyDayBefore !== false,
          notifyOffsets: normalizeNotificationOffsetRules(data.notifyOffsets).length > 0
            ? normalizeNotificationOffsetRules(data.notifyOffsets).map(notificationOffsetToKey)
            : normalizeNotificationOffsets(data.notifyOffsetsDays).length > 0
              ? normalizeNotificationOffsets(data.notifyOffsetsDays).map((value) => `${value}d`)
              : [
                ...(data.notifyDayBefore !== false ? ["1d"] : []),
                ...(data.notifyWeekBefore !== false ? ["7d"] : []),
              ],
          notifyOffsetsDays: normalizeNotificationOffsets(data.notifyOffsetsDays).length > 0
            ? normalizeNotificationOffsets(data.notifyOffsetsDays)
            : [
              ...(data.notifyDayBefore !== false ? [1] : []),
              ...(data.notifyWeekBefore !== false ? [7] : []),
            ],
        });
      // La eroare de citire se folosește profilul minimal, ca aplicația să rămână utilizabilă.
      } catch (error) {
        console.error("Eroare la citirea profilului:", error);

        // O singură reîncărcare automată a paginii: un client Firestore nou preia sesiunea curentă de la zero (o stare blocată
        // după deconectări repetate se rezolvă așa). Marcajul din sessionStorage împiedică o buclă de reîncărcări.
        try {
          if (window.sessionStorage.getItem(profileReloadKey) !== "1") {
            window.sessionStorage.setItem(profileReloadKey, "1");
            window.location.reload();
            return;
          }
        } catch {
          // fără sessionStorage nu se reîncarcă automat
        }

        const errorCode = String((error as { code?: string }).code ?? (error as { message?: string }).message ?? "necunoscută");
        setProfileError(errorCode);

        // Detaliile de diagnostic se adaugă după ce sunt calculate (câteva sute de milisecunde).
        void describeProfileFailure(userData).then((details) => {
          if (auth.currentUser?.uid === userData.uid) {
            setProfileError(`${errorCode} (${details})`);
          }
        });

        // Dacă între timp sesiunea a fost închisă (jeton revocat), ascultătorul de mai sus a golit deja starea.
        if (auth.currentUser?.uid === userData.uid) {
          setProfile(buildFallbackProfile(userData));
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      window.clearTimeout(authTimeout);
      unsubscribe();
    };
  }, [reloadKey]);

  // Reia citirea profilului (butonul „Reîncearcă” de pe ecranul de eroare).
  const reloadProfile = useCallback(() => setReloadKey((current) => current + 1), []);

  // Rolurile derivate din profil.
  const role = profile?.role ?? "guest";
  const isOwner = Boolean(profile?.isOwner);
  const isSuperAdmin = role === "manager";
  const isAdmin = role === "manager" || role === "member";
  const isViewer = role === "guest";

  // Profilul se citește o dată la autentificare; după ce utilizatorul își salvează setările, apelantul îl oglindește aici.
  // The profile is read once at sign-in; after the user saves their own settings
  // the caller mirrors the saved fields here so language/name/group apply at once.
  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((current) => (current ? { ...current, ...patch } : current));
  }, []);

  // Furnizează valorile către întreaga aplicație.
  return (
    <AuthContext.Provider value={{ user, profile, role, isAdmin, isSuperAdmin, isOwner, isViewer, loading, profileError, reloadProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook de acces la contextul de autentificare.
export const useAuth = () => useContext(AuthContext);
