import Link from "next/link";
import type { ReactNode } from "react";
import { CommunityApplicationSection } from "@/features/landing/components/CommunityApplicationSection";
import { LandingFinalCta, LandingNewsletterSection } from "@/features/landing/components/LandingContactSections";

const problems = [
  {
    title: "Fără suprapuneri",
    text: "Sistemul blochează automat rezervările duble și îți arată rapid ce spațiu este liber și când.",
  },
  {
    title: "Transparență totală",
    text: "Toți membrii văd în timp real cine ocupă spațiul, pentru ce activitate și în ce interval.",
  },
  {
    title: "Acces controlat",
    text: "Tu decizi cine poate rezerva, cine poate anula și cine are doar drept de vizualizare.",
  },
];

const features = [
  {
    title: "Calendar clar",
    text: "Programări pe zi, săptămână și lună, cu vizibilitate rapidă pentru fiecare locație și spațiu.",
    icon: "/calendar.png",
  },
  {
    title: "Săli și resurse",
    text: "Organizează totul pe locații și grupuri. Fiecare rezervare rămâne legată de spațiul, echipa și scopul potrivit.",
    icon: "/list.png",
  },
  {
    title: "Programări recurente",
    text: "Setezi o dată întâlnirile săptămânale, cursurile fixe sau rezervările repetitive, iar Kelunia ocupă restul intervalelor.",
    icon: "/fixed.png",
  },
  {
    title: "Permisiuni pe roluri",
    text: "Administratorii controlează tot, membrii rezervă, iar publicul poate avea doar drept de vizualizare.",
    icon: "/settings.png",
  },
];

const audiences = [
  {
    icon: "🏢",
    title: "Săli și spații comune",
    text: "Pentru săli de meeting, terenuri, spații de training sau locații care trebuie rezervate clar.",
  },
  {
    icon: "🎓",
    title: "Studiouri și săli de curs",
    text: "Artiștii, instructorii și profesorii își gestionează singuri intervalele, fără mesaje pierdute.",
  },
  {
    icon: "💼",
    title: "Echipe și birouri shared",
    text: "Coordonare simplă pentru echipe hibrid. Vezi cine vine la birou și ce săli sunt ocupate.",
  },
  {
    icon: "🏘️",
    title: "Asociații și rezidențial",
    text: "Gestionare transparentă pentru spații comune precum foișor, sală, teren de sport sau parcare. Fără conflicte între vecini.",
  },
];

const plans = [
  {
    name: "Trial",
    price: "Gratuit",
    note: "14 zile",
    yearly: null,
    description: "Testare completă fără card de credit.",
    items: [
      "Toate funcțiile incluse",
      "Setup rapid",
      "Calendar, săli și echipe",
      "Programări recurente",
    ],
    cta: "Începe acum",
    href: "/login?mode=trial",
  },
  {
    name: "Standard",
    price: "€14.99",
    note: "pe locație / lună",
    yearly: "sau €149 / an",
    description: "Pentru o locație activă care are nevoie de programări clare.",
    items: [
      "1 locație activă",
      "Calendar zi / săptămână / lună",
      "Săli și resurse",
      "Membri nelimitați",
      "Roluri basic",
      "Notificări email",
      "Export basic",
    ],
    cta: "Alege Standard",
    href: "/login?mode=trial",
  },
  {
    name: "Pro",
    price: "€49",
    note: "pe workspace / lună",
    yearly: "sau €490 / an",
    description: "Pentru echipe care administrează mai multe locații împreună.",
    items: [
      "Tot din Standard",
      "Administrare multi-location",
      "Licențiere pe locație activă",
      "Permisiuni avansate",
      "Aprobări pentru rezervări",
      "Analytics basic",
      "Audit log",
    ],
    cta: "Alege Pro",
    href: "/login?mode=trial",
  },
  {
    name: "Business",
    price: "Contact",
    note: "pentru organizații",
    yearly: null,
    description: "Pentru fluxuri speciale, onboarding și integrare personalizată.",
    items: [
      "Tot din Pro",
      "Onboarding personalizat",
      "Import date",
      "Integrări custom",
      "Suport prioritar",
      "Limite personalizate",
    ],
    cta: "Contactează-ne",
    href: "mailto:contact@kelunia.com",
  },
];

