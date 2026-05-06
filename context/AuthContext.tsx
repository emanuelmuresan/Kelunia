"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

export type UserRole = "superadmin" | "admin" | "viewer" | "user";

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

const defaultLocationName = "Sala Regatului Iuliu Maniu 13";
const configuredSuperAdminEmails = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: "viewer",
  isAdmin: false,
  isSuperAdmin: false,
  isOwner: false,
  isViewer: true,
  loading: true,
});

function normalizeRole(role: unknown): UserRole {
  if (role === "superadmin" || role === "admin" || role === "viewer" || role === "user") {
    return role;
  }

  return "viewer";
}

function isConfiguredSuperAdmin(email: string) {
  return configuredSuperAdminEmails.includes(email.toLowerCase());
}

function isOwnerProfile(data: Record<string, unknown>, email: string) {
  const groupName = String(data.groupName ?? data.group ?? "").trim();
  const ownerEmail = String(data.ownerEmail ?? "").trim().toLowerCase();
  const role = normalizeRole(data.role);

  return (
    Boolean(data.isOwner || data.owner || data.isLocationOwner) ||
    ownerEmail === email.toLowerCase() ||
    isConfiguredSuperAdmin(email) ||
    (role === "admin" && groupName.length === 0)
  );
}

async function isLegacyFirstAdmin(uid: string, role: UserRole) {
  if (role !== "admin") {
    return false;
  }

  try {
    const superAdmins = await getDocs(query(collection(db, "users"), where("role", "==", "superadmin")));
    return superAdmins.empty || superAdmins.docs.every((item) => item.id === uid);
  } catch (error) {
    console.warn("Nu am putut verifica superadminii existenți:", error);
    return false;
  }
}

async function isLocationOwner(locationId: string, email: string) {
  if (!locationId) {
    return false;
  }

  try {
    const locationSnap = await getDoc(doc(db, "locations", locationId));
    const ownerEmail = String(locationSnap.data()?.ownerEmail ?? "").trim().toLowerCase();
    return ownerEmail.length > 0 && ownerEmail === email.toLowerCase();
  } catch (error) {
    console.warn("Nu am putut verifica proprietarul locației:", error);
    return false;
  }
}

function buildFallbackProfile(userData: User): UserProfile {
  return {
    uid: userData.uid,
    email: userData.email ?? "",
    displayName: userData.displayName ?? userData.email ?? "Utilizator",
    groupName: "",
    role: "viewer",
    locationId: "main-location",
    locationName: defaultLocationName,
    isOwner: false,
    usePin: false,
    hasPin: false,
    lockOnHide: false,
    useBiometrics: false,
  };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userData) => {
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
        const userSnap = await getDoc(userDocRef);
        const fallback = buildFallbackProfile(userData);

        if (!userSnap.exists()) {
          setProfile(fallback);
          setLoading(false);
          return;
        }

        const data = userSnap.data();
        const email = String(data.email ?? fallback.email);
        const rawRole = normalizeRole(data.role);
        const locationId = String(data.locationId ?? "main-location");
        const ownerProfile =
          isOwnerProfile(data, email) ||
          (await isLocationOwner(locationId, email)) ||
          (await isLegacyFirstAdmin(userData.uid, rawRole));
        const role = ownerProfile ? "superadmin" : rawRole;

        if (ownerProfile && data.role !== "superadmin") {
          setDoc(userDocRef, { role: "superadmin", isOwner: true }, { merge: true }).catch((error) => {
            console.warn("Rolul de proprietar nu a putut fi sincronizat:", error);
          });
        }

        setProfile({
          uid: userData.uid,
          email,
          displayName: String(data.displayName ?? data.name ?? fallback.displayName),
          groupName: role === "superadmin" ? "" : String(data.groupName ?? data.group ?? ""),
          role,
          locationId,
          locationName: String(data.locationName ?? defaultLocationName),
          isOwner: ownerProfile,
          usePin: Boolean(data.usePin),
          hasPin: Boolean(data.pinHash || data.pinSet),
          lockOnHide: Boolean(data.lockOnHide),
          useBiometrics: Boolean(data.useBiometrics),
        });
      } catch (error) {
        console.error("Eroare la citirea profilului:", error);
        setProfile(buildFallbackProfile(userData));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const role = profile?.role ?? "viewer";
  const isOwner = Boolean(profile?.isOwner);
  const isSuperAdmin = isOwner || role === "superadmin";
  const isAdmin = role === "superadmin" || role === "admin";
  const isViewer = !isAdmin;

  return (
    <AuthContext.Provider value={{ user, profile, role, isAdmin, isSuperAdmin, isOwner, isViewer, loading }}>
      {loading ? (
        <div className="loading-screen">
          <div className="loading-logo">
            <img src="/icon-192.png" alt="Kelunia" />
          </div>
          <h1>Kelunia</h1>
          <p>Se încarcă...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
