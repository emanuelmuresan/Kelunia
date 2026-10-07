"use client";

// Newsletter-ul, pentru proprietar: abonații (cei mai noi 200) și campaniile (ultimele 20) în timp real, plus crearea unei campanii.
// Campania se scrie cu starea „pending”; trimiterea emailurilor o face o funcție cloud care actualizează starea.
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type {
  NewsletterCampaign,
  NewsletterCampaignStatus,
  NewsletterSubscriber,
} from "@/lib/types/domain";

// Parametrii: baza de date, dacă hook-ul este activ (proprietar) și utilizatorul.
type UseNewsletterParams = {
  db: Firestore;
  enabled: boolean;
  user: User | null;
};

// Stările posibile ale unei campanii; o valoare necunoscută devine „pending”.
const campaignStatuses: NewsletterCampaignStatus[] = [
  "pending",
  "sending",
  "sent",
  "partial",
  "failed",
];

function normalizeCampaignStatus(value: unknown): NewsletterCampaignStatus {
  return campaignStatuses.includes(value as NewsletterCampaignStatus)
    ? (value as NewsletterCampaignStatus)
    : "pending";
}

// Normalizează documentele de abonat și de campanie din Firestore.
function normalizeSubscriber(id: string, data: Record<string, unknown>): NewsletterSubscriber {
  return {
    id,
    email: String(data.email ?? ""),
    emailKey: String(data.emailKey ?? id),
    source: String(data.source ?? "landing-newsletter"),
    status: data.status === "inactive" ? "inactive" : "active",
    unsubscribed: data.unsubscribed === true,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function normalizeCampaign(id: string, data: Record<string, unknown>): NewsletterCampaign {
  return {
    id,
    subject: String(data.subject ?? ""),
    body: String(data.body ?? ""),
    status: normalizeCampaignStatus(data.status),
    recipientCount: Number(data.recipientCount ?? 0),
    sentCount: Number(data.sentCount ?? 0),
    failedCount: Number(data.failedCount ?? 0),
    createdAt: data.createdAt,
    completedAt: data.completedAt,
    createdBy: data.createdBy ? String(data.createdBy) : undefined,
    createdByUid: data.createdByUid ? String(data.createdByUid) : undefined,
    recipientEmail: data.recipientEmail ? String(data.recipientEmail) : undefined,
    errorMessage: data.errorMessage ? String(data.errorMessage) : undefined,
  };
}

// Hook-ul newsletter-ului.
export function useNewsletter({ db, enabled, user }: UseNewsletterParams) {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [error, setError] = useState("");

  // Abonare în timp real la abonați, doar când hook-ul este activ.
  useEffect(() => {
    if (!enabled) {
      setSubscribers([]);
      return;
    }

    const subscribersQuery = query(
      collection(db, "newsletterSubscribers"),
      orderBy("createdAt", "desc"),
      limit(200)
    );

    return onSnapshot(
      subscribersQuery,
      (snapshot) => {
        setSubscribers(snapshot.docs.map((item) => normalizeSubscriber(item.id, item.data())));
        setError("");
      },
      (snapshotError) => {
        console.warn("Lista de newsletter nu a putut fi citită:", snapshotError);
        setError("Lista de newsletter nu a putut fi citită.");
      }
    );
  }, [db, enabled]);

  // Abonare în timp real la campanii.
  useEffect(() => {
    if (!enabled) {
      setCampaigns([]);
      return;
    }

    const campaignsQuery = query(
      collection(db, "newsletterCampaigns"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    return onSnapshot(
      campaignsQuery,
      (snapshot) => {
        setCampaigns(snapshot.docs.map((item) => normalizeCampaign(item.id, item.data())));
        setError("");
      },
      (snapshotError) => {
        console.warn("Campaniile newsletter nu au putut fi citite:", snapshotError);
        setError("Campaniile newsletter nu au putut fi citite.");
      }
    );
  }, [db, enabled]);

  // Creează o campanie nouă (subiect, text și, opțional, un singur destinatar pentru test).
  async function sendNewsletterCampaign(subject: string, body: string, recipientEmail = "") {
    if (!user) {
      return;
    }

    const cleanRecipientEmail = recipientEmail.trim().toLowerCase();
    const campaignData: Record<string, unknown> = {
      subject: subject.trim(),
      body: body.trim(),
      status: "pending",
      createdAt: serverTimestamp(),
      createdBy: user.email ?? "",
      createdByUid: user.uid,
    };

    if (cleanRecipientEmail) {
      campaignData.recipientEmail = cleanRecipientEmail;
    }

    await addDoc(collection(db, "newsletterCampaigns"), campaignData);
  }

  return {
    newsletterSubscribers: subscribers,
    newsletterCampaigns: campaigns,
    newsletterError: error,
    sendNewsletterCampaign,
  };
}
