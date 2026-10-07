"use client";

// Jurnalul de audit în interfață: scrie înregistrări la fiecare modificare (recordAuditLog) și citește ultimele 50 pentru fereastra de istoric.
// Doar proprietarul și managerii pot citi istoricul; scrierea merge doar online, iar o eroare de audit nu oprește acțiunea principală.
import { useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { writeAuditLog, type AuditAction, type AuditEntityType } from "@/lib/audit";
import type { AuditLogItem } from "@/lib/types/domain";

// Datele minime ale profilului folosite ca autor și parametrii hook-ului.
type ProfileLike = {
  displayName: string;
  email: string;
};

interface UseAuditLogsParams {
  db: Firestore;
  user: User | null;
  profile: ProfileLike | null;
  isOwner: boolean;
  isSuperAdmin: boolean;
  currentLocationId: string;
  locationName: string;
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;
}

// Hook-ul auditului.
export function useAuditLogs({
  db,
  user,
  profile,
  isOwner,
  isSuperAdmin,
  currentLocationId,
  locationName,
  isOnline,
  setIsOnline,
}: UseAuditLogsParams) {
  // Starea: înregistrările, încărcarea, eroarea și fereastra de istoric.
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Scrie o înregistrare: cine, ce entitate, ce acțiune, starea de dinainte și de după; fără rețea nu face nimic.
  async function recordAuditLog(
    entityType: AuditEntityType,
    action: AuditAction,
    entityId: string,
    before: unknown,
    after: unknown,
    auditLocationId = currentLocationId,
    auditLocationName = locationName
  ) {
    const connected =
      typeof navigator === "undefined" ? isOnline : navigator.onLine;

    if (!user || !auditLocationId || !entityId || !connected) {
      if (!connected) {
        setIsOnline(false);
      }

      return;
    }

    try {
      await writeAuditLog(db, {
        locationId: auditLocationId,
        locationName: auditLocationName,
        entityType,
        entityId,
        action,
        actor: {
          uid: user.uid,
          email: user.email ?? "",
          name: profile?.displayName || user.email || "Utilizator",
        },
        before,
        after,
      });
    } catch (error) {
      console.warn("Audit log nu a putut fi salvat:", error);
    }
  }

  // Încarcă ultimele 50 de înregistrări ale locației curente, cele mai noi primele.
  async function loadAuditLogs() {
    if (!user || (!isOwner && !isSuperAdmin) || !currentLocationId) {
      setAuditLogs([]);
      return;
    }

    setAuditLoading(true);
    setAuditError("");

    try {
      const snapshot = await getDocs(
        query(
          collection(db, "auditLogs"),
          where("locationId", "==", currentLocationId),
          orderBy("createdAt", "desc"),
          limit(50)
        )
      );

      setAuditLogs(
        snapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            locationId: String(data.locationId ?? ""),
            locationName: String(data.locationName ?? ""),
            entityType: String(data.entityType ?? "settings") as AuditEntityType,
            entityId: String(data.entityId ?? ""),
            action: String(data.action ?? "update") as AuditAction,
            actorName: String(data.actorName ?? ""),
            actorEmail: String(data.actorEmail ?? ""),
            createdAt: data.createdAt,
          };
        })
      );
    } catch (error) {
      console.warn("Istoricul nu a putut fi citit:", error);
      setAuditError("Istoricul modificărilor nu a putut fi citit încă.");
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }

  // Deschide fereastra de istoric și încarcă înregistrările.
  function openAuditHistory() {
    setShowAuditModal(true);
    void loadAuditLogs();
  }

  return {
    auditLogs,
    auditLoading,
    auditError,
    showAuditModal,
    setShowAuditModal,
    recordAuditLog,
    loadAuditLogs,
    openAuditHistory,
  };
}