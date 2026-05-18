import { Capacitor, registerPlugin } from "@capacitor/core";

type NativeBiometricPlugin = {
  isAvailable: () => Promise<{ isAvailable?: boolean; available?: boolean }>;
  verifyIdentity: (options?: {
    title?: string;
    subtitle?: string;
    description?: string;
    reason?: string;
  }) => Promise<unknown>;
};

const NativeBiometric = registerPlugin<NativeBiometricPlugin>("NativeBiometric");
const nativeBiometricMarker = "native";

export async function hashPin(uid: string, pin: string) {
  const bytes = new TextEncoder().encode(`${uid}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const biometricKeyPrefix = "kelunia-biometric-credential:";

function biometricStorageKey(uid: string) {
  return `${biometricKeyPrefix}${uid}`;
}

async function canUseNativeBiometrics() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const availability = await NativeBiometric.isAvailable();
    return Boolean(availability.isAvailable ?? availability.available);
  } catch {
    return false;
  }
}

async function verifyNativeBiometrics() {
  try {
    await NativeBiometric.verifyIdentity({
      title: "Kelunia",
      subtitle: "Deblocare aplicatie",
      description: "Confirma identitatea ca sa continui.",
      reason: "Kelunia este protejata pe acest dispozitiv.",
    });
    return true;
  } catch (error) {
    console.warn("Deblocarea biometrica nativa nu a reusit:", error);
    return false;
  }
}

function randomChallenge() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = Array.from(new Uint8Array(buffer));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBuffer(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function canUseWebBiometrics() {
  if (typeof window === "undefined" || !("PublicKeyCredential" in window) || !navigator.credentials) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function canUsePlatformBiometrics() {
  return (await canUseNativeBiometrics()) || (await canUseWebBiometrics());
}

export async function registerBiometricCredential(uid: string, label: string) {
  if (await canUseNativeBiometrics()) {
    const verified = await verifyNativeBiometrics();

    if (verified) {
      window.localStorage.setItem(biometricStorageKey(uid), nativeBiometricMarker);
      return true;
    }
  }

  if (!(await canUseWebBiometrics())) {
    return false;
  }

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: "Kelunia" },
        user: {
          id: new TextEncoder().encode(uid),
          name: label || "Kelunia",
          displayName: label || "Kelunia",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential?.rawId) {
      return false;
    }

    window.localStorage.setItem(biometricStorageKey(uid), bufferToBase64Url(credential.rawId));
    return true;
  } catch (error) {
    console.warn("Biometria nu a putut fi configurata:", error);
    return false;
  }
}

export async function verifyBiometricCredential(uid: string) {
  const credentialId = window.localStorage.getItem(biometricStorageKey(uid));

  if (!credentialId) {
    return false;
  }

  if (credentialId === nativeBiometricMarker) {
    return verifyNativeBiometrics();
  }

  if (!(await canUseWebBiometrics())) {
    return false;
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [
          {
            id: base64UrlToBuffer(credentialId),
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return Boolean(assertion);
  } catch (error) {
    console.warn("Deblocarea biometrica nu a reusit:", error);
    return false;
  }
}

export function clearBiometricCredential(uid: string) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(biometricStorageKey(uid));
  }
}
