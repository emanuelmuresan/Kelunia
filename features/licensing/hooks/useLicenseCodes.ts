"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";

import { normalizeLicenseCode } from "@/lib/licensing";
import type { BillingStatus, LicenseCodeItem, LocationPlan } from "@/lib/types/domain";

export type LicenseCodeDraft = {
  plan: LocationPlan | "";
  locationName: string;
  address: string;
  durationDays: string;
};

export type LicenseCodeUpdateDraft = {
  plan: LocationPlan;
  billingStatus: BillingStatus;
  locationName: string;
  address: string;
  expiryDate: string;
  active: boolean;
};

export type LicenseEmailRequestItem = {
  id: string;
  code: string;
  licenseId: string;
  toEmail: string;
  status: "pending" | "sent" | "failed";
  createdAt?: unknown;
  sentAt?: unknown;
  failedAt?: unknown;
  errorMessage?: string;
};

type UseLicenseCodesParams = {
  db: Firestore;
  isOwner: boolean;
  user: User | null;
};

const defaultDraft: LicenseCodeDraft = {
  plan: "",
  locationName: "",
  address: "",
  durationDays: "",
};

function generateLicenseCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");

  return `LIC-${body.slice(0, 5)}-${body.slice(5, 10)}`;
}

function billingStatusForPlan(plan: LocationPlan): BillingStatus {
  return plan === "trial" ? "trialing" : "active";
}

