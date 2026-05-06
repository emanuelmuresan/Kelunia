"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { addDoc, collection, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserRole } from "@/context/AuthContext";

type AuthMode = "login" | "register" | "location" | "reset";

const defaultLocationName = "Sala Regatului Iuliu Maniu 13";

function normalizeRole(role: unknown): UserRole {
  if (role === "superadmin" || role === "admin" || role === "viewer" || role === "user") {
    return role;
  }

  return "viewer";
}

function readableError(message: string) {
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
    return "Emailul sau parola nu sunt corecte.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "Există deja un cont cu acest email.";
  }

  if (message.includes("auth/weak-password")) {
    return "Parola trebuie să aibă cel puțin 6 caractere.";
  }

  return message.replace("Firebase: ", "");
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [locationName, setLocationName] = useState(defaultLocationName);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function createProfile(role: UserRole, createdLocationName: string, createdLocationId = "main-location", isOwner = false) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      email,
      displayName: displayName.trim() || email,
      groupName: role === "superadmin" ? "" : groupName.trim(),
      role,
      isOwner,
      locationId: createdLocationId,
      locationName: createdLocationName,
      usePin: false,
      lockOnHide: false,
      useBiometrics: false,
      createdAt: Timestamp.now(),
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/");
        return;
      }

      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setMessage("Emailul de resetare a fost trimis.");
        return;
      }

      if (mode === "register") {
        const codesSnap = await getDoc(doc(db, "settings", "auth_codes"));
        const codes = codesSnap.data() ?? {};
        const adminCode = String(codes.adminCode ?? "");
        const viewerCode = String(codes.viewerCode ?? codes.userCode ?? "");
        const superadminCode = String(codes.superadminCode ?? "");
        const locationCodes = Array.isArray(codes.locationCodes) ? codes.locationCodes : [];
        const matchedLocationCode = locationCodes.find((item) => {
          const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return String(record.code ?? "") === accessCode;
        }) as Record<string, unknown> | undefined;

        let role: UserRole = "viewer";
        let createdLocationId = "main-location";
        let createdLocationName = defaultLocationName;

        if (matchedLocationCode) {
          role = normalizeRole(matchedLocationCode.role);
          createdLocationId = String(matchedLocationCode.locationId ?? createdLocationId);
          createdLocationName = String(matchedLocationCode.locationName ?? createdLocationName);
        } else if (accessCode && accessCode === superadminCode) {
          role = "superadmin";
        } else if (accessCode && accessCode === adminCode) {
          role = "admin";
        } else if (accessCode && accessCode === viewerCode) {
          role = "viewer";
        } else {
          throw new Error("Cod de acces invalid.");
        }

        await createProfile(role, createdLocationName, createdLocationId);
        router.push("/");
        return;
      }

      const locationRef = await addDoc(collection(db, "locations"), {
        name: locationName.trim() || defaultLocationName,
        ownerEmail: email,
        createdAt: Timestamp.now(),
      });

      await createProfile("superadmin", locationName.trim() || defaultLocationName, locationRef.id, true);
      router.push("/");
    } catch (err) {
      setError(readableError(err instanceof Error ? err.message : "A apărut o eroare."));
    } finally {
      setLoading(false);
    }
  }

  const title = {
    login: "Intră în Kelunia",
    register: "Cont cu cod",
    location: "Locație nouă",
    reset: "Recuperare parolă",
  }[mode];

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <Link href="/" className="back-link">← Calendar</Link>
        <div>
          <span className="eyebrow">Kelunia</span>
          <h1>Kelunia</h1>
          <p>Programări, săli, grupuri și acces pentru fiecare locație.</p>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card-head">
          <img src="/icon-192.png" alt="Kelunia" />
          <div>
            <span className="eyebrow">Autentificare</span>
            <h2>{title}</h2>
          </div>
        </div>

        <div className="auth-switcher" role="group" aria-label="Tip cont">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Login</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Cod</button>
          <button className={mode === "location" ? "active" : ""} onClick={() => setMode("location")} type="button">Locație</button>
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
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>
          )}

          {(mode === "register" || mode === "location") && (
            <>
              <label>
                Nume
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
              </label>
              <label>
                Grup
                <input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
              </label>
            </>
          )}

          {mode === "register" && (
            <label>
              Cod acces
              <input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} required />
            </label>
          )}

          {mode === "location" && (
            <label>
              Nume locație
              <input value={locationName} onChange={(event) => setLocationName(event.target.value)} required />
            </label>
          )}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Se procesează..." : mode === "login" ? "Intră în cont" : mode === "reset" ? "Trimite email" : "Creează cont"}
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
