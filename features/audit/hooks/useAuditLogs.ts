"use client";

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
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [showAuditModal, setShowAuditModal] = useState(false);

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