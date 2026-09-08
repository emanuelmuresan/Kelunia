"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { User } from "firebase/auth";

export type ErrorReport = {
  id: string;
  message: string;
  componentStack: string;
  userMessage: string;
  path: string;
  userAgent: string;
  appVersion: string;
  email: string;
  status: "new" | "resolved";
  createdAt?: unknown;
};

function normalize(id: string, data: Record<string, unknown>): ErrorReport {
  return {
    id,
    message: String(data.message ?? ""),
    componentStack: String(data.componentStack ?? ""),
    userMessage: String(data.userMessage ?? ""),
    path: String(data.path ?? ""),
    userAgent: String(data.userAgent ?? ""),
    appVersion: String(data.appVersion ?? ""),
    email: String(data.email ?? ""),
    status: data.status === "resolved" ? "resolved" : "new",
    createdAt: data.createdAt,
  };
}

type UseErrorReportsParams = {
  db: Firestore;
  user: User | null;
  enabled: boolean;
};

export function useErrorReports({ db, user, enabled }: UseErrorReportsParams) {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setReports([]);
      return;
    }

    return onSnapshot(
      query(collection(db, "errorReports"), orderBy("createdAt", "desc"), limit(50)),
      (snapshot) => {
        setReports(snapshot.docs.map((item) => normalize(item.id, item.data())));
        setError("");
      },
      (snapshotError) => {
        console.warn("Rapoartele de eroare nu au putut fi citite:", snapshotError);
        setError("Rapoartele nu au putut fi citite.");
      }
    );
  }, [db, enabled]);

  async function resolveReport(reportId: string) {
    await updateDoc(doc(db, "errorReports", reportId), {
      status: "resolved",
      resolvedAt: serverTimestamp(),
      resolvedBy: user?.email ?? "",
    });
  }

  return { errorReports: reports, errorReportsError: error, resolveReport };
}
