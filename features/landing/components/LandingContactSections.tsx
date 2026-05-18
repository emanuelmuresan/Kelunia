"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeNewsletterEmail, newsletterSubscriberId } from "@/lib/newsletter";

type ContactDraft = {
  email: string;
  name: string;
  message: string;
};

const emptyContactDraft: ContactDraft = {
  email: "",
  name: "",
  message: "",
};

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function saveLandingMessage(params: {
  email: string;
  organizationName: string;
  details: string;
  source: "landing-newsletter" | "landing-contact";
}) {
  await addDoc(collection(db, "communityApplications"), {
    email: params.email,
    organizationName: params.organizationName,
    details: params.details,
    status: "new",
    source: params.source,
    createdAt: serverTimestamp(),
  });
}

export function LandingNewsletterSection() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function submitNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanEmail = email.trim();

    if (!validEmail(cleanEmail)) {
      setError("Scrie o adresă de email validă.");
      return;
    }

    setWorking(true);

    try {
      const normalizedEmail = normalizeNewsletterEmail(cleanEmail);
      const emailKey = newsletterSubscriberId(normalizedEmail);

      await setDoc(doc(db, "newsletterSubscribers", emailKey), {
        email: normalizedEmail,
        emailKey,
        source: "landing-newsletter",
        status: "active",
        unsubscribed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setEmail("");
      setMessage("Gata, te-am trecut pe listă.");
    } catch (submitError) {
      console.error("Abonarea la actualizări nu a putut fi salvată:", submitError);
      setError("Nu am putut salva emailul. Încearcă din nou.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="landing-newsletter">
      <div>
        <span className="eyebrow">Rămâi la curent</span>
        <h2>Alătură-te comunității Kelunia.</h2>
        <p>
          Primești actualizări despre funcții noi și sfaturi pentru gestionarea
          spațiilor.
        </p>
      </div>

      <form className="landing-newsletter-form" onSubmit={submitNewsletter}>
        <div className="landing-newsletter-field">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="emailul tău"
            aria-label="Email pentru actualizări"
            autoComplete="email"
            required
          />
          <button className="primary-button" disabled={working} type="submit">
            {working ? "Se salvează..." : "Vreau actualizări"}
          </button>
        </div>

        {error && <p className="error-line">{error}</p>}
        {message && <p className="success-line">{message}</p>}
      </form>
    </section>
  );
}

export function LandingFinalCta() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyContactDraft);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  function closeModal() {
    if (working) {
      return;
    }

    setOpen(false);
    setError("");
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const email = draft.email.trim();
    const name = draft.name.trim();
    const body = draft.message.trim();

    if (!validEmail(email)) {
      setError("Scrie o adresă de email validă.");
      return;
    }

    if (body.length < 10) {
      setError("Scrie întrebarea sau mesajul tău.");
      return;
    }

    setWorking(true);

    try {
      await saveLandingMessage({
        email,
        organizationName: name || "Contact landing page",
        details: body,
        source: "landing-contact",
      });

      setDraft(emptyContactDraft);
      setMessage("Mesajul a fost trimis. Îți răspundem pe email.");
      setOpen(false);
    } catch (submitError) {
      console.error("Mesajul de contact nu a putut fi salvat:", submitError);
      setError("Mesajul nu a putut fi trimis. Încearcă din nou.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <section className="landing-final">
        <span className="eyebrow">Kelunia</span>
        <h2>Pregătit să aduci liniștea în calendarul tău?</h2>
        <p>Începe testarea gratuită de 14 zile. Fără obligații.</p>

        {message && <p className="success-line">{message}</p>}

        <div className="landing-hero-actions">
          <Link href="/login?mode=trial" className="primary-link">
            Creează cont gratuit
          </Link>
          <button className="secondary-button" onClick={() => setOpen(true)} type="button">
            Ai întrebări? Contactează-ne
          </button>
        </div>
      </section>

      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <section
            className="modal-card small-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">Contact</span>
                <h2 id="contact-title">Trimite o întrebare</h2>
              </div>
              <button className="icon-button" onClick={closeModal} type="button" aria-label="Închide">
                ×
              </button>
            </div>

            <form className="settings-form" onSubmit={submitContact}>
              <label>
                Email
                <input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                  placeholder="emailul unde te putem contacta"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Nume / organizație
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="opțional"
                />
              </label>

              <label>
                Mesaj
                <textarea
                  value={draft.message}
                  onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Scrie întrebarea ta despre Kelunia."
                  required
                />
              </label>

              {error && <p className="error-line">{error}</p>}

              <div className="modal-actions">
                <button className="secondary-button" onClick={closeModal} disabled={working} type="button">
                  Renunță
                </button>
                <button className="primary-button" disabled={working} type="submit">
                  {working ? "Se trimite..." : "Trimite mesajul"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
