"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface Feedback {
  id: string;
  message: string;
  email: string;
  userId?: string;
  userName?: string;
  createdAt: Timestamp;
  status: "new" | "reviewed" | "responded";
  ownerResponse?: string;
  respondedAt?: Timestamp;
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isOwner = user?.email === "emanuelmuresan@gmail.com";

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [ownerResponse, setOwnerResponse] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Load feedback
  useEffect(() => {
    if (!db) return;

    const feedbackQuery = query(
      collection(db, "feedback"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const feedbackData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Feedback));

      setFeedback(feedbackData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    // Non-logged users must provide email
    if (!user && !userEmail.trim()) {
      alert("Te rog introdu un email pentru a trimite feedback.");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "feedback"), {
        message: newMessage,
        email: user?.email || userEmail,
        userId: user?.uid || null,
        userName: user?.displayName || null,
        createdAt: Timestamp.now(),
        status: "new",
      });

      setNewMessage("");
      setUserEmail("");

      // Notify owner
      await fetch("/api/notifications/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email || userEmail,
          message: newMessage,
          userId: user?.uid || null,
        }),
      });

      alert("Mulțumim pentru feedback! Am primit mesajul tău.");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("A apărut o eroare. Te rog încearcă din nou.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerResponse = async (feedbackId: string) => {
    if (!ownerResponse.trim() || !isOwner) return;

    try {
      await updateDoc(doc(db, "feedback", feedbackId), {
        ownerResponse,
        respondedAt: Timestamp.now(),
        status: "responded",
      });

      setOwnerResponse("");
      setRespondingId(null);

      // Send notification to user about response
      const feedbackItem = feedback.find((f) => f.id === feedbackId);
      if (feedbackItem) {
        await fetch("/api/notifications/feedback-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: feedbackItem.email,
            response: ownerResponse,
          }),
        });
      }
    } catch (error) {
      console.error("Error responding to feedback:", error);
      alert("A apărut o eroare. Te rog încearcă din nou.");
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="feedback-loading">Loading...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="feedback-container">
        <div className="feedback-header">
          <h1>Sugestii și Recomandări</h1>
          <p>
            Ideile tale îl ajută pe Kelunia să devină mai bun. Orice feedback este binevenit!
          </p>
        </div>

        {/* Submit feedback form */}
        <div className="feedback-form-section">
          <h2>Trimite-ți feedbackul</h2>
          <form onSubmit={handleSubmitFeedback} className="feedback-form">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Scrie aici ideea, sugestia sau problema pe care o întâmpini..."
              className="feedback-textarea"
              rows={5}
              required
            />

            {!user && (
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="example@email.com"
                required={!user}
              />
            )}

            {user && (
              <div className="feedback-user-info">
                <span>Trimis de: <strong>{user.displayName || user.email}</strong></span>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              variant="primary"
            >
              {submitting ? "Se trimite..." : "Trimite Feedback"}
            </Button>
          </form>
        </div>

        {/* All feedback (visible to everyone) */}
        <div className="feedback-list-section">
          <h2>Toate sugestiile ({feedback.length})</h2>

          {feedback.length === 0 ? (
            <div className="empty-state">
              <p>Nu sunt încă sugestii. Fii primul care să trimită feedback!</p>
            </div>
          ) : (
            <div className="feedback-list">
              {feedback.map((item) => (
                <div key={item.id} className="feedback-item">
                  <div className="feedback-item-header">
                    <span className="feedback-email">
                      {item.userName || item.email}
                    </span>
                    <span className="feedback-date">
                      {new Date(item.createdAt.toMillis()).toLocaleDateString()}
                    </span>
                    {isOwner && (
                      <span className={`feedback-status ${item.status}`}>
                        {item.status}
                      </span>
                    )}
                  </div>

                  <p className="feedback-message">{item.message}</p>

                  {item.ownerResponse && (
                    <div className="feedback-response">
                      <div className="response-header">
                        <strong>Răspuns de la echipa Kelunia:</strong>
                      </div>
                      <p>{item.ownerResponse}</p>
                    </div>
                  )}

                  {isOwner && !item.ownerResponse && (
                    <Button
                      onClick={() => {
                        setSelectedFeedback(item);
                        setRespondingId(item.id);
                      }}
                      variant="secondary"
                    >
                      Răspunde
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Owner response modal */}
        {isOwner && selectedFeedback && (
          <Modal
            open={respondingId === selectedFeedback.id}
            title="Răspunde la feedback"
            onClose={() => {
              setSelectedFeedback(null);
              setRespondingId(null);
              setOwnerResponse("");
            }}
          >
            <div className="modal-content">
              <div className="original-feedback">
                <strong>Feedback original:</strong>
                <p>{selectedFeedback.message}</p>
              </div>

              <textarea
                value={ownerResponse}
                onChange={(e) => setOwnerResponse(e.target.value)}
                placeholder="Scrie răspunsul tău..."
                className="feedback-textarea"
                rows={4}
              />

              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedFeedback(null);
                    setRespondingId(null);
                    setOwnerResponse("");
                  }}
                >
                  Anulează
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleOwnerResponse(selectedFeedback.id);
                  }}
                  disabled={!ownerResponse.trim()}
                >
                  Trimite Răspuns
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PageContainer>
  );
}
