"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, type DocumentData, type DocumentReference } from "firebase/firestore";
import { normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import type { RoomAccessMode } from "@/lib/types/domain";

export type UserRole = "manager" | "member" | "guest";
export type AppLanguage = "ro";

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
  lockOnHide: boolean;
  useBiometrics: boolean;
  pendingLicenseId: string;
  locationSetupRequired: boolean;
  accessCodeId: string;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
  language: AppLanguage;
  notifyGroupBookings: boolean;
  notifyWeekBefore: boolean;
  notifyDayBefore: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isViewer: boolean;
  loading: boolean;
}

const defaultLocationName = "Kelunia";
const configuredOwnerEmails = (
  process.env.NEXT_PUBLIC_OWNER_EMAILS ??
  process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS ??
  ""
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: "guest",
  isAdmin: false,
  isSuperAdmin: false,
  isOwner: false,
  isViewer: true,
  loading: true,
});

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
  return language === "ro" ? "ro" : "ro";
}

function isConfiguredOwner(email: string) {
  return configuredOwnerEmails.includes(email.toLowerCase());
}

function isOwnerProfile(data: Record<string, unknown>, email: string) {
  return Boolean(data.isOwner) || isConfiguredOwner(email);
}

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
    lockOnHide: false,
    useBiometrics: false,
    pendingLicenseId: "",
    locationSetupRequired: false,
    accessCodeId: "",
    roomAccess: "all",
    allowedRoomIds: [],
    language: "ro",
    notifyGroupBookings: false,
    notifyWeekBefore: true,
    notifyDayBefore: true,
  };
}

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const authStateResolvedRef = useRef(false);

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

    const unsubscribe = onAuthStateChanged(auth, async (userData) => {
      authStateResolvedRef.current = true;
      window.clearTimeout(authTimeout);
      setLoading(true);

      if (!userData) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(userData);

      try {
        const userDocRef = doc(db, "users", userData.uid);
        let userSnap = await getDoc(userDocRef);
        const fallback = buildFallbackProfile(userData);

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
                notifyWeekBefore: true,
                notifyDayBefore: true,
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
          hasPin: Boolean(data.pinHash || data.pinSet),
          lockOnHide: Boolean(data.lockOnHide),
          useBiometrics: Boolean(data.useBiometrics),
          pendingLicenseId: String(data.pendingLicenseId ?? ""),
          locationSetupRequired: Boolean(data.locationSetupRequired),
          accessCodeId: String(data.accessCodeId ?? ""),
          roomAccess: normalizeRoomAccessMode(data.roomAccess),
          allowedRoomIds: normalizeAllowedRoomIds(data.allowedRoomIds),
          language: normalizeLanguage(data.language),
          notifyGroupBookings: Boolean(data.notifyGroupBookings),
          notifyWeekBefore: data.notifyWeekBefore !== false,
          notifyDayBefore: data.notifyDayBefore !== false,
        });
      } catch (error) {
        console.error("Eroare la citirea profilului:", error);
        setProfile(buildFallbackProfile(userData));
      } finally {
        setLoading(false);
      }
    });

    return () => {
      window.clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  const role = profile?.role ?? "guest";
  const isOwner = Boolean(profile?.isOwner);
  const isSuperAdmin = role === "manager";
  const isAdmin = role === "manager" || role === "member";
  const isViewer = role === "guest";

  return (
    <AuthContext.Provider value={{ user, profile, role, isAdmin, isSuperAdmin, isOwner, isViewer, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
