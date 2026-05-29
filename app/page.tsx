"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AppEntryRedirect } from "@/components/AppEntryRedirect";
import { LegalLinks } from "@/components/legal/LegalDocument";
import { CommunityApplicationSection } from "@/features/landing/components/CommunityApplicationSection";
import { LandingFinalCta, LandingNewsletterSection } from "@/features/landing/components/LandingContactSections";
import { supportedLocales, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";

type LandingCopy = {
  nav: string;
  login: string;
  eyebrow: string;
  title: string;
  intro: string;
  trial: string;
  why: string;
  whyTitle: string;
  whyText: string;
  featuresEyebrow: string;
  featuresTitle: string;
  audienceEyebrow: string;
  audienceTitle: string;
  plansEyebrow: string;
  plansTitle: string;
  plansText: string;
  faqEyebrow: string;
  faqTitle: string;
  problems: Array<[string, string]>;
  features: Array<[string, string, string]>;
  audiences: Array<[string, string, string]>;
  plans: Array<[string, string, string, string, string, string[], string, string]>;
  faqs: Array<[string, string]>;
};

const copy: Record<SupportedLocale, LandingCopy> = {
  ro: {
    nav: "Navigare principală",
    login: "Autentificare",
    eyebrow: "Mai puțin haos. Mai multă claritate.",
    title: "Administrare simplă pentru spații comune.",
    intro: "Kelunia te ajută să gestionezi rezervări, spații, echipe, programări recurente și acces pe roluri, fără haos.",
    trial: "Începe testarea gratuită",
    why: "De ce Kelunia",
    whyTitle: "Mai puține mesaje, mai puține conflicte, mai multă claritate.",
    whyText: "Când mai mulți oameni folosesc aceleași spații, programările trebuie să fie clare, vizibile și ușor de controlat.",
    featuresEyebrow: "Funcționalități cheie",
    featuresTitle: "O bază solidă pentru comunitatea ta.",
    audienceEyebrow: "Pentru cine",
    audienceTitle: "Creată pentru locuri care se folosesc, se rezervă și se împart.",
    plansEyebrow: "Planuri și costuri",
    plansTitle: "Începi simplu. Crești când ai nevoie.",
    plansText: "Standard este pentru o locație activă. Pro adaugă administrare multi-location, permisiuni avansate și vizibilitate mai bună, păstrând licențierea pe locație activă.",
    faqEyebrow: "FAQ",
    faqTitle: "Întrebări rapide.",
    problems: [
      ["Fără suprapuneri", "Sistemul blochează automat rezervările duble și îți arată rapid ce spațiu este liber și când."],
      ["Transparență totală", "Toți colaboratorii văd în timp real cine ocupă spațiul, pentru ce activitate și în ce interval."],
      ["Acces controlat", "Tu decizi cine poate rezerva, cine poate anula și cine are doar drept de vizualizare."],
    ],
    features: [
      ["Calendar clar", "Programări pe zi, săptămână și lună, cu vizibilitate rapidă pentru fiecare locație și spațiu.", "/calendar.png"],
      ["Săli și resurse", "Organizează totul pe locații și grupuri. Fiecare rezervare rămâne legată de spațiul, echipa și scopul potrivit.", "/list.png"],
      ["Programări recurente", "Setezi o dată întâlnirile săptămânale, cursurile fixe sau rezervările repetitive, iar Kelunia ocupă restul intervalelor.", "/fixed.png"],
      ["Permisiuni pe roluri", "Administratorii controlează tot, colaboratorii rezervă, iar publicul poate avea doar drept de vizualizare.", "/settings.png"],
    ],
    audiences: [
      ["🏢", "Săli și spații comune", "Pentru săli de meeting, terenuri, spații de training sau locații care trebuie rezervate clar."],
      ["🎓", "Studiouri și săli de curs", "Artiștii, instructorii și profesorii își gestionează singuri intervalele, fără mesaje pierdute."],
      ["💼", "Echipe și birouri shared", "Coordonare simplă pentru echipe hibrid. Vezi cine vine la birou și ce săli sunt ocupate."],
      ["🏘️", "Asociații și rezidențial", "Gestionare transparentă pentru spații comune precum foișor, sală, teren de sport sau parcare. Fără conflicte între vecini."],
    ],
    plans: [
      ["Trial", "Gratuit", "14 zile", "", "Testare completă fără card de credit.", ["Toate funcțiile incluse", "Setup rapid", "Calendar, săli și echipe", "Programări recurente"], "Începe acum", "/login?mode=trial"],
      ["Standard", "€14.99", "pe locație / lună", "sau €149 / an", "Pentru o locație activă care are nevoie de programări clare.", ["1 locație activă", "Calendar zi / săptămână / lună", "Săli și resurse", "Membri nelimitați", "Roluri basic", "Notificări email", "Export basic"], "Alege Standard", "/login?mode=trial"],
      ["Pro", "€49", "pe workspace / lună", "sau €490 / an", "Pentru echipe care administrează mai multe locații împreună.", ["Tot din Standard", "Administrare multi-location", "Licențiere pe locație activă", "Permisiuni avansate", "Aprobări pentru rezervări", "Analytics basic", "Audit log"], "Alege Pro", "/login?mode=trial"],
      ["Business", "Contact", "pentru organizații", "", "Pentru fluxuri speciale, onboarding și integrare personalizată.", ["Tot din Pro", "Onboarding personalizat", "Import date", "Integrări custom", "Suport prioritar", "Limite personalizate"], "Contactează-ne", "mailto:contact@kelunia.com"],
    ],
    faqs: [
      ["Cum funcționează licențele?", "Fiecare locație activă necesită o licență. Standard este pentru o singură locație, iar Pro este destinat echipelor care administrează mai multe locații împreună."],
      ["Pot testa gratuit?", "Da. Ai 14 zile de testare gratuită, fără card de credit, ca să vezi dacă se potrivește fluxului tău."],
      ["Merge pe telefon și pe calculator?", "Da. Kelunia este PWA și poate fi folosită pe telefon, tabletă și calculator."],
      ["Pentru cine este Kelunia?", "Pentru orice organizație care rezervă spații: săli, cabinete, studiouri, birouri shared, terenuri sau locații de închiriat."],
    ],
  },
  en: {
    nav: "Main navigation",
    login: "Sign in",
    eyebrow: "Less chaos. More clarity.",
    title: "Simple management for shared spaces.",
    intro: "Kelunia helps you manage bookings, spaces, teams, recurring schedules and role-based access without chaos.",
    trial: "Start free trial",
    why: "Why Kelunia",
    whyTitle: "Fewer messages, fewer conflicts, more clarity.",
    whyText: "When several people use the same spaces, bookings need to be clear, visible and easy to control.",
    featuresEyebrow: "Key features",
    featuresTitle: "A solid base for your community.",
    audienceEyebrow: "Who it is for",
    audienceTitle: "Built for places that are used, booked and shared.",
    plansEyebrow: "Plans and pricing",
    plansTitle: "Start simple. Grow when you need to.",
    plansText: "Standard is for one active location. Pro adds multi-location management, advanced permissions and better visibility while keeping licensing per active location.",
    faqEyebrow: "FAQ",
    faqTitle: "Quick questions.",
    problems: [
      ["No overlaps", "The system automatically blocks double bookings and quickly shows which space is free and when."],
      ["Full transparency", "All collaborators see in real time who is using the space, for what activity and in what interval."],
      ["Controlled access", "You decide who can book, who can cancel and who can only view."],
    ],
    features: [
      ["Clear calendar", "Day, week and month bookings with quick visibility for each location and space.", "/calendar.png"],
      ["Rooms and resources", "Organize everything by locations and groups. Each booking stays tied to the right space, team and purpose.", "/list.png"],
      ["Recurring bookings", "Set weekly meetings, fixed classes or repetitive bookings once, and Kelunia fills the rest.", "/fixed.png"],
      ["Role permissions", "Administrators control everything, collaborators book, and guests can have view-only access.", "/settings.png"],
    ],
    audiences: [
      ["🏢", "Shared rooms and spaces", "For meeting rooms, courts, training spaces or locations that need clear booking."],
      ["🎓", "Studios and classrooms", "Artists, instructors and teachers manage their own slots without lost messages."],
      ["💼", "Teams and shared offices", "Simple coordination for hybrid teams. See who comes in and which rooms are occupied."],
      ["🏘️", "Associations and residential", "Transparent management for shared spaces like gardens, halls, sports courts or parking. No conflicts between neighbors."],
    ],
    plans: [
      ["Trial", "Free", "14 days", "", "Full testing without a credit card.", ["All features included", "Quick setup", "Calendar, rooms and teams", "Recurring bookings"], "Start now", "/login?mode=trial"],
      ["Standard", "€14.99", "per location / month", "or €149 / year", "For an active location that needs clear bookings.", ["1 active location", "Day / week / month calendar", "Rooms and resources", "Unlimited members", "Basic roles", "Email notifications", "Basic export"], "Choose Standard", "/login?mode=trial"],
      ["Pro", "€49", "per workspace / month", "or €490 / year", "For teams that manage multiple locations together.", ["Everything in Standard", "Multi-location management", "Licensing per active location", "Advanced permissions", "Booking approvals", "Basic analytics", "Audit log"], "Choose Pro", "/login?mode=trial"],
      ["Business", "Contact", "for organizations", "", "For special workflows, onboarding and custom integration.", ["Everything in Pro", "Custom onboarding", "Data import", "Custom integrations", "Priority support", "Custom limits"], "Contact us", "mailto:contact@kelunia.com"],
    ],
    faqs: [
      ["How do licenses work?", "Each active location needs a license. Standard is for a single location, while Pro is for teams that manage multiple locations together."],
      ["Can I test it for free?", "Yes. You get 14 days of free testing, without a credit card, to see whether it fits your workflow."],
      ["Does it work on phone and computer?", "Yes. Kelunia is a PWA and can be used on phone, tablet and computer."],
      ["Who is Kelunia for?", "For any organization that books spaces: rooms, offices, studios, shared offices, courts or rental locations."],
    ],
  },
  es: {
    nav: "Navegación principal",
    login: "Entrar",
    eyebrow: "Menos caos. Más claridad.",
    title: "Gestión simple para espacios compartidos.",
    intro: "Kelunia te ayuda a gestionar reservas, espacios, equipos, horarios recurrentes y acceso por roles sin caos.",
    trial: "Empezar prueba gratuita",
    why: "Por qué Kelunia",
    whyTitle: "Menos mensajes, menos conflictos, más claridad.",
    whyText: "Cuando varias personas usan los mismos espacios, las reservas deben ser claras, visibles y fáciles de controlar.",
    featuresEyebrow: "Funciones clave",
    featuresTitle: "Una base sólida para tu comunidad.",
    audienceEyebrow: "Para quién",
    audienceTitle: "Creada para lugares que se usan, se reservan y se comparten.",
    plansEyebrow: "Planes y precios",
    plansTitle: "Empieza simple. Crece cuando lo necesites.",
    plansText: "Standard es para una ubicación activa. Pro añade gestión multi-location, permisos avanzados y mejor visibilidad, manteniendo la licencia por ubicación activa.",
    faqEyebrow: "FAQ",
    faqTitle: "Preguntas rápidas.",
    problems: [
      ["Sin solapamientos", "El sistema bloquea automáticamente reservas dobles y muestra rápido qué espacio está libre y cuándo."],
      ["Transparencia total", "Todos los colaboradores ven en tiempo real quién ocupa el espacio, para qué actividad y en qué intervalo."],
      ["Acceso controlado", "Tú decides quién puede reservar, quién puede cancelar y quién solo puede ver."],
    ],
    features: [
      ["Calendario claro", "Reservas por día, semana y mes, con visibilidad rápida para cada ubicación y espacio.", "/calendar.png"],
      ["Salas y recursos", "Organiza todo por ubicaciones y grupos. Cada reserva queda ligada al espacio, equipo y propósito adecuados.", "/list.png"],
      ["Reservas recurrentes", "Configura una vez reuniones semanales, clases fijas o reservas repetitivas, y Kelunia ocupa el resto.", "/fixed.png"],
      ["Permisos por rol", "Los administradores controlan todo, los colaboradores reservan y los invitados pueden tener solo visualización.", "/settings.png"],
    ],
    audiences: [
      ["🏢", "Salas y espacios comunes", "Para salas de reuniones, pistas, espacios de formación o lugares que necesitan reservas claras."],
      ["🎓", "Estudios y aulas", "Artistas, instructores y profesores gestionan sus propios horarios sin mensajes perdidos."],
      ["💼", "Equipos y oficinas compartidas", "Coordinación simple para equipos híbridos. Ve quién viene y qué salas están ocupadas."],
      ["🏘️", "Asociaciones y residencial", "Gestión transparente para espacios comunes como jardín, sala, pista deportiva o aparcamiento. Sin conflictos entre vecinos."],
    ],
    plans: [
      ["Trial", "Gratis", "14 días", "", "Prueba completa sin tarjeta de crédito.", ["Todas las funciones incluidas", "Setup rápido", "Calendario, salas y equipos", "Reservas recurrentes"], "Empieza ahora", "/login?mode=trial"],
      ["Standard", "€14.99", "por ubicación / mes", "o €149 / año", "Para una ubicación activa que necesita reservas claras.", ["1 ubicación activa", "Calendario día / semana / mes", "Salas y recursos", "Miembros ilimitados", "Roles básicos", "Notificaciones email", "Export básico"], "Elegir Standard", "/login?mode=trial"],
      ["Pro", "€49", "por workspace / mes", "o €490 / año", "Para equipos que administran varias ubicaciones juntos.", ["Todo de Standard", "Gestión multi-location", "Licencia por ubicación activa", "Permisos avanzados", "Aprobaciones de reservas", "Analytics básico", "Audit log"], "Elegir Pro", "/login?mode=trial"],
      ["Business", "Contacto", "para organizaciones", "", "Para flujos especiales, onboarding e integración personalizada.", ["Todo de Pro", "Onboarding personalizado", "Importación de datos", "Integraciones custom", "Soporte prioritario", "Límites personalizados"], "Contáctanos", "mailto:contact@kelunia.com"],
    ],
    faqs: [
      ["¿Cómo funcionan las licencias?", "Cada ubicación activa necesita una licencia. Standard es para una sola ubicación, y Pro es para equipos que administran varias ubicaciones juntos."],
      ["¿Puedo probar gratis?", "Sí. Tienes 14 días de prueba gratuita, sin tarjeta de crédito, para ver si encaja con tu flujo."],
      ["¿Funciona en teléfono y ordenador?", "Sí. Kelunia es PWA y puede usarse en teléfono, tableta y ordenador."],
      ["¿Para quién es Kelunia?", "Para cualquier organización que reserva espacios: salas, despachos, estudios, oficinas compartidas, pistas o ubicaciones de alquiler."],
    ],
  },
  it: {} as LandingCopy,
  fr: {} as LandingCopy,
  pt: {} as LandingCopy,
};

copy.it = {
  ...copy.en,
  nav: "Navigazione principale",
  login: "Accedi",
  eyebrow: "Meno caos. Più chiarezza.",
  title: "Gestione semplice per spazi condivisi.",
  intro: "Kelunia ti aiuta a gestire prenotazioni, spazi, team, programmi ricorrenti e accesso per ruoli senza caos.",
  trial: "Inizia la prova gratuita",
  why: "Perché Kelunia",
  whyTitle: "Meno messaggi, meno conflitti, più chiarezza.",
  whyText: "Quando più persone usano gli stessi spazi, le prenotazioni devono essere chiare, visibili e facili da controllare.",
  featuresEyebrow: "Funzioni chiave",
  featuresTitle: "Una base solida per la tua comunità.",
  audienceEyebrow: "Per chi",
  audienceTitle: "Creata per luoghi che si usano, si prenotano e si condividono.",
  plansEyebrow: "Piani e prezzi",
  plansTitle: "Inizia semplice. Cresci quando serve.",
  plansText: "Standard è per una sede attiva. Pro aggiunge gestione multi-location, permessi avanzati e maggiore visibilità, mantenendo la licenza per sede attiva.",
  faqTitle: "Domande rapide.",
  problems: [
    ["Nessuna sovrapposizione", "Il sistema blocca automaticamente le doppie prenotazioni e mostra rapidamente quale spazio è libero e quando."],
    ["Trasparenza totale", "Tutti i collaboratori vedono in tempo reale chi occupa lo spazio, per quale attività e in quale intervallo."],
    ["Accesso controllato", "Decidi tu chi può prenotare, chi può annullare e chi può solo visualizzare."],
  ],
  features: [
    ["Calendario chiaro", "Prenotazioni per giorno, settimana e mese, con visibilità rapida per ogni sede e spazio.", "/calendar.png"],
    ["Sale e risorse", "Organizza tutto per sedi e gruppi. Ogni prenotazione resta collegata allo spazio, al team e allo scopo giusto.", "/list.png"],
    ["Prenotazioni ricorrenti", "Imposti una volta riunioni settimanali, corsi fissi o prenotazioni ripetitive, e Kelunia gestisce gli altri intervalli.", "/fixed.png"],
    ["Permessi per ruolo", "Gli amministratori controllano tutto, i collaboratori prenotano e gli ospiti possono avere solo visualizzazione.", "/settings.png"],
  ],
  audiences: [
    ["🏢", "Sale e spazi comuni", "Per sale meeting, campi, spazi di formazione o sedi che devono essere prenotate con chiarezza."],
    ["🎓", "Studi e aule", "Artisti, istruttori e insegnanti gestiscono da soli gli intervalli, senza messaggi persi."],
    ["💼", "Team e uffici condivisi", "Coordinamento semplice per team ibridi. Vedi chi arriva e quali sale sono occupate."],
    ["🏘️", "Associazioni e residenziale", "Gestione trasparente per spazi comuni come giardino, sala, campo sportivo o parcheggio. Senza conflitti."],
  ],
  plans: [
    ["Trial", "Gratis", "14 giorni", "", "Test completo senza carta di credito.", ["Tutte le funzioni incluse", "Setup rapido", "Calendario, sale e team", "Prenotazioni ricorrenti"], "Inizia ora", "/login?mode=trial"],
    ["Standard", "€14.99", "per sede / mese", "o €149 / anno", "Per una sede attiva che ha bisogno di prenotazioni chiare.", ["1 sede attiva", "Calendario giorno / settimana / mese", "Sale e risorse", "Membri illimitati", "Ruoli base", "Notifiche email", "Export base"], "Scegli Standard", "/login?mode=trial"],
    ["Pro", "€49", "per workspace / mese", "o €490 / anno", "Per team che gestiscono più sedi insieme.", ["Tutto in Standard", "Gestione multi-location", "Licenza per sede attiva", "Permessi avanzati", "Approvazioni prenotazioni", "Analytics base", "Audit log"], "Scegli Pro", "/login?mode=trial"],
    ["Business", "Contatto", "per organizzazioni", "", "Per flussi speciali, onboarding e integrazione personalizzata.", ["Tutto in Pro", "Onboarding personalizzato", "Import dati", "Integrazioni custom", "Supporto prioritario", "Limiti personalizzati"], "Contattaci", "mailto:contact@kelunia.com"],
  ],
  faqs: [
    ["Come funzionano le licenze?", "Ogni sede attiva richiede una licenza. Standard è per una singola sede, mentre Pro è per team che gestiscono più sedi insieme."],
    ["Posso provarla gratis?", "Sì. Hai 14 giorni di prova gratuita, senza carta di credito, per capire se si adatta al tuo flusso."],
    ["Funziona su telefono e computer?", "Sì. Kelunia è una PWA e può essere usata su telefono, tablet e computer."],
    ["Per chi è Kelunia?", "Per qualsiasi organizzazione che prenota spazi: sale, uffici, studi, uffici condivisi, campi o sedi in affitto."],
  ],
};

copy.fr = {
  ...copy.en,
  nav: "Navigation principale",
  login: "Connexion",
  eyebrow: "Moins de chaos. Plus de clarté.",
  title: "Gestion simple pour espaces partagés.",
  intro: "Kelunia vous aide à gérer les réservations, les espaces, les équipes, les horaires récurrents et les accès par rôle sans chaos.",
  trial: "Commencer l'essai gratuit",
  why: "Pourquoi Kelunia",
  whyTitle: "Moins de messages, moins de conflits, plus de clarté.",
  whyText: "Quand plusieurs personnes utilisent les mêmes espaces, les réservations doivent être claires, visibles et faciles à contrôler.",
  featuresEyebrow: "Fonctions clés",
  featuresTitle: "Une base solide pour votre communauté.",
  audienceEyebrow: "Pour qui",
  audienceTitle: "Créée pour des lieux utilisés, réservés et partagés.",
  plansEyebrow: "Plans et tarifs",
  plansTitle: "Commencez simplement. Grandissez quand il le faut.",
  plansText: "Standard est pour un lieu actif. Pro ajoute la gestion multi-location, des permissions avancées et une meilleure visibilité, avec une licence par lieu actif.",
  faqTitle: "Questions rapides.",
  problems: [
    ["Aucun chevauchement", "Le système bloque automatiquement les doubles réservations et montre rapidement quel espace est libre et quand."],
    ["Transparence totale", "Tous les collaborateurs voient en temps réel qui occupe l'espace, pour quelle activité et sur quel créneau."],
    ["Accès contrôlé", "Vous décidez qui peut réserver, qui peut annuler et qui peut seulement consulter."],
  ],
  features: [
    ["Calendrier clair", "Réservations par jour, semaine et mois, avec une visibilité rapide pour chaque lieu et espace.", "/calendar.png"],
    ["Salles et ressources", "Organisez tout par lieux et groupes. Chaque réservation reste liée au bon espace, à la bonne équipe et au bon objectif.", "/list.png"],
    ["Réservations récurrentes", "Configurez une fois les réunions hebdomadaires, cours fixes ou réservations répétitives, et Kelunia gère le reste.", "/fixed.png"],
    ["Permissions par rôle", "Les administrateurs contrôlent tout, les collaborateurs réservent et les invités peuvent avoir un accès en lecture seule.", "/settings.png"],
  ],
  audiences: [
    ["🏢", "Salles et espaces communs", "Pour salles de réunion, terrains, espaces de formation ou lieux qui doivent être réservés clairement."],
    ["🎓", "Studios et salles de cours", "Artistes, instructeurs et enseignants gèrent leurs créneaux sans messages perdus."],
    ["💼", "Équipes et bureaux partagés", "Coordination simple pour équipes hybrides. Voyez qui vient et quelles salles sont occupées."],
    ["🏘️", "Associations et résidentiel", "Gestion transparente des espaces communs comme jardin, salle, terrain de sport ou parking. Sans conflits."],
  ],
  plans: [
    ["Trial", "Gratuit", "14 jours", "", "Test complet sans carte bancaire.", ["Toutes les fonctions incluses", "Configuration rapide", "Calendrier, salles et équipes", "Réservations récurrentes"], "Commencer", "/login?mode=trial"],
    ["Standard", "€14.99", "par lieu / mois", "ou €149 / an", "Pour un lieu actif qui a besoin de réservations claires.", ["1 lieu actif", "Calendrier jour / semaine / mois", "Salles et ressources", "Membres illimités", "Rôles basiques", "Notifications email", "Export basique"], "Choisir Standard", "/login?mode=trial"],
    ["Pro", "€49", "par workspace / mois", "ou €490 / an", "Pour les équipes qui gèrent plusieurs lieux ensemble.", ["Tout Standard", "Gestion multi-location", "Licence par lieu actif", "Permissions avancées", "Approbations de réservations", "Analytics basique", "Audit log"], "Choisir Pro", "/login?mode=trial"],
    ["Business", "Contact", "pour organisations", "", "Pour flux spéciaux, onboarding et intégration personnalisée.", ["Tout Pro", "Onboarding personnalisé", "Import de données", "Intégrations custom", "Support prioritaire", "Limites personnalisées"], "Contactez-nous", "mailto:contact@kelunia.com"],
  ],
  faqs: [
    ["Comment fonctionnent les licences ?", "Chaque lieu actif nécessite une licence. Standard est pour un seul lieu, tandis que Pro est destiné aux équipes qui gèrent plusieurs lieux ensemble."],
    ["Puis-je tester gratuitement ?", "Oui. Vous avez 14 jours d'essai gratuit, sans carte bancaire, pour voir si cela convient à votre fonctionnement."],
    ["Cela fonctionne sur téléphone et ordinateur ?", "Oui. Kelunia est une PWA et peut être utilisée sur téléphone, tablette et ordinateur."],
    ["Pour qui est Kelunia ?", "Pour toute organisation qui réserve des espaces : salles, bureaux, studios, bureaux partagés, terrains ou lieux à louer."],
  ],
};

copy.pt = {
  ...copy.en,
  nav: "Navegação principal",
  login: "Entrar",
  eyebrow: "Menos caos. Mais clareza.",
  title: "Gestão simples para espaços partilhados.",
  intro: "Kelunia ajuda a gerir reservas, espaços, equipas, horários recorrentes e acesso por funções sem caos.",
  trial: "Começar teste gratuito",
  why: "Porquê Kelunia",
  whyTitle: "Menos mensagens, menos conflitos, mais clareza.",
  whyText: "Quando várias pessoas usam os mesmos espaços, as reservas precisam de ser claras, visíveis e fáceis de controlar.",
  featuresEyebrow: "Funcionalidades chave",
  featuresTitle: "Uma base sólida para a sua comunidade.",
  audienceEyebrow: "Para quem",
  audienceTitle: "Criada para locais que se usam, reservam e partilham.",
  plansEyebrow: "Planos e preços",
  plansTitle: "Comece simples. Cresça quando precisar.",
  plansText: "Standard é para uma localização ativa. Pro acrescenta gestão multi-location, permissões avançadas e melhor visibilidade, mantendo a licença por localização ativa.",
  faqTitle: "Perguntas rápidas.",
  problems: [
    ["Sem sobreposições", "O sistema bloqueia automaticamente reservas duplicadas e mostra rapidamente que espaço está livre e quando."],
    ["Transparência total", "Todos os colaboradores veem em tempo real quem ocupa o espaço, para que atividade e em que intervalo."],
    ["Acesso controlado", "Decide quem pode reservar, quem pode cancelar e quem pode apenas visualizar."],
  ],
  features: [
    ["Calendário claro", "Reservas por dia, semana e mês, com visibilidade rápida para cada localização e espaço.", "/calendar.png"],
    ["Salas e recursos", "Organize tudo por localizações e grupos. Cada reserva fica ligada ao espaço, equipa e objetivo corretos.", "/list.png"],
    ["Reservas recorrentes", "Configure uma vez reuniões semanais, aulas fixas ou reservas repetitivas, e Kelunia ocupa o resto.", "/fixed.png"],
    ["Permissões por função", "Administradores controlam tudo, colaboradores reservam e convidados podem ter apenas visualização.", "/settings.png"],
  ],
  audiences: [
    ["🏢", "Salas e espaços comuns", "Para salas de reunião, campos, espaços de formação ou localizações que precisam de reservas claras."],
    ["🎓", "Estúdios e salas de aula", "Artistas, instrutores e professores gerem os seus horários sem mensagens perdidas."],
    ["💼", "Equipas e escritórios partilhados", "Coordenação simples para equipas híbridas. Veja quem vem e que salas estão ocupadas."],
    ["🏘️", "Associações e residencial", "Gestão transparente para espaços comuns como jardim, sala, campo desportivo ou estacionamento. Sem conflitos."],
  ],
  plans: [
    ["Trial", "Grátis", "14 dias", "", "Teste completo sem cartão de crédito.", ["Todas as funcionalidades incluídas", "Setup rápido", "Calendário, salas e equipas", "Reservas recorrentes"], "Começar agora", "/login?mode=trial"],
    ["Standard", "€14.99", "por localização / mês", "ou €149 / ano", "Para uma localização ativa que precisa de reservas claras.", ["1 localização ativa", "Calendário dia / semana / mês", "Salas e recursos", "Membros ilimitados", "Funções básicas", "Notificações email", "Export básico"], "Escolher Standard", "/login?mode=trial"],
    ["Pro", "€49", "por workspace / mês", "ou €490 / ano", "Para equipas que gerem várias localizações em conjunto.", ["Tudo do Standard", "Gestão multi-location", "Licença por localização ativa", "Permissões avançadas", "Aprovações de reservas", "Analytics básico", "Audit log"], "Escolher Pro", "/login?mode=trial"],
    ["Business", "Contacto", "para organizações", "", "Para fluxos especiais, onboarding e integração personalizada.", ["Tudo do Pro", "Onboarding personalizado", "Importação de dados", "Integrações custom", "Suporte prioritário", "Limites personalizados"], "Contacte-nos", "mailto:contact@kelunia.com"],
  ],
  faqs: [
    ["Como funcionam as licenças?", "Cada localização ativa precisa de uma licença. Standard é para uma única localização, enquanto Pro é para equipas que gerem várias localizações em conjunto."],
    ["Posso testar grátis?", "Sim. Tem 14 dias de teste gratuito, sem cartão de crédito, para ver se se adapta ao seu fluxo."],
    ["Funciona no telefone e no computador?", "Sim. Kelunia é uma PWA e pode ser usada no telefone, tablet e computador."],
    ["Para quem é Kelunia?", "Para qualquer organização que reserve espaços: salas, escritórios, estúdios, escritórios partilhados, campos ou localizações de aluguer."],
  ],
};

function LandingCta({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("mailto:")) {
    return <a href={href} className="secondary-button">{children}</a>;
  }

  return <Link href={href} className="secondary-button">{children}</Link>;
}

export default function LandingPage() {
  const [language, setLanguage] = useState<SupportedLocale>("ro");
  const text = copy[language] || copy.ro;

  return (
    <main className="landing-shell">
      <AppEntryRedirect />

      <div className="landing-public-content">
        <nav className="landing-nav" aria-label={text.nav}>
          <Link href="/" className="landing-brand" aria-label="Kelunia">
            <img src="/icon-192.png" alt="" />
            <span>Kelunia</span>
          </Link>

          <div className="landing-nav-actions">
            <label className="language-selector">
              <select value={language} onChange={(event) => setLanguage(event.target.value as SupportedLocale)}>
                {supportedLocales.map((locale) => (
                  <option key={locale.code} value={locale.code}>{locale.label}</option>
                ))}
              </select>
            </label>
            <Link href="/login" className="primary-link">{text.login}</Link>
          </div>
        </nav>

        <section className="landing-hero">
          <div className="landing-hero-content">
            <span className="eyebrow">{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.intro}</p>
            <div className="landing-hero-actions">
              <Link href="/login" className="primary-link">{text.login}</Link>
              <Link href="/login?mode=trial" className="secondary-button">{text.trial}</Link>
            </div>
          </div>
        </section>

        <section className="landing-section landing-problems" aria-labelledby="problems-title">
          <div className="landing-section-head">
            <span className="eyebrow">{text.why}</span>
            <h2 id="problems-title">{text.whyTitle}</h2>
            <p>{text.whyText}</p>
          </div>

          <div className="landing-problem-grid">
            {text.problems.map(([title, body]) => (
              <article key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="features" aria-labelledby="features-title">
          <div className="landing-section-head">
            <span className="eyebrow">{text.featuresEyebrow}</span>
            <h2 id="features-title">{text.featuresTitle}</h2>
          </div>

          <div className="landing-feature-grid">
            {text.features.map(([title, body, icon]) => (
              <article className="landing-feature-card" key={title}>
                <img src={icon} alt="" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-audience" aria-labelledby="audience-title">
          <div className="landing-section-head">
            <span className="eyebrow">{text.audienceEyebrow}</span>
            <h2 id="audience-title">{text.audienceTitle}</h2>
          </div>

          <div className="landing-audience-grid">
            {text.audiences.map(([icon, title, body]) => (
              <article key={title}>
                <span aria-hidden="true">{icon}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="plans" aria-labelledby="plans-title">
          <div className="landing-section-head">
            <span className="eyebrow">{text.plansEyebrow}</span>
            <h2 id="plans-title">{text.plansTitle}</h2>
            <p>{text.plansText}</p>
          </div>

          <div className="landing-plan-grid">
            {text.plans.map(([name, price, note, yearly, description, items, cta, href]) => (
              <article className="landing-plan-card" key={name as string}>
                <div>
                  <span>{name}</span>
                  <strong>{price}</strong>
                  <small>{note}</small>
                  {yearly ? <em>{yearly}</em> : null}
                </div>
                <p>{description}</p>
                <ul>
                  {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                </ul>
                <LandingCta href={href as string}>{cta as string}</LandingCta>
              </article>
            ))}
          </div>
        </section>

        <CommunityApplicationSection />

        <section className="landing-section landing-faq" aria-labelledby="faq-title">
          <div className="landing-section-head">
            <span className="eyebrow">{text.faqEyebrow}</span>
            <h2 id="faq-title">{text.faqTitle}</h2>
          </div>

          <div className="landing-faq-list">
            {text.faqs.map(([question, answer]) => (
              <article key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <LandingNewsletterSection />
        <LandingFinalCta />
        <footer className="landing-legal-footer">
          <LegalLinks />
        </footer>
      </div>
    </main>
  );
}
