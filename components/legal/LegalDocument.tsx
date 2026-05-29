import Link from "next/link";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  body?: ReactNode;
  items?: ReactNode[];
};

type LegalDocumentProps = {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
  children?: ReactNode;
};

export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Legal">
      <Link href="/privacy-policy">Privacy Policy</Link>
      <Link href="/terms-and-conditions">Terms & Conditions</Link>
      <Link href="/cookie-policy">Cookie Policy</Link>
      <Link href="/delete-account">Delete Account</Link>
    </nav>
  );
}

export function LegalDocument({ title, description, updatedAt, sections, children }: LegalDocumentProps) {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link href="/" className="landing-brand" aria-label="Kelunia">
          <img src="/icon-192.png" alt="" />
          <span>Kelunia</span>
        </Link>
        <LegalLinks />
      </header>

      <article className="legal-card">
        <p className="eyebrow">Legal</p>
        <h1>{title}</h1>
        <p className="legal-lead">{description}</p>
        <p className="legal-updated">Last updated: {updatedAt}</p>

        {children}

        <div className="legal-section-list">
          {sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.body ? <p>{section.body}</p> : null}
              {section.items ? (
                <ul>
                  {section.items.map((item, index) => (
                    <li key={`${section.title}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