const faqs = [
  {
    question: "Cum funcționează licențele?",
    answer:
      "Fiecare locație activă necesită o licență. Standard este pentru o singură locație, iar Pro este destinat echipelor care administrează mai multe locații împreună.",
  },
  {
    question: "Pot testa gratuit?",
    answer:
      "Da. Ai 14 zile de testare gratuită, fără card de credit, ca să vezi dacă se potrivește fluxului tău.",
  },
  {
    question: "Merge pe telefon și pe calculator?",
    answer:
      "Da. Kelunia este PWA și poate fi folosită pe telefon, tabletă și calculator.",
  },
  {
    question: "Pentru cine este Kelunia?",
    answer:
      "Pentru orice organizație care rezervă spații: săli, cabinete, studiouri, birouri shared, terenuri sau locații de închiriat.",
  },
];

function LandingCta({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className="secondary-button">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className="secondary-button">
      {children}
    </Link>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Navigare principală">
        <Link href="/" className="landing-brand" aria-label="Kelunia">
          <img src="/icon-192.png" alt="" />
          <span>Kelunia</span>
        </Link>

        <div className="landing-nav-actions">
          <Link href="/login" className="secondary-button">
            Login
          </Link>
          <Link href="/dashboard" className="primary-link">
            Intră în aplicație
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="eyebrow">Mai puțin haos. Mai multă claritate.</span>

          <h1>Administrare simplă pentru spații comune.</h1>

          <p>
            Kelunia te ajută să gestionezi rezervări, spații, echipe, programări
            recurente și acces pe roluri, fără haos.
          </p>

          <div className="landing-hero-actions">
            <Link href="/login?mode=trial" className="primary-link">
              Începe testarea gratuită
            </Link>
            <a href="#features" className="secondary-button">
              Vezi cum funcționează
            </a>
          </div>
        </div>
      </section>

      <section className="landing-section landing-problems" aria-labelledby="problems-title">
        <div className="landing-section-head">
          <span className="eyebrow">De ce Kelunia</span>
          <h2 id="problems-title">
            Mai puține mesaje, mai puține conflicte, mai multă claritate.
          </h2>
          <p>
            Când mai mulți oameni folosesc aceleași spații, programările trebuie să
            fie clare, vizibile și ușor de controlat.
          </p>
        </div>

        <div className="landing-problem-grid">
          {problems.map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="features" aria-labelledby="features-title">
        <div className="landing-section-head">
          <span className="eyebrow">Funcționalități cheie</span>
          <h2 id="features-title">O bază solidă pentru comunitatea ta.</h2>
        </div>

        <div className="landing-feature-grid">
          {features.map((feature) => (
            <article className="landing-feature-card" key={feature.title}>
              <img src={feature.icon} alt="" />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-audience" aria-labelledby="audience-title">
        <div className="landing-section-head">
          <span className="eyebrow">Pentru cine</span>
          <h2 id="audience-title">
            Creată pentru locuri care se folosesc, se rezervă și se împart.
          </h2>
        </div>

        <div className="landing-audience-grid">
          {audiences.map((item) => (
            <article key={item.title}>
              <span aria-hidden="true">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="plans" aria-labelledby="plans-title">
        <div className="landing-section-head">
          <span className="eyebrow">Planuri și costuri</span>
          <h2 id="plans-title">Începi simplu. Crești când ai nevoie.</h2>
          <p>
            Standard este pentru o locație activă. Pro adaugă administrare
            multi-location, permisiuni avansate și vizibilitate mai bună, păstrând
            licențierea pe locație activă.
          </p>
        </div>

        <div className="landing-plan-grid">
          {plans.map((plan) => (
            <article className="landing-plan-card" key={plan.name}>
              <div>
                <span>{plan.name}</span>
                <strong>{plan.price}</strong>
                <small>{plan.note}</small>
                {plan.yearly ? <em>{plan.yearly}</em> : null}
              </div>

              <p>{plan.description}</p>

              <ul>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <LandingCta href={plan.href}>{plan.cta}</LandingCta>
            </article>
          ))}
        </div>
      </section>

      <CommunityApplicationSection />

      <section className="landing-section landing-faq" aria-labelledby="faq-title">
        <div className="landing-section-head">
          <span className="eyebrow">FAQ</span>
          <h2 id="faq-title">Întrebări rapide.</h2>
        </div>

        <div className="landing-faq-list">
          {faqs.map((item) => (
            <article key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <LandingNewsletterSection />

      <LandingFinalCta />
    </main>
  );
}
