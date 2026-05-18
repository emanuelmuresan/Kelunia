"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) return;

    setLoading(true);

    try {
      // You can replace this with your actual API endpoint
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubmitted(true);
        setEmail("");
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (error) {
      console.error("Error subscribing to waitlist:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="landing-waitlist-form">
      <input
        type="email"
        placeholder="Adresa ta de email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="landing-waitlist-input"
        aria-label="Email pentru lista de așteptare"
        required
      />
      <button
        type="submit"
        disabled={loading || submitted}
        className="primary-link landing-waitlist-button"
        aria-label="Alătură-te listei de așteptare"
      >
        {submitted ? "✓ Mulțumim!" : loading ? "Se procesează..." : "Alătură-te"}
      </button>
    </form>
  );
}
