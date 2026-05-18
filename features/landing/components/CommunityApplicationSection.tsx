"use client";

import { useState, type FormEvent } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Draft = {
  email: string;
  organizationName: string;
  details: string;
};

const emptyDraft: Draft = {
  email: "",
  organizationName: "",
  details: "",
};

export function CommunityApplicationSection() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
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

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const email = draft.email.trim();
    const organizationName = draft.organizationName.trim();
    const details = draft.details.trim();

    if (!email || !email.includes("@")) {
      setError("Scrie o adresă de email validă.");
      return;
    }

    if (!organizationName) {
      setError("Scrie numele organizației sau comunității.");
      return;
    }

    if (details.length < 20) {
      setError("Adaugă câteva detalii despre organizație și spațiile administrate.");
      return;
    }

    setWorking(true);

    try {
      await addDoc(collection(db, "communityApplications"), {
        email,
        organizationName,
        details,
        status: "new",
        source: "landing-community",
        createdAt: serverTimestamp(),
      });

      setDraft(emptyDraft);
      setMessage("Cererea a fost trimisă. O vei primi în aplicație.");
      setOpen(false);
    } catch (submitError) {
      console.error("Cererea Community nu a putut fi trimisă:", submitError);
      setError("Cererea nu a putut fi trimisă. Încearcă din nou.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <section className="landing-community">
        <div>
          <span className="eyebrow">Pentru comunități</span>
          <h2>Program special pentru non-profit.</h2>
          <p>
            Susținem asociațiile, ONG-urile și comunitățile locale care administrează
            spații comune fără scop comercial. Organizațiile eligibile pot primi acces
            gratuit sau tarif redus, în funcție de nevoi.
          </p>
          {message && <p className="success-line">{message}</p>}
        </div>

        <button className="secondary-button" onClick={() => setOpen(true)} type="button">
          Aplică pentru Community
        </button>
      </section>

      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <section className="modal-card small-card" role="dialog" aria-modal="true" aria-labelledby="community-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Community</span>
                <h2 id="community-title">Aplică pentru sprijin non-profit</h2>
              </div>
              <button className="icon-button" onClick={closeModal} type="button" aria-label="Închide">
                ×
              </button>
            </div>

            <form className="settings-form" onSubmit={submitApplication}>
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
                Organizație / comunitate
                <input
                  value={draft.organizationName}
                  onChange={(event) => setDraft((current) => ({ ...current, organizationName: event.target.value }))}
                  placeholder="ex. Asociația ..., ONG ..., Comunitatea ..."
                  required
                />
              </label>

              <label>
                Detalii
                <textarea
                  value={draft.details}
                  onChange={(event) => setDraft((current) => ({ ...current, details: event.target.value }))}
                  placeholder="Spune pe scurt ce spații administrați, câți oameni le folosesc și de ce aveți nevoie de sprijin."
                  required
                />
              </label>

              {error && <p className="error-line">{error}</p>}

              <div className="modal-actions">
                <button className="secondary-button" onClick={closeModal} disabled={working} type="button">
                  Renunță
                </button>
                <button className="primary-button" disabled={working} type="submit">
                  {working ? "Se trimite..." : "Trimite cererea"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