export function useLicenseCodes({ db, isOwner, user }: UseLicenseCodesParams) {
  const [licenseCodes, setLicenseCodes] = useState<LicenseCodeItem[]>([]);
  const [licenseEmailRequests, setLicenseEmailRequests] = useState<LicenseEmailRequestItem[]>([]);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseDraft, setLicenseDraft] = useState<LicenseCodeDraft>(defaultDraft);
  const [licenseMessage, setLicenseMessage] = useState("");
  const [licenseError, setLicenseError] = useState("");
  const [licenseWorking, setLicenseWorking] = useState(false);

  useEffect(() => {
    if (!user || !isOwner) {
      setLicenseCodes([]);
      return;
    }

    const licensesQuery = query(collection(db, "licenses"), limit(200));

    return onSnapshot(
      licensesQuery,
      (snapshot) => {
        setLicenseCodes(
          snapshot.docs
            .map((item) => normalizeLicenseCode(item.id, item.data()))
            .sort((first, second) => first.code.localeCompare(second.code))
        );
      },
      (error) => {
        console.error("Codurile de licenta nu au putut fi citite:", error);
        setLicenseError("Codurile de licenta nu au putut fi citite. Verifica regulile Firebase.");
      }
    );
  }, [db, isOwner, user]);

  useEffect(() => {
    if (!user || !isOwner) {
      setLicenseEmailRequests([]);
      return;
    }

    const requestsQuery = query(
      collection(db, "licenseEmailRequests"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    return onSnapshot(
      requestsQuery,
      (snapshot) => {
        setLicenseEmailRequests(
          snapshot.docs.map((item) => {
            const data = item.data();
            const status = data.status === "sent" || data.status === "failed" ? data.status : "pending";

            return {
              id: item.id,
              code: String(data.code ?? ""),
              licenseId: String(data.licenseId ?? ""),
              toEmail: String(data.toEmail ?? ""),
              status,
              createdAt: data.createdAt,
              sentAt: data.sentAt,
              failedAt: data.failedAt,
              errorMessage: data.errorMessage ? String(data.errorMessage) : undefined,
            };
          })
        );
      },
      (error) => {
        console.error("Emailurile licentelor nu au putut fi citite:", error);
      }
    );
  }, [db, isOwner, user]);

  function openLicenseCodes() {
    if (!isOwner) {
      return;
    }

    setLicenseDraft(defaultDraft);
    setLicenseError("");
    setLicenseMessage("");
    setShowLicenseModal(true);
  }

  function updateLicenseDraft(nextDraft: LicenseCodeDraft) {
    setLicenseDraft(nextDraft);
  }

  async function copyLicenseCode(code: string) {
    setLicenseError("");
    setLicenseMessage("");

    try {
      await navigator.clipboard.writeText(code);
      setLicenseMessage(`Codul ${code} a fost copiat.`);
    } catch {
      setLicenseError(`Codul este ${code}. Copiaza-l manual daca browserul nu permite copierea automata.`);
    }
  }

  async function createLicenseCode() {
    if (!user || !isOwner) {
      return;
    }

    const address = licenseDraft.address.trim();
    const locationName = licenseDraft.locationName.trim() || address.split(",")[0]?.trim() || "Locatie noua";
    const durationDays = Number.parseInt(licenseDraft.durationDays, 10);
    const selectedPlan = licenseDraft.plan;

    if (!selectedPlan) {
      setLicenseError("Alege planul licentei.");
      return;
    }

    if (!address) {
      setLicenseError("Scrie adresa pentru care generezi licenta.");
      return;
    }

    if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3660) {
      setLicenseError("Valabilitatea trebuie sa fie intre 1 si 3660 zile.");
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const billingStatus = billingStatusForPlan(selectedPlan);

    setLicenseError("");
    setLicenseMessage("");
    setLicenseWorking(true);

    try {
      let createdCode = "";

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const code = generateLicenseCode();
        const licenseRef = doc(db, "licenses", code);
        let collision = false;

        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(licenseRef);

          if (snapshot.exists()) {
            collision = true;
            return;
          }

          transaction.set(licenseRef, {
            code,
            plan: selectedPlan,
            billingStatus,
            intendedLocationName: locationName,
            intendedAddress: address,
            officialAddress: address,
            placeId: "",
            active: true,
            claimed: false,
            used: false,
            claimedBy: "",
            claimedByUid: "",
            usedBy: "",
            usedByUid: "",
            locationId: "",
            locationName: "",
            trialEndsAt: billingStatus === "trialing" ? Timestamp.fromDate(expiresAt) : null,
            subscriptionId: "",
            subscriptionExpiresAt: billingStatus === "active" ? Timestamp.fromDate(expiresAt) : null,
            createdBy: user.email ?? "",
            createdByUid: user.uid,
            createdAt: Timestamp.now(),
            deleted: false,
          });
        });

        if (!collision) {
          createdCode = code;
          break;
        }
      }

      if (!createdCode) {
        throw new Error("Nu s-a putut genera un cod unic.");
      }

      setLicenseDraft(defaultDraft);

      try {
        await navigator.clipboard.writeText(createdCode);
        setLicenseMessage(`Cod de licenta generat si copiat: ${createdCode}`);
      } catch {
        setLicenseMessage(`Cod de licenta generat: ${createdCode}`);
      }
    } catch (error) {
      console.error("Licenta nu a putut fi generata:", error);
      setLicenseError(error instanceof Error ? error.message : "Licenta nu a putut fi generata.");
    } finally {
      setLicenseWorking(false);
    }
  }

  async function toggleLicenseCodeActive(item: LicenseCodeItem) {
    if (!isOwner) {
      return;
    }

    setLicenseError("");
    setLicenseMessage("");

    try {
      await updateDoc(doc(db, "licenses", item.id), {
        active: !item.active,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      });
      setLicenseMessage(!item.active ? "Licenta a fost activata." : "Licenta a fost oprita.");
    } catch (error) {
      console.error("Licenta nu a putut fi schimbata:", error);
      setLicenseError("Licenta nu a putut fi schimbata. Verifica regulile Firebase.");
    }
  }

  async function updateLicenseCode(item: LicenseCodeItem, draft: LicenseCodeUpdateDraft) {
    if (!isOwner || !user) {
      return;
    }

    const locationName = draft.locationName.trim();
    const address = draft.address.trim();
    const expiresAt = draft.expiryDate ? new Date(`${draft.expiryDate}T12:00:00`) : null;

    if (!locationName) {
      setLicenseError("Scrie numele locatiei pentru licenta.");
      return;
    }

    if (!address) {
      setLicenseError("Scrie adresa pentru licenta.");
      return;
    }

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      setLicenseError("Data de expirare nu este valida.");
      return;
    }

    setLicenseError("");
    setLicenseMessage("");
    setLicenseWorking(true);

    try {
      const updatedAt = Timestamp.now();
      const trialEndsAt = draft.billingStatus === "trialing" && expiresAt ? Timestamp.fromDate(expiresAt) : null;
      const subscriptionExpiresAt =
        draft.billingStatus !== "trialing" && expiresAt ? Timestamp.fromDate(expiresAt) : null;
      const batch = writeBatch(db);

      batch.update(doc(db, "licenses", item.id), {
        plan: draft.plan,
        billingStatus: draft.billingStatus,
        intendedLocationName: locationName,
        intendedAddress: address,
        officialAddress: address,
        active: draft.active,
        trialEndsAt,
        subscriptionExpiresAt,
        updatedBy: user.email ?? "",
        updatedAt,
      });

      if (item.locationId) {
        batch.update(doc(db, "locations", item.locationId), {
          name: locationName,
          address,
          officialAddress: address,
          plan: draft.plan,
          billingStatus: draft.billingStatus,
          trialEndsAt,
          subscriptionExpiresAt,
          updatedBy: user.email ?? "",
          updatedAt,
        });
      }

      await batch.commit();
      setLicenseMessage("Licenta a fost actualizata.");
    } catch (error) {
      console.error("Licenta nu a putut fi actualizata:", error);
      setLicenseError("Licenta nu a putut fi actualizata. Verifica regulile Firebase.");
    } finally {
      setLicenseWorking(false);
    }
  }

  async function deleteLicenseCode(item: LicenseCodeItem) {
    if (!isOwner) {
      return;
    }

    setLicenseError("");
    setLicenseMessage("");
    setLicenseWorking(true);

    try {
      await deleteDoc(doc(db, "licenses", item.id));
      setLicenseMessage("Licenta a fost stearsa.");
    } catch (error) {
      console.error("Licenta nu a putut fi stearsa:", error);
      setLicenseError("Licenta nu a putut fi stearsa. Verifica regulile Firebase.");
    } finally {
      setLicenseWorking(false);
    }
  }

  async function sendLicenseEmail(item: LicenseCodeItem, toEmail: string, message: string) {
    if (!isOwner || !user) {
      return;
    }

    const cleanEmail = toEmail.trim();
    const cleanMessage = message.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setLicenseError("Scrie un email valid pentru licenta.");
      return;
    }

    setLicenseError("");
    setLicenseMessage("");
    setLicenseWorking(true);

    try {
      await addDoc(collection(db, "licenseEmailRequests"), {
        licenseId: item.id,
        code: item.code,
        toEmail: cleanEmail,
        message: cleanMessage,
        status: "pending",
        createdAt: serverTimestamp(),
        createdBy: user.email ?? "",
        createdByUid: user.uid,
      });

      setLicenseMessage(`Emailul pentru licenta ${item.code} a fost pus la trimis.`);
    } catch (error) {
      console.error("Emailul licentei nu a putut fi pornit:", error);
      setLicenseError("Emailul licentei nu a putut fi trimis. Verifica regulile Firebase.");
    } finally {
      setLicenseWorking(false);
    }
  }

  return {
    copyLicenseCode,
    createLicenseCode,
    licenseCodes,
    licenseDraft,
    licenseEmailRequests,
    licenseError,
    licenseMessage,
    licenseWorking,
    openLicenseCodes,
    setLicenseError,
    setShowLicenseModal,
    sendLicenseEmail,
    showLicenseModal,
    toggleLicenseCodeActive,
    updateLicenseCode,
    deleteLicenseCode,
    updateLicenseDraft,
  };
}
