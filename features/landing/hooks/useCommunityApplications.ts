"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type {
  CommunityApplication,
  CommunityApplicationMessage,
  CommunityApplicationStatus,
} from "@/lib/types/domain";

type UseCommunityApplicationsParams = {
  db: Firestore;
  enabled: boolean;
  user: User | null;
};

type UseCommunityApplicationMessagesParams = {
  db: Firestore;
  applicationId: string;
  enabled: boolean;
};

const communityStatuses: CommunityApplicationStatus[] = [
  "new",
  "reviewed",
  "replied",
  "approved",
  "declined",
];

function normalizeStatus(value: unknown): CommunityApplicationStatus {
  return communityStatuses.includes(value as CommunityApplicationStatus)
    ? (value as CommunityApplicationStatus)
    : "new";
}

function normalizeApplication(id: string, data: Record<string, unknown>): CommunityApplication {
  return {
    id,
    email: String(data.email ?? ""),
    organizationName: String(data.organizationName ?? ""),
    details: String(data.details ?? ""),
    status: normalizeStatus(data.status),
    source: String(data.source ?? ""),
    createdAt: data.createdAt,
    reviewedAt: data.reviewedAt,
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : undefined,
    reviewedByUid: data.reviewedByUid ? String(data.reviewedByUid) : undefined,
    lastReplyAt: data.lastReplyAt,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy ? String(data.updatedBy) : undefined,
    updatedByUid: data.updatedByUid ? String(data.updatedByUid) : undefined,
  };
}

function normalizeMessage(id: string, data: Record<string, unknown>): CommunityApplicationMessage {
  const deliveryStatus =
    data.deliveryStatus === "sent" || data.deliveryStatus === "failed" ? data.deliveryStatus : "pending";

  return {
    id,
    applicationId: String(data.applicationId ?? ""),
    body: String(data.body ?? ""),
    direction: "outbound",
    deliveryStatus,
    fromEmail: String(data.fromEmail ?? ""),
    fromUid: String(data.fromUid ?? ""),
    toEmail: String(data.toEmail ?? ""),
    createdAt: data.createdAt,
    sentAt: data.sentAt,
    failedAt: data.failedAt,
    resendEmailId: data.resendEmailId ? String(data.resendEmailId) : undefined,
    errorMessage: data.errorMessage ? String(data.errorMessage) : undefined,
  };
}

export function useCommunityApplications({ db, enabled, user }: UseCommunityApplicationsParams) {
  const [applications, setApplications] = useState<CommunityApplication[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setApplications([]);
      return;
    }

    const applicationsQuery = query(
      collection(db, "communityApplications"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    return onSnapshot(
      applicationsQuery,
      (snapshot) => {
        setApplications(snapshot.docs.map((item) => normalizeApplication(item.id, item.data())));
        setError("");
      },
      (snapshotError) => {
        console.warn("Cererile Community nu au putut fi citite:", snapshotError);
        setError("Cererile Community nu au putut fi citite.");
      }
    );
  }, [db, enabled]);

  async function markReviewed(applicationId: string) {
    if (!user) {
      return;
    }

    await updateDoc(doc(db, "communityApplications", applicationId), {
      status: "reviewed",
      reviewedAt: serverTimestamp(),
      reviewedBy: user.email ?? "",
      reviewedByUid: user.uid,
      updatedAt: serverTimestamp(),
      updatedBy: user.email ?? "",
      updatedByUid: user.uid,
    });
  }

  async function updateCommunityApplicationStatus(
    applicationId: string,
    status: CommunityApplicationStatus
  ) {
    if (!user) {
      return;
    }

    await updateDoc(doc(db, "communityApplications", applicationId), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: user.email ?? "",
      updatedByUid: user.uid,
    });
  }

  async function sendCommunityApplicationReply(application: CommunityApplication, body: string) {
    if (!user) {
      return;
    }

    const cleanBody = body.trim();

    await addDoc(collection(db, "communityApplications", application.id, "messages"), {
      applicationId: application.id,
      body: cleanBody,
      direction: "outbound",
      deliveryStatus: "pending",
      fromEmail: user.email ?? "",
      fromUid: user.uid,
      toEmail: application.email,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "communityApplications", application.id), {
      status: "replied",
      lastReplyAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: user.email ?? "",
      updatedByUid: user.uid,
    });
  }

  return {
    applications,
    communityApplicationsError: error,
    markCommunityApplicationReviewed: markReviewed,
    sendCommunityApplicationReply,
    updateCommunityApplicationStatus,
  };
}

export function useCommunityApplicationMessages({
  db,
  applicationId,
  enabled,
}: UseCommunityApplicationMessagesParams) {
  const [messages, setMessages] = useState<CommunityApplicationMessage[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !applicationId) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, "communityApplications", applicationId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(snapshot.docs.map((item) => normalizeMessage(item.id, item.data())));
        setError("");
      },
      (snapshotError) => {
        console.warn("Istoricul Community nu a putut fi citit:", snapshotError);
        setError("Istoricul conversației nu a putut fi citit.");
      }
    );
  }, [applicationId, db, enabled]);

  return {
    messages,
    communityMessagesError: error,
  };
}
