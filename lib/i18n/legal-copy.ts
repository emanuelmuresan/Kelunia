import type { SupportedLocale } from "@/lib/i18n/app-copy-catalog";

export type LegalPageKey = "privacy" | "terms" | "cookies" | "deleteAccount" | "refund" | "contact";

export type LegalPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  updatedLabel: string;
  updatedAt: string;
  languageLabel: string;
  languageNote: string;
  sections: Array<{
    title: string;
    body?: string;
    items?: string[];
  }>;
  deleteAccount?: {
    actionEyebrow: string;
    actionTitle: string;
    loading: string;
    signedInAs: string;
    notSignedIn: string;
    confirmationLabel: string;
    confirmationRequired: string;
    button: string;
    deleting: string;
    login: string;
    success: string;
    error: string;
  };
};

const updatedAt: Record<SupportedLocale, string> = {
  ro: "29 mai 2026",
  en: "May 29, 2026",
  es: "29 de mayo de 2026",
  it: "29 maggio 2026",
  fr: "29 mai 2026",
  pt: "29 de maio de 2026",
};

const shared = {
  ro: {
    eyebrow: "Legal",
    updatedLabel: "Ultima actualizare",
    languageLabel: "Limba",
    languageNote: "Această pagină este afișată în {{language}}.",
    contact: "Pentru întrebări sau cereri, scrie la support@kelunia.com.",
  },
  en: {
    eyebrow: "Legal",
    updatedLabel: "Last updated",
    languageLabel: "Language",
    languageNote: "This page is shown in {{language}}.",
    contact: "For questions or requests, email support@kelunia.com.",
  },
  es: {
    eyebrow: "Legal",
    updatedLabel: "Última actualización",
    languageLabel: "Idioma",
    languageNote: "Esta página se muestra en {{language}}.",
    contact: "Para preguntas o solicitudes, escribe a support@kelunia.com.",
  },
  it: {
    eyebrow: "Legale",
    updatedLabel: "Ultimo aggiornamento",
    languageLabel: "Lingua",
    languageNote: "Questa pagina è mostrata in {{language}}.",
    contact: "Per domande o richieste, scrivi a support@kelunia.com.",
  },
  fr: {
    eyebrow: "Juridique",
    updatedLabel: "Dernière mise à jour",
    languageLabel: "Langue",
    languageNote: "Cette page est affichée en {{language}}.",
    contact: "Pour toute question ou demande, écrivez à support@kelunia.com.",
  },
  pt: {
    eyebrow: "Legal",
    updatedLabel: "Última atualização",
    languageLabel: "Idioma",
    languageNote: "Esta página é apresentada em {{language}}.",
    contact: "Para perguntas ou pedidos, escreva para support@kelunia.com.",
  },
};

export const privacyCopy: Record<SupportedLocale, LegalPageCopy> = {
  ro: {
    ...shared.ro,
    updatedAt: updatedAt.ro,
    title: "Politica de confidențialitate",
    description: "Această politică explică modul în care Kelunia colectează, folosește, stochează și protejează datele personale în site, PWA și aplicațiile mobile.",
    sections: [
      { title: "1. Cine suntem", body: "Kelunia este un serviciu pentru administrarea programărilor și spațiilor comune. Operatorul serviciului poate fi contactat la support@kelunia.com." },
      { title: "2. Date colectate", items: ["Date de cont: nume, email, limbă, rol, status de autentificare.", "Date despre locații: nume locație, săli, grupuri, roluri, permisiuni și coduri de acces.", "Date despre programări: date, ore, săli, grupuri, motiv, programări recurente și istoric.", "Date de securitate și audit: modificări, acțiuni administrative, tokenuri de notificări și informații tehnice necesare protecției serviciului.", "Mesaje de suport, cereri din landing page și înscrieri la newsletter, dacă alegi să le trimiți."] },
      { title: "3. Cum folosim datele", items: ["Pentru autentificare și administrarea contului.", "Pentru rezervări, grupuri, săli, permisiuni și notificări.", "Pentru emailuri de verificare, resetare parolă, invitații și mesaje operaționale.", "Pentru securitate, audit, prevenirea abuzului și depanare.", "Pentru obligații legale, billing și cerințe de platformă."] },
      { title: "4. Temeiuri", body: "Prelucrăm datele pentru furnizarea serviciului, pentru obligații legale, pentru interese legitime precum securitatea și îmbunătățirea aplicației, sau pe baza consimțământului pentru opțiuni precum notificări și newsletter." },
      { title: "5. Furnizori", items: ["Firebase / Google Cloud pentru autentificare, bază de date, stocare, funcții cloud și notificări push.", "Vercel pentru găzduirea aplicației web și PWA.", "Resend pentru emailuri tranzacționale.", "Apple și Google pentru distribuția aplicațiilor și livrarea notificărilor la nivel de sistem."] },
      { title: "6. Păstrarea datelor", body: "Păstrăm datele cât este necesar pentru funcționare, securitate, audit, billing și obligații legale. După ștergerea contului, datele personale sunt șterse, anonimizate sau reduse, cu excepția informațiilor care trebuie păstrate legal sau operațional." },
      { title: "7. Drepturile tale", items: ["Poți cere acces la datele tale.", "Poți cere corectarea datelor incorecte.", "Poți șterge contul direct din pagina Delete Account.", "Poți retrage consimțământul pentru comunicări opționale.", "Poți cere restricționarea sau opoziția la anumite prelucrări, unde legea permite."] },
      { title: "8. Securitate", body: "Kelunia folosește autentificare, reguli Firebase, control pe roluri, audit și principii de acces minim. Niciun sistem nu este perfect, dar tratăm securitatea ca parte esențială a produsului." },
      { title: "9. Transferuri internaționale", body: "Furnizorii pot procesa date în alte țări. Unde este necesar, transferurile se bazează pe garanțiile oferite de furnizori." },
      { title: "10. Contact", body: shared.ro.contact },
    ],
  },
  en: {
    ...shared.en,
    updatedAt: updatedAt.en,
    title: "Privacy Policy",
    description: "This policy explains how Kelunia collects, uses, stores and protects personal data on the website, PWA and mobile apps.",
    sections: [
      { title: "1. Who we are", body: "Kelunia is a service for scheduling and shared-space management. You can contact the service operator at support@kelunia.com." },
      { title: "2. Data we collect", items: ["Account data: name, email, language, role and authentication status.", "Location data: location name, rooms, groups, roles, permissions and access codes.", "Booking data: dates, times, rooms, groups, reason, recurring schedules and history.", "Security and audit data: changes, administrative actions, notification tokens and technical data needed to protect the service.", "Support messages, landing page requests and newsletter signups, when you choose to send them."] },
      { title: "3. How we use data", items: ["To authenticate you and manage your account.", "To provide bookings, groups, rooms, permissions and notifications.", "To send verification, password reset, invitation and operational emails.", "For security, audit, abuse prevention and troubleshooting.", "For legal, billing and platform requirements."] },
      { title: "4. Legal bases", body: "We process data to provide the service, comply with legal obligations, pursue legitimate interests such as security and product improvement, or based on consent for options such as notifications and newsletters." },
      { title: "5. Providers", items: ["Firebase / Google Cloud for authentication, database, storage, cloud functions and push notifications.", "Vercel for web and PWA hosting.", "Resend for transactional emails.", "Apple and Google for app distribution and operating-system push delivery."] },
      { title: "6. Retention", body: "We keep data as long as needed for operation, security, audit, billing and legal obligations. After account deletion, personal data is deleted, anonymized or minimized, except where retention is legally or operationally required." },
      { title: "7. Your rights", items: ["You can request access to your data.", "You can request correction of inaccurate data.", "You can delete your account directly from the Delete Account page.", "You can withdraw consent for optional communications.", "You can request restriction or objection to certain processing where the law allows."] },
      { title: "8. Security", body: "Kelunia uses authentication, Firebase rules, role-based access, audit records and least-privilege design. No system is perfect, but security is treated as a core product requirement." },
      { title: "9. International transfers", body: "Providers may process data in other countries. Where required, transfers rely on safeguards provided by those providers." },
      { title: "10. Contact", body: shared.en.contact },
    ],
  },
  es: {
    ...shared.es,
    updatedAt: updatedAt.es,
    title: "Política de privacidad",
    description: "Esta política explica cómo Kelunia recopila, usa, almacena y protege datos personales en el sitio web, PWA y apps móviles.",
    sections: [
      { title: "1. Quiénes somos", body: "Kelunia es un servicio para gestionar reservas y espacios compartidos. Puedes contactar al operador en support@kelunia.com." },
      { title: "2. Datos que recopilamos", items: ["Datos de cuenta: nombre, email, idioma, rol y estado de autenticación.", "Datos de ubicación: nombre, salas, grupos, roles, permisos y códigos de acceso.", "Datos de reservas: fechas, horas, salas, grupos, motivo, reservas recurrentes e historial.", "Datos de seguridad y auditoría: cambios, acciones administrativas, tokens de notificación y datos técnicos necesarios.", "Mensajes de soporte, solicitudes desde landing page y newsletter, si decides enviarlos."] },
      { title: "3. Cómo usamos los datos", items: ["Para autenticarte y administrar tu cuenta.", "Para reservas, grupos, salas, permisos y notificaciones.", "Para emails de verificación, restablecimiento de contraseña, invitaciones y mensajes operativos.", "Para seguridad, auditoría, prevención de abuso y solución de problemas.", "Para requisitos legales, de facturación y de plataformas."] },
      { title: "4. Bases legales", body: "Tratamos datos para prestar el servicio, cumplir obligaciones legales, proteger intereses legítimos como seguridad y mejora del producto, o con consentimiento para opciones como notificaciones y newsletter." },
      { title: "5. Proveedores", items: ["Firebase / Google Cloud para autenticación, base de datos, almacenamiento, funciones cloud y push.", "Vercel para hosting web y PWA.", "Resend para emails transaccionales.", "Apple y Google para distribución de apps y entrega de notificaciones del sistema."] },
      { title: "6. Conservación", body: "Conservamos datos el tiempo necesario para operación, seguridad, auditoría, facturación y obligaciones legales. Tras eliminar la cuenta, los datos personales se eliminan, anonimizan o minimizan, salvo retención necesaria." },
      { title: "7. Tus derechos", items: ["Puedes solicitar acceso a tus datos.", "Puedes pedir corrección de datos incorrectos.", "Puedes eliminar tu cuenta desde Delete Account.", "Puedes retirar consentimiento para comunicaciones opcionales.", "Puedes solicitar restricción u oposición cuando la ley lo permita."] },
      { title: "8. Seguridad", body: "Kelunia usa autenticación, reglas Firebase, acceso por roles, auditoría y acceso mínimo. Ningún sistema es perfecto, pero la seguridad es parte central del producto." },
      { title: "9. Transferencias internacionales", body: "Los proveedores pueden procesar datos en otros países. Cuando sea necesario, las transferencias usan garantías de esos proveedores." },
      { title: "10. Contacto", body: shared.es.contact },
    ],
  },
  it: {
    ...shared.it,
    updatedAt: updatedAt.it,
    title: "Informativa sulla privacy",
    description: "Questa informativa spiega come Kelunia raccoglie, usa, conserva e protegge i dati personali nel sito, nella PWA e nelle app mobili.",
    sections: [
      { title: "1. Chi siamo", body: "Kelunia è un servizio per gestire prenotazioni e spazi condivisi. Puoi contattarci a support@kelunia.com." },
      { title: "2. Dati raccolti", items: ["Dati account: nome, email, lingua, ruolo e stato di autenticazione.", "Dati sede: nome, sale, gruppi, ruoli, permessi e codici di accesso.", "Dati prenotazioni: date, orari, sale, gruppi, motivo, ricorrenze e storico.", "Dati di sicurezza e audit: modifiche, azioni amministrative, token notifiche e dati tecnici necessari.", "Messaggi di supporto, richieste dal sito e iscrizioni newsletter, se inviate."] },
      { title: "3. Uso dei dati", items: ["Per autenticarti e gestire l'account.", "Per prenotazioni, gruppi, sale, permessi e notifiche.", "Per email di verifica, reset password, inviti e messaggi operativi.", "Per sicurezza, audit, prevenzione abusi e supporto.", "Per requisiti legali, billing e piattaforme."] },
      { title: "4. Basi giuridiche", body: "Trattiamo i dati per fornire il servizio, rispettare obblighi legali, perseguire interessi legittimi come sicurezza e miglioramento, o con consenso per notifiche e newsletter." },
      { title: "5. Fornitori", items: ["Firebase / Google Cloud per autenticazione, database, storage, funzioni cloud e push.", "Vercel per hosting web e PWA.", "Resend per email transazionali.", "Apple e Google per distribuzione app e notifiche di sistema."] },
      { title: "6. Conservazione", body: "Conserviamo i dati per il tempo necessario a operatività, sicurezza, audit, billing e obblighi legali. Dopo l'eliminazione dell'account, i dati personali sono eliminati, anonimizzati o ridotti, salvo obblighi di conservazione." },
      { title: "7. Diritti", items: ["Puoi richiedere accesso ai dati.", "Puoi chiedere correzione dei dati inesatti.", "Puoi eliminare l'account dalla pagina Delete Account.", "Puoi revocare il consenso per comunicazioni opzionali.", "Puoi chiedere limitazione o opposizione quando consentito dalla legge."] },
      { title: "8. Sicurezza", body: "Kelunia usa autenticazione, regole Firebase, accesso per ruoli, audit e principio del minimo privilegio. Nessun sistema è perfetto, ma la sicurezza è essenziale." },
      { title: "9. Trasferimenti internazionali", body: "I fornitori possono trattare dati in altri paesi. Dove richiesto, i trasferimenti usano garanzie appropriate." },
      { title: "10. Contatto", body: shared.it.contact },
    ],
  },
  fr: {
    ...shared.fr,
    updatedAt: updatedAt.fr,
    title: "Politique de confidentialité",
    description: "Cette politique explique comment Kelunia collecte, utilise, stocke et protège les données personnelles sur le site, la PWA et les applications mobiles.",
    sections: [
      { title: "1. Qui sommes-nous", body: "Kelunia est un service de gestion des réservations et des espaces partagés. Vous pouvez nous contacter à support@kelunia.com." },
      { title: "2. Données collectées", items: ["Données de compte : nom, email, langue, rôle et état d'authentification.", "Données de lieu : nom, salles, groupes, rôles, permissions et codes d'accès.", "Données de réservation : dates, heures, salles, groupes, motif, récurrences et historique.", "Données de sécurité et d'audit : changements, actions administratives, jetons de notification et données techniques nécessaires.", "Messages de support, demandes du site et inscriptions newsletter, si vous les envoyez."] },
      { title: "3. Utilisation des données", items: ["Pour vous authentifier et gérer votre compte.", "Pour les réservations, groupes, salles, permissions et notifications.", "Pour les emails de vérification, réinitialisation, invitation et messages opérationnels.", "Pour la sécurité, l'audit, la prévention des abus et le dépannage.", "Pour les exigences légales, de facturation et de plateforme."] },
      { title: "4. Bases légales", body: "Nous traitons les données pour fournir le service, respecter les obligations légales, poursuivre des intérêts légitimes comme la sécurité et l'amélioration, ou avec consentement pour notifications et newsletter." },
      { title: "5. Fournisseurs", items: ["Firebase / Google Cloud pour authentification, base de données, stockage, fonctions cloud et push.", "Vercel pour l'hébergement web et PWA.", "Resend pour les emails transactionnels.", "Apple et Google pour la distribution des apps et les notifications système."] },
      { title: "6. Conservation", body: "Nous conservons les données le temps nécessaire au fonctionnement, à la sécurité, à l'audit, à la facturation et aux obligations légales. Après suppression du compte, les données personnelles sont supprimées, anonymisées ou minimisées, sauf conservation requise." },
      { title: "7. Vos droits", items: ["Vous pouvez demander l'accès à vos données.", "Vous pouvez demander la correction de données inexactes.", "Vous pouvez supprimer votre compte depuis Delete Account.", "Vous pouvez retirer le consentement aux communications optionnelles.", "Vous pouvez demander limitation ou opposition lorsque la loi le permet."] },
      { title: "8. Sécurité", body: "Kelunia utilise authentification, règles Firebase, accès par rôle, audit et principe du moindre privilège. Aucun système n'est parfait, mais la sécurité est centrale." },
      { title: "9. Transferts internationaux", body: "Les fournisseurs peuvent traiter les données dans d'autres pays. Si nécessaire, les transferts reposent sur des garanties appropriées." },
      { title: "10. Contact", body: shared.fr.contact },
    ],
  },
  pt: {
    ...shared.pt,
    updatedAt: updatedAt.pt,
    title: "Política de privacidade",
    description: "Esta política explica como a Kelunia recolhe, usa, armazena e protege dados pessoais no site, PWA e apps móveis.",
    sections: [
      { title: "1. Quem somos", body: "A Kelunia é um serviço para gestão de reservas e espaços partilhados. Pode contactar-nos em support@kelunia.com." },
      { title: "2. Dados recolhidos", items: ["Dados de conta: nome, email, idioma, função e estado de autenticação.", "Dados de localização: nome, salas, grupos, funções, permissões e códigos de acesso.", "Dados de reservas: datas, horas, salas, grupos, motivo, recorrências e histórico.", "Dados de segurança e auditoria: alterações, ações administrativas, tokens de notificação e dados técnicos necessários.", "Mensagens de suporte, pedidos do site e subscrições newsletter, se enviados."] },
      { title: "3. Uso dos dados", items: ["Para autenticar e gerir a conta.", "Para reservas, grupos, salas, permissões e notificações.", "Para emails de verificação, reposição de palavra-passe, convites e mensagens operacionais.", "Para segurança, auditoria, prevenção de abuso e resolução de problemas.", "Para requisitos legais, faturação e plataformas."] },
      { title: "4. Bases legais", body: "Tratamos dados para prestar o serviço, cumprir obrigações legais, prosseguir interesses legítimos como segurança e melhoria, ou com consentimento para notificações e newsletter." },
      { title: "5. Fornecedores", items: ["Firebase / Google Cloud para autenticação, base de dados, armazenamento, funções cloud e push.", "Vercel para alojamento web e PWA.", "Resend para emails transacionais.", "Apple e Google para distribuição de apps e notificações do sistema."] },
      { title: "6. Retenção", body: "Mantemos dados pelo tempo necessário à operação, segurança, auditoria, faturação e obrigações legais. Após eliminação da conta, os dados pessoais são eliminados, anonimizados ou minimizados, salvo retenção necessária." },
      { title: "7. Direitos", items: ["Pode pedir acesso aos seus dados.", "Pode pedir correção de dados incorretos.", "Pode eliminar a conta na página Delete Account.", "Pode retirar consentimento para comunicações opcionais.", "Pode pedir limitação ou oposição quando a lei permitir."] },
      { title: "8. Segurança", body: "A Kelunia usa autenticação, regras Firebase, acesso por funções, auditoria e menor privilégio. Nenhum sistema é perfeito, mas a segurança é essencial." },
      { title: "9. Transferências internacionais", body: "Os fornecedores podem tratar dados noutros países. Quando exigido, as transferências usam garantias adequadas." },
      { title: "10. Contacto", body: shared.pt.contact },
    ],
  },
};

export const termsCopy: Record<SupportedLocale, LegalPageCopy> = {
  ro: { ...shared.ro, updatedAt: updatedAt.ro, title: "Termeni și condiții", description: "Acești termeni guvernează accesul și utilizarea Kelunia.", sections: [
    { title: "1. Acceptare", body: "Prin folosirea Kelunia, accepți acești termeni. Dacă folosești Kelunia pentru o organizație, confirmi că ai dreptul să acționezi în numele ei." },
    { title: "2. Serviciul", body: "Kelunia oferă instrumente pentru programări, spații, grupuri, permisiuni, notificări, audit și administrare operațională." },
    { title: "3. Conturi", items: ["Trebuie să folosești date corecte și să protejezi parola.", "Ești responsabil pentru activitatea din contul tău.", "Administratorii răspund de configurarea corectă a locațiilor, utilizatorilor și permisiunilor."] },
    { title: "4. Utilizare acceptabilă", items: ["Nu folosi serviciul pentru activități ilegale, abuzive sau înșelătoare.", "Nu încerca să ocolești securitatea sau să accesezi date fără drept.", "Nu introduce date sensibile ale altor persoane fără permisiune."] },
    { title: "5. Datele organizației", body: "Fiecare organizație este responsabilă pentru propriile reguli, disponibilitatea spațiilor și deciziile operaționale." },
    { title: "6. Planuri și plăți", body: "Unele funcții pot necesita plan plătit sau licență activă. Prețurile, limitele și beneficiile pot fi actualizate." },
    { title: "7. Disponibilitate", body: "Încercăm să menținem serviciul stabil, dar nu garantăm disponibilitate neîntreruptă. Pot exista mentenanță, schimbări sau suspendări necesare." },
    { title: "8. Proprietate intelectuală", body: "Kelunia, designul, software-ul și brandingul aparțin Kelunia sau licențiatorilor săi. Tu păstrezi responsabilitatea pentru datele introduse." },
    { title: "9. Limitarea răspunderii", body: "În limita legii, Kelunia este furnizată ca atare și nu răspundem pentru pierderi indirecte, profit pierdut, date pierdute sau întreruperi operaționale." },
    { title: "10. Încetare", body: "Poți înceta utilizarea oricând. Putem suspenda accesul dacă termenii sunt încălcați sau dacă există risc legal, operațional ori de securitate." },
    { title: "11. Contact", body: shared.ro.contact },
  ] },
  en: { ...shared.en, updatedAt: updatedAt.en, title: "Terms & Conditions", description: "These terms govern your access to and use of Kelunia.", sections: [
    { title: "1. Acceptance", body: "By using Kelunia, you accept these terms. If you use Kelunia for an organization, you confirm that you are authorized to act on its behalf." },
    { title: "2. Service", body: "Kelunia provides tools for bookings, spaces, groups, permissions, notifications, audit and operational administration." },
    { title: "3. Accounts", items: ["You must use accurate information and protect your password.", "You are responsible for activity through your account.", "Administrators are responsible for correctly configuring locations, users and permissions."] },
    { title: "4. Acceptable use", items: ["Do not use the service for unlawful, abusive or misleading activity.", "Do not bypass security or access data without permission.", "Do not enter sensitive data about others without permission."] },
    { title: "5. Organization data", body: "Each organization remains responsible for its own rules, space availability and operational decisions." },
    { title: "6. Plans and payments", body: "Some features may require a paid plan or active license. Prices, limits and benefits may be updated." },
    { title: "7. Availability", body: "We try to keep the service stable, but uninterrupted availability is not guaranteed. Maintenance, changes or suspensions may be necessary." },
    { title: "8. Intellectual property", body: "Kelunia, its design, software and branding belong to Kelunia or its licensors. You remain responsible for the data you add." },
    { title: "9. Limitation of liability", body: "To the extent permitted by law, Kelunia is provided as is and we are not liable for indirect losses, lost profits, lost data or operational interruptions." },
    { title: "10. Termination", body: "You may stop using the service at any time. We may suspend access if the terms are violated or if legal, operational or security risk exists." },
    { title: "11. Contact", body: shared.en.contact },
  ] },
  es: { ...shared.es, updatedAt: updatedAt.es, title: "Términos y condiciones", description: "Estos términos regulan el acceso y uso de Kelunia.", sections: [
    { title: "1. Aceptación", body: "Al usar Kelunia aceptas estos términos. Si lo usas para una organización, confirmas que tienes autorización." },
    { title: "2. Servicio", body: "Kelunia ofrece herramientas para reservas, espacios, grupos, permisos, notificaciones, auditoría y administración." },
    { title: "3. Cuentas", items: ["Debes usar información correcta y proteger tu contraseña.", "Eres responsable de la actividad de tu cuenta.", "Los administradores configuran ubicaciones, usuarios y permisos."] },
    { title: "4. Uso aceptable", items: ["No uses el servicio para actividades ilegales, abusivas o engañosas.", "No intentes saltar la seguridad ni acceder sin permiso.", "No introduzcas datos sensibles de otros sin permiso."] },
    { title: "5. Datos de la organización", body: "Cada organización es responsable de sus reglas, disponibilidad de espacios y decisiones operativas." },
    { title: "6. Planes y pagos", body: "Algunas funciones pueden requerir plan de pago o licencia activa. Precios, límites y beneficios pueden cambiar." },
    { title: "7. Disponibilidad", body: "Intentamos mantener el servicio estable, pero no garantizamos disponibilidad ininterrumpida." },
    { title: "8. Propiedad intelectual", body: "Kelunia, diseño, software y marca pertenecen a Kelunia o sus licenciantes. Tú respondes por los datos añadidos." },
    { title: "9. Limitación de responsabilidad", body: "En la medida permitida por la ley, Kelunia se ofrece tal cual y no respondemos por pérdidas indirectas o interrupciones." },
    { title: "10. Terminación", body: "Puedes dejar de usar el servicio cuando quieras. Podemos suspender acceso ante incumplimientos o riesgos." },
    { title: "11. Contacto", body: shared.es.contact },
  ] },
  it: { ...shared.it, updatedAt: updatedAt.it, title: "Termini e condizioni", description: "Questi termini regolano accesso e uso di Kelunia.", sections: [
    { title: "1. Accettazione", body: "Usando Kelunia accetti questi termini. Se lo usi per un'organizzazione, confermi di essere autorizzato." },
    { title: "2. Servizio", body: "Kelunia offre strumenti per prenotazioni, spazi, gruppi, permessi, notifiche, audit e amministrazione." },
    { title: "3. Account", items: ["Devi usare dati corretti e proteggere la password.", "Sei responsabile dell'attività del tuo account.", "Gli amministratori configurano sedi, utenti e permessi."] },
    { title: "4. Uso accettabile", items: ["Non usare il servizio per attività illegali, abusive o ingannevoli.", "Non aggirare la sicurezza né accedere senza permesso.", "Non inserire dati sensibili di altri senza permesso."] },
    { title: "5. Dati dell'organizzazione", body: "Ogni organizzazione è responsabile delle proprie regole, disponibilità degli spazi e decisioni operative." },
    { title: "6. Piani e pagamenti", body: "Alcune funzioni possono richiedere un piano a pagamento o licenza attiva. Prezzi, limiti e benefici possono cambiare." },
    { title: "7. Disponibilità", body: "Cerchiamo stabilità, ma non garantiamo disponibilità ininterrotta." },
    { title: "8. Proprietà intellettuale", body: "Kelunia, design, software e brand appartengono a Kelunia o ai suoi licenzianti. Resti responsabile dei dati inseriti." },
    { title: "9. Limitazione di responsabilità", body: "Nei limiti di legge, Kelunia è fornita così com'è e non rispondiamo per perdite indirette o interruzioni." },
    { title: "10. Chiusura", body: "Puoi smettere di usare il servizio quando vuoi. Possiamo sospendere l'accesso in caso di violazioni o rischi." },
    { title: "11. Contatto", body: shared.it.contact },
  ] },
  fr: { ...shared.fr, updatedAt: updatedAt.fr, title: "Conditions générales", description: "Ces conditions régissent l'accès et l'utilisation de Kelunia.", sections: [
    { title: "1. Acceptation", body: "En utilisant Kelunia, vous acceptez ces conditions. Pour une organisation, vous confirmez être autorisé." },
    { title: "2. Service", body: "Kelunia fournit des outils pour réservations, espaces, groupes, permissions, notifications, audit et administration." },
    { title: "3. Comptes", items: ["Vous devez fournir des informations exactes et protéger votre mot de passe.", "Vous êtes responsable de l'activité du compte.", "Les administrateurs configurent lieux, utilisateurs et permissions."] },
    { title: "4. Usage acceptable", items: ["N'utilisez pas le service pour des activités illégales, abusives ou trompeuses.", "Ne contournez pas la sécurité et n'accédez pas sans autorisation.", "N'ajoutez pas de données sensibles de tiers sans permission."] },
    { title: "5. Données de l'organisation", body: "Chaque organisation reste responsable de ses règles, disponibilités et décisions opérationnelles." },
    { title: "6. Plans et paiements", body: "Certaines fonctions peuvent nécessiter un plan payant ou une licence active. Prix, limites et bénéfices peuvent changer." },
    { title: "7. Disponibilité", body: "Nous visons la stabilité, mais ne garantissons pas une disponibilité ininterrompue." },
    { title: "8. Propriété intellectuelle", body: "Kelunia, son design, logiciel et branding appartiennent à Kelunia ou ses concédants. Vous êtes responsable des données ajoutées." },
    { title: "9. Limitation de responsabilité", body: "Dans les limites de la loi, Kelunia est fourni tel quel et nous ne répondons pas des pertes indirectes ou interruptions." },
    { title: "10. Résiliation", body: "Vous pouvez arrêter d'utiliser le service à tout moment. Nous pouvons suspendre l'accès en cas de violation ou de risque." },
    { title: "11. Contact", body: shared.fr.contact },
  ] },
  pt: { ...shared.pt, updatedAt: updatedAt.pt, title: "Termos e condições", description: "Estes termos regulam o acesso e uso da Kelunia.", sections: [
    { title: "1. Aceitação", body: "Ao usar a Kelunia aceita estes termos. Se usar por uma organização, confirma estar autorizado." },
    { title: "2. Serviço", body: "A Kelunia fornece ferramentas para reservas, espaços, grupos, permissões, notificações, auditoria e administração." },
    { title: "3. Contas", items: ["Deve usar informação correta e proteger a palavra-passe.", "É responsável pela atividade da sua conta.", "Administradores configuram localizações, utilizadores e permissões."] },
    { title: "4. Uso aceitável", items: ["Não use o serviço para atividades ilegais, abusivas ou enganosas.", "Não contorne segurança nem aceda sem permissão.", "Não introduza dados sensíveis de terceiros sem permissão."] },
    { title: "5. Dados da organização", body: "Cada organização é responsável pelas suas regras, disponibilidade dos espaços e decisões operacionais." },
    { title: "6. Planos e pagamentos", body: "Algumas funções podem exigir plano pago ou licença ativa. Preços, limites e benefícios podem mudar." },
    { title: "7. Disponibilidade", body: "Tentamos manter estabilidade, mas não garantimos disponibilidade ininterrupta." },
    { title: "8. Propriedade intelectual", body: "Kelunia, design, software e marca pertencem à Kelunia ou licenciantes. Continua responsável pelos dados adicionados." },
    { title: "9. Limitação de responsabilidade", body: "Nos limites da lei, Kelunia é fornecida como está e não respondemos por perdas indiretas ou interrupções." },
    { title: "10. Terminação", body: "Pode deixar de usar o serviço a qualquer momento. Podemos suspender acesso por violação ou risco." },
    { title: "11. Contacto", body: shared.pt.contact },
  ] },
};

export const cookiesCopy: Record<SupportedLocale, LegalPageCopy> = {
  ro: { ...shared.ro, updatedAt: updatedAt.ro, title: "Politica de cookies", description: "Această pagină explică folosirea cookie-urilor, local storage și tehnologiilor similare.", sections: [
    { title: "1. Ce sunt", body: "Cookie-urile și local storage sunt date mici salvate pe dispozitiv pentru sesiuni, preferințe și funcții esențiale." },
    { title: "2. Ce folosește Kelunia", items: ["Stocare esențială pentru autentificare și securitate.", "Preferințe precum limba, interfața, blocarea aplicației și notificările.", "Date PWA pentru instalare, funcționare offline, push și încărcare stabilă.", "Date operaționale pentru prevenirea erorilor și păstrarea stării aplicației."] },
    { title: "3. Analytics și marketing", body: "Kelunia nu folosește implicit cookie-uri publicitare neesențiale. Dacă vor fi adăugate, politica va fi actualizată și se vor oferi controale de consimțământ unde este necesar." },
    { title: "4. Terți", body: "Firebase, Vercel, Resend, Apple și Google pot folosi tehnologii similare pentru autentificare, hosting, email, push sau distribuție app." },
    { title: "5. Control", body: "Poți gestiona cookie-urile din browser sau sistemul de operare. Blocarea stocării esențiale poate opri loginul, PWA, notificările sau alte funcții." },
    { title: "6. Contact", body: shared.ro.contact },
  ] },
  en: { ...shared.en, updatedAt: updatedAt.en, title: "Cookie Policy", description: "This page explains the use of cookies, local storage and similar technologies.", sections: [
    { title: "1. What they are", body: "Cookies and local storage are small data items stored on your device for sessions, preferences and essential features." },
    { title: "2. What Kelunia uses", items: ["Essential storage for authentication and security.", "Preferences such as language, interface, app lock and notifications.", "PWA data for installation, offline behavior, push and stable loading.", "Operational data for error prevention and preserving app state."] },
    { title: "3. Analytics and marketing", body: "Kelunia does not use non-essential advertising cookies by default. If added later, this policy will be updated and consent controls will be provided where required." },
    { title: "4. Third parties", body: "Firebase, Vercel, Resend, Apple and Google may use similar technologies for authentication, hosting, email, push or app distribution." },
    { title: "5. Control", body: "You can manage cookies through your browser or operating system. Blocking essential storage may prevent login, PWA, notifications or other features." },
    { title: "6. Contact", body: shared.en.contact },
  ] },
  es: { ...shared.es, updatedAt: updatedAt.es, title: "Política de cookies", description: "Esta página explica el uso de cookies, almacenamiento local y tecnologías similares.", sections: [
    { title: "1. Qué son", body: "Cookies y almacenamiento local son pequeños datos guardados en tu dispositivo para sesiones, preferencias y funciones esenciales." },
    { title: "2. Qué usa Kelunia", items: ["Almacenamiento esencial para autenticación y seguridad.", "Preferencias como idioma, interfaz, bloqueo y notificaciones.", "Datos PWA para instalación, offline, push y carga estable.", "Datos operativos para prevenir errores y mantener estado."] },
    { title: "3. Analytics y marketing", body: "Kelunia no usa por defecto cookies publicitarias no esenciales. Si se añaden, se actualizará esta política y se ofrecerán controles de consentimiento cuando sea necesario." },
    { title: "4. Terceros", body: "Firebase, Vercel, Resend, Apple y Google pueden usar tecnologías similares para autenticación, hosting, email, push o distribución." },
    { title: "5. Control", body: "Puedes gestionar cookies desde el navegador o sistema operativo. Bloquear almacenamiento esencial puede impedir login, PWA, notificaciones u otras funciones." },
    { title: "6. Contacto", body: shared.es.contact },
  ] },
  it: { ...shared.it, updatedAt: updatedAt.it, title: "Cookie Policy", description: "Questa pagina spiega l'uso di cookie, local storage e tecnologie simili.", sections: [
    { title: "1. Cosa sono", body: "Cookie e local storage sono piccoli dati salvati sul dispositivo per sessioni, preferenze e funzioni essenziali." },
    { title: "2. Cosa usa Kelunia", items: ["Storage essenziale per autenticazione e sicurezza.", "Preferenze come lingua, interfaccia, blocco app e notifiche.", "Dati PWA per installazione, offline, push e caricamento stabile.", "Dati operativi per prevenire errori e mantenere stato."] },
    { title: "3. Analytics e marketing", body: "Kelunia non usa di default cookie pubblicitari non essenziali. Se aggiunti, la policy sarà aggiornata e saranno forniti controlli di consenso dove richiesto." },
    { title: "4. Terze parti", body: "Firebase, Vercel, Resend, Apple e Google possono usare tecnologie simili per autenticazione, hosting, email, push o distribuzione app." },
    { title: "5. Controllo", body: "Puoi gestire i cookie dal browser o sistema operativo. Bloccare storage essenziale può impedire login, PWA, notifiche o altre funzioni." },
    { title: "6. Contatto", body: shared.it.contact },
  ] },
  fr: { ...shared.fr, updatedAt: updatedAt.fr, title: "Politique de cookies", description: "Cette page explique l'utilisation des cookies, du stockage local et des technologies similaires.", sections: [
    { title: "1. Définition", body: "Les cookies et le stockage local sont de petites données enregistrées sur votre appareil pour sessions, préférences et fonctions essentielles." },
    { title: "2. Ce que Kelunia utilise", items: ["Stockage essentiel pour authentification et sécurité.", "Préférences comme langue, interface, verrouillage et notifications.", "Données PWA pour installation, hors ligne, push et chargement stable.", "Données opérationnelles pour prévenir les erreurs et garder l'état."] },
    { title: "3. Analytics et marketing", body: "Kelunia n'utilise pas par défaut de cookies publicitaires non essentiels. Si ajoutés, cette politique sera mise à jour et des contrôles de consentement seront fournis si requis." },
    { title: "4. Tiers", body: "Firebase, Vercel, Resend, Apple et Google peuvent utiliser des technologies similaires pour authentification, hébergement, email, push ou distribution." },
    { title: "5. Contrôle", body: "Vous pouvez gérer les cookies dans le navigateur ou le système. Bloquer le stockage essentiel peut empêcher login, PWA, notifications ou autres fonctions." },
    { title: "6. Contact", body: shared.fr.contact },
  ] },
  pt: { ...shared.pt, updatedAt: updatedAt.pt, title: "Política de cookies", description: "Esta página explica o uso de cookies, armazenamento local e tecnologias semelhantes.", sections: [
    { title: "1. O que são", body: "Cookies e armazenamento local são pequenos dados guardados no dispositivo para sessões, preferências e funções essenciais." },
    { title: "2. O que a Kelunia usa", items: ["Armazenamento essencial para autenticação e segurança.", "Preferências como idioma, interface, bloqueio e notificações.", "Dados PWA para instalação, offline, push e carregamento estável.", "Dados operacionais para prevenir erros e manter estado."] },
    { title: "3. Analytics e marketing", body: "A Kelunia não usa por defeito cookies publicitários não essenciais. Se forem adicionados, esta política será atualizada e haverá controlos de consentimento quando exigido." },
    { title: "4. Terceiros", body: "Firebase, Vercel, Resend, Apple e Google podem usar tecnologias semelhantes para autenticação, alojamento, email, push ou distribuição." },
    { title: "5. Controlo", body: "Pode gerir cookies no navegador ou sistema operativo. Bloquear armazenamento essencial pode impedir login, PWA, notificações ou outras funções." },
    { title: "6. Contacto", body: shared.pt.contact },
  ] },
};

export const deleteAccountCopy: Record<SupportedLocale, LegalPageCopy> = {
  ro: { ...shared.ro, updatedAt: updatedAt.ro, title: "Ștergere cont", description: "Aici îți poți șterge contul Kelunia direct, cu confirmare explicită ca să nu se întâmple din greșeală.", deleteAccount: {
    actionEyebrow: "Acțiune cont",
    actionTitle: "Șterge contul tău",
    loading: "Verificăm sesiunea...",
    signedInAs: "Ești autentificat ca {{email}}. Pentru confirmare, scrie exact această adresă de email.",
    notSignedIn: "Trebuie să fii autentificat ca să poți șterge contul.",
    confirmationLabel: "Confirmă emailul contului",
    confirmationRequired: "Scrie exact emailul contului pentru confirmare.",
    button: "Șterge definitiv contul",
    deleting: "Se șterge...",
    login: "Intră în cont",
    success: "Contul a fost șters. Vei fi deconectat.",
    error: "Contul nu a putut fi șters. Reautentifică-te și încearcă din nou.",
  }, sections: [
    { title: "1. Ce se șterge", items: ["Contul de autentificare Kelunia.", "Profilul personal, preferințele, limba, setările de notificări și tokenurile push.", "Înscrierea la newsletter asociată emailului, dacă există.", "Date personale din sistemele controlate de Kelunia, unde nu există obligație de păstrare."] },
    { title: "2. Ce poate rămâne", body: "Programările, auditul și datele operaționale ale unei organizații pot rămâne pentru continuitate, securitate și responsabilitate. Unde este posibil, identificatorii personali sunt eliminați sau reduși." },
    { title: "3. Confirmare", body: "Pentru siguranță, trebuie să fii logat și să scrii emailul contului. Această acțiune este ireversibilă." },
    { title: "4. Abonamente", body: "Ștergerea contului nu anulează automat un abonament gestionat printr-un app store, furnizor de plăți sau administrator de organizație." },
    { title: "5. Ajutor", body: "Dacă nu poți intra în cont, scrie la support@kelunia.com de pe emailul contului." },
  ] },
  en: { ...shared.en, updatedAt: updatedAt.en, title: "Delete Account", description: "You can delete your Kelunia account directly here, with explicit confirmation to avoid mistakes.", deleteAccount: {
    actionEyebrow: "Account action",
    actionTitle: "Delete your account",
    loading: "Checking session...",
    signedInAs: "You are signed in as {{email}}. To confirm, type this exact email address.",
    notSignedIn: "You must be signed in to delete your account.",
    confirmationLabel: "Confirm account email",
    confirmationRequired: "Type the exact account email to confirm.",
    button: "Permanently delete account",
    deleting: "Deleting...",
    login: "Sign in",
    success: "The account was deleted. You will be signed out.",
    error: "The account could not be deleted. Please sign in again and try once more.",
  }, sections: [
    { title: "1. What is deleted", items: ["Your Kelunia authentication account.", "Your personal profile, preferences, language, notification settings and push tokens.", "Newsletter subscription linked to your email, if present.", "Personal data in Kelunia-controlled systems where no retention obligation applies."] },
    { title: "2. What may remain", body: "Bookings, audit history and operational organization records may remain for continuity, security and accountability. Where possible, personal identifiers are removed or minimized." },
    { title: "3. Confirmation", body: "For safety, you must be signed in and type the account email. This action is irreversible." },
    { title: "4. Subscriptions", body: "Deleting the account does not automatically cancel a subscription managed by an app store, payment provider or organization administrator." },
    { title: "5. Help", body: "If you cannot access your account, email support@kelunia.com from the account email address." },
  ] },
  es: { ...shared.es, updatedAt: updatedAt.es, title: "Eliminar cuenta", description: "Puedes eliminar tu cuenta Kelunia directamente aquí, con confirmación explícita para evitar errores.", deleteAccount: {
    actionEyebrow: "Acción de cuenta", actionTitle: "Eliminar tu cuenta", loading: "Comprobando sesión...", signedInAs: "Has iniciado sesión como {{email}}. Para confirmar, escribe exactamente este email.", notSignedIn: "Debes iniciar sesión para eliminar la cuenta.", confirmationLabel: "Confirma el email", confirmationRequired: "Escribe exactamente el email de la cuenta.", button: "Eliminar cuenta definitivamente", deleting: "Eliminando...", login: "Entrar", success: "La cuenta fue eliminada. Se cerrará la sesión.", error: "No se pudo eliminar la cuenta. Inicia sesión de nuevo e inténtalo otra vez.",
  }, sections: [
    { title: "1. Qué se elimina", items: ["Cuenta de autenticación Kelunia.", "Perfil, preferencias, idioma, notificaciones y tokens push.", "Suscripción newsletter vinculada al email, si existe.", "Datos personales en sistemas Kelunia cuando no haya obligación de conservación."] },
    { title: "2. Qué puede permanecer", body: "Reservas, auditoría y registros operativos pueden permanecer por continuidad, seguridad y responsabilidad. Cuando sea posible, los identificadores personales se eliminan o minimizan." },
    { title: "3. Confirmación", body: "Debes estar conectado y escribir el email de la cuenta. La acción es irreversible." },
    { title: "4. Suscripciones", body: "Eliminar la cuenta no cancela automáticamente suscripciones gestionadas por app store, proveedor de pagos o administrador." },
    { title: "5. Ayuda", body: "Si no puedes acceder, escribe a support@kelunia.com desde el email de la cuenta." },
  ] },
  it: { ...shared.it, updatedAt: updatedAt.it, title: "Elimina account", description: "Puoi eliminare direttamente il tuo account Kelunia con conferma esplicita per evitare errori.", deleteAccount: {
    actionEyebrow: "Azione account", actionTitle: "Elimina il tuo account", loading: "Verifica sessione...", signedInAs: "Hai effettuato l'accesso come {{email}}. Per confermare, scrivi esattamente questa email.", notSignedIn: "Devi accedere per eliminare l'account.", confirmationLabel: "Conferma email account", confirmationRequired: "Scrivi esattamente l'email dell'account.", button: "Elimina definitivamente", deleting: "Eliminazione...", login: "Accedi", success: "Account eliminato. Verrai disconnesso.", error: "Impossibile eliminare l'account. Accedi di nuovo e riprova.",
  }, sections: [
    { title: "1. Cosa viene eliminato", items: ["Account di autenticazione Kelunia.", "Profilo, preferenze, lingua, notifiche e token push.", "Iscrizione newsletter collegata all'email, se presente.", "Dati personali nei sistemi Kelunia dove non esiste obbligo di conservazione."] },
    { title: "2. Cosa può restare", body: "Prenotazioni, audit e registri operativi possono restare per continuità, sicurezza e responsabilità. Dove possibile, gli identificatori personali sono rimossi o ridotti." },
    { title: "3. Conferma", body: "Devi essere connesso e scrivere l'email dell'account. L'azione è irreversibile." },
    { title: "4. Abbonamenti", body: "Eliminare l'account non cancella automaticamente abbonamenti gestiti da app store, provider pagamenti o amministratore." },
    { title: "5. Aiuto", body: "Se non riesci ad accedere, scrivi a support@kelunia.com dall'email dell'account." },
  ] },
  fr: { ...shared.fr, updatedAt: updatedAt.fr, title: "Supprimer le compte", description: "Vous pouvez supprimer votre compte Kelunia ici, avec confirmation explicite pour éviter les erreurs.", deleteAccount: {
    actionEyebrow: "Action compte", actionTitle: "Supprimer votre compte", loading: "Vérification de la session...", signedInAs: "Vous êtes connecté avec {{email}}. Pour confirmer, saisissez exactement cet email.", notSignedIn: "Vous devez être connecté pour supprimer le compte.", confirmationLabel: "Confirmer l'email du compte", confirmationRequired: "Saisissez exactement l'email du compte.", button: "Supprimer définitivement", deleting: "Suppression...", login: "Connexion", success: "Le compte a été supprimé. Vous serez déconnecté.", error: "Le compte n'a pas pu être supprimé. Reconnectez-vous et réessayez.",
  }, sections: [
    { title: "1. Ce qui est supprimé", items: ["Compte d'authentification Kelunia.", "Profil, préférences, langue, notifications et jetons push.", "Inscription newsletter liée à l'email, si présente.", "Données personnelles dans les systèmes Kelunia lorsqu'aucune obligation de conservation ne s'applique."] },
    { title: "2. Ce qui peut rester", body: "Réservations, audit et données opérationnelles peuvent rester pour continuité, sécurité et responsabilité. Quand possible, les identifiants personnels sont supprimés ou minimisés." },
    { title: "3. Confirmation", body: "Vous devez être connecté et saisir l'email du compte. Cette action est irréversible." },
    { title: "4. Abonnements", body: "Supprimer le compte n'annule pas automatiquement les abonnements gérés par app store, paiement ou administrateur." },
    { title: "5. Aide", body: "Si vous ne pouvez pas accéder au compte, écrivez à support@kelunia.com depuis l'email du compte." },
  ] },
  pt: { ...shared.pt, updatedAt: updatedAt.pt, title: "Eliminar conta", description: "Pode eliminar diretamente a sua conta Kelunia, com confirmação explícita para evitar erros.", deleteAccount: {
    actionEyebrow: "Ação da conta", actionTitle: "Eliminar a sua conta", loading: "A verificar sessão...", signedInAs: "Tem sessão iniciada como {{email}}. Para confirmar, escreva exatamente este email.", notSignedIn: "Tem de iniciar sessão para eliminar a conta.", confirmationLabel: "Confirmar email da conta", confirmationRequired: "Escreva exatamente o email da conta.", button: "Eliminar conta definitivamente", deleting: "A eliminar...", login: "Entrar", success: "A conta foi eliminada. A sessão será terminada.", error: "Não foi possível eliminar a conta. Inicie sessão novamente e tente outra vez.",
  }, sections: [
    { title: "1. O que é eliminado", items: ["Conta de autenticação Kelunia.", "Perfil, preferências, idioma, notificações e tokens push.", "Subscrição newsletter ligada ao email, se existir.", "Dados pessoais nos sistemas Kelunia onde não exista obrigação de retenção."] },
    { title: "2. O que pode permanecer", body: "Reservas, auditoria e registos operacionais podem permanecer por continuidade, segurança e responsabilidade. Quando possível, identificadores pessoais são removidos ou minimizados." },
    { title: "3. Confirmação", body: "Tem de estar autenticado e escrever o email da conta. Esta ação é irreversível." },
    { title: "4. Subscrições", body: "Eliminar a conta não cancela automaticamente subscrições geridas por app store, fornecedor de pagamento ou administrador." },
    { title: "5. Ajuda", body: "Se não conseguir aceder, escreva para support@kelunia.com a partir do email da conta." },
  ] },
};

export const refundCopy: Record<SupportedLocale, LegalPageCopy> = {
  ro: { ...shared.ro, updatedAt: updatedAt.ro, title: "Politica de rambursare", description: "Această politică explică modul în care sunt tratate trialurile, abonamentele și cererile de rambursare pentru Kelunia.", sections: [
    { title: "1. Trial gratuit", body: "Kelunia poate oferi o perioadă de test gratuit. Dacă alegi să nu continui, nu există cost pentru perioada gratuită." },
    { title: "2. Abonamente", body: "Abonamentele plătite oferă acces la funcțiile incluse în planul ales pentru perioada activă de facturare." },
    { title: "3. Rambursări", body: "Dacă plata a fost făcută printr-un app store, rambursarea se solicită direct prin Apple App Store sau Google Play, conform regulilor platformei. Pentru plăți directe, scrie la support@kelunia.com și analizăm cererea în funcție de situație." },
    { title: "4. Excepții", body: "Nu putem garanta rambursări pentru perioade deja folosite, încălcarea termenilor sau probleme cauzate de configurări interne ale organizației." },
    { title: "5. Date fiscale", body: "Facturile, chitanțele și informațiile de plată pot fi păstrate conform obligațiilor legale și fiscale." },
    { title: "6. Contact", body: shared.ro.contact },
  ] },
  en: { ...shared.en, updatedAt: updatedAt.en, title: "Refund Policy", description: "This policy explains how trials, subscriptions and refund requests are handled for Kelunia.", sections: [
    { title: "1. Free trial", body: "Kelunia may offer a free trial period. If you choose not to continue, there is no charge for the free period." },
    { title: "2. Subscriptions", body: "Paid subscriptions provide access to the features included in the selected plan for the active billing period." },
    { title: "3. Refunds", body: "If payment was made through an app store, refunds must be requested through Apple App Store or Google Play under that platform's rules. For direct payments, email support@kelunia.com and we will review the request." },
    { title: "4. Exceptions", body: "Refunds are not guaranteed for periods already used, violations of the terms or issues caused by internal organization configuration." },
    { title: "5. Fiscal data", body: "Invoices, receipts and payment information may be retained according to legal and tax obligations." },
    { title: "6. Contact", body: shared.en.contact },
  ] },
  es: { ...shared.es, updatedAt: updatedAt.es, title: "Política de reembolso", description: "Esta política explica cómo se gestionan pruebas, suscripciones y solicitudes de reembolso.", sections: [
    { title: "1. Prueba gratuita", body: "Kelunia puede ofrecer un periodo de prueba gratuito. Si decides no continuar, no hay coste por ese periodo." },
    { title: "2. Suscripciones", body: "Las suscripciones de pago dan acceso a las funciones del plan elegido durante el periodo activo." },
    { title: "3. Reembolsos", body: "Si el pago se realizó mediante app store, el reembolso debe solicitarse en Apple App Store o Google Play. Para pagos directos, escribe a support@kelunia.com." },
    { title: "4. Excepciones", body: "No garantizamos reembolsos por periodos ya usados, violaciones de términos o problemas de configuración interna." },
    { title: "5. Datos fiscales", body: "Facturas, recibos e información de pago pueden conservarse por obligaciones legales y fiscales." },
    { title: "6. Contacto", body: shared.es.contact },
  ] },
  it: { ...shared.it, updatedAt: updatedAt.it, title: "Politica di rimborso", description: "Questa politica spiega come Kelunia gestisce prove, abbonamenti e richieste di rimborso.", sections: [
    { title: "1. Prova gratuita", body: "Kelunia può offrire un periodo di prova gratuito. Se non continui, non ci sono costi per quel periodo." },
    { title: "2. Abbonamenti", body: "Gli abbonamenti a pagamento danno accesso alle funzioni del piano scelto per il periodo attivo." },
    { title: "3. Rimborsi", body: "Se il pagamento è stato fatto tramite app store, il rimborso va richiesto ad Apple App Store o Google Play. Per pagamenti diretti, scrivi a support@kelunia.com." },
    { title: "4. Eccezioni", body: "I rimborsi non sono garantiti per periodi già usati, violazioni dei termini o problemi di configurazione interna." },
    { title: "5. Dati fiscali", body: "Fatture, ricevute e informazioni di pagamento possono essere conservate per obblighi legali e fiscali." },
    { title: "6. Contatto", body: shared.it.contact },
  ] },
  fr: { ...shared.fr, updatedAt: updatedAt.fr, title: "Politique de remboursement", description: "Cette politique explique le traitement des essais, abonnements et demandes de remboursement.", sections: [
    { title: "1. Essai gratuit", body: "Kelunia peut proposer une période d'essai gratuite. Si vous ne continuez pas, aucun frais n'est dû pour cette période." },
    { title: "2. Abonnements", body: "Les abonnements payants donnent accès aux fonctions du plan choisi pendant la période active." },
    { title: "3. Remboursements", body: "Si le paiement a été effectué via un app store, le remboursement doit être demandé auprès d'Apple App Store ou Google Play. Pour les paiements directs, écrivez à support@kelunia.com." },
    { title: "4. Exceptions", body: "Les remboursements ne sont pas garantis pour les périodes déjà utilisées, violations des conditions ou problèmes de configuration interne." },
    { title: "5. Données fiscales", body: "Factures, reçus et informations de paiement peuvent être conservés selon les obligations légales et fiscales." },
    { title: "6. Contact", body: shared.fr.contact },
  ] },
  pt: { ...shared.pt, updatedAt: updatedAt.pt, title: "Política de reembolso", description: "Esta política explica como são tratados testes, subscrições e pedidos de reembolso.", sections: [
    { title: "1. Teste gratuito", body: "A Kelunia pode oferecer um período de teste gratuito. Se decidir não continuar, não há cobrança por esse período." },
    { title: "2. Subscrições", body: "Subscrições pagas dão acesso às funções do plano escolhido durante o período ativo." },
    { title: "3. Reembolsos", body: "Se o pagamento foi feito por app store, o reembolso deve ser pedido na Apple App Store ou Google Play. Para pagamentos diretos, escreva para support@kelunia.com." },
    { title: "4. Exceções", body: "Reembolsos não são garantidos para períodos já usados, violações dos termos ou problemas de configuração interna." },
    { title: "5. Dados fiscais", body: "Faturas, recibos e informação de pagamento podem ser conservados por obrigações legais e fiscais." },
    { title: "6. Contacto", body: shared.pt.contact },
  ] },
};

export const contactCopy: Record<SupportedLocale, LegalPageCopy> = {
  ro: { ...shared.ro, updatedAt: updatedAt.ro, title: "Contact", description: "Ai nevoie de ajutor cu Kelunia, contul tău, o plată sau ștergerea datelor? Ne poți contacta prin email.", sections: [
    { title: "Email suport", body: "support@kelunia.com" },
    { title: "Pentru ce ne poți scrie", items: ["Întrebări despre cont sau autentificare.", "Ajutor pentru locații, programări, grupuri și notificări.", "Cereri despre confidențialitate, ștergere cont sau date personale.", "Întrebări despre trial, abonamente, rambursări sau licențe."] },
    { title: "Timp de răspuns", body: "Încercăm să răspundem cât mai repede, de obicei în câteva zile lucrătoare." },
  ] },
  en: { ...shared.en, updatedAt: updatedAt.en, title: "Contact", description: "Need help with Kelunia, your account, a payment or data deletion? You can contact us by email.", sections: [
    { title: "Support email", body: "support@kelunia.com" },
    { title: "What you can contact us about", items: ["Account or sign-in questions.", "Help with locations, bookings, groups and notifications.", "Privacy, account deletion or personal data requests.", "Trial, subscription, refund or license questions."] },
    { title: "Response time", body: "We try to respond as soon as possible, usually within a few business days." },
  ] },
  es: { ...shared.es, updatedAt: updatedAt.es, title: "Contacto", description: "¿Necesitas ayuda con Kelunia, tu cuenta, un pago o eliminación de datos? Puedes contactarnos por email.", sections: [
    { title: "Email de soporte", body: "support@kelunia.com" },
    { title: "Motivos de contacto", items: ["Preguntas de cuenta o acceso.", "Ayuda con ubicaciones, reservas, grupos y notificaciones.", "Privacidad, eliminación de cuenta o datos personales.", "Trial, suscripción, reembolso o licencias."] },
    { title: "Tiempo de respuesta", body: "Intentamos responder lo antes posible, normalmente en unos días laborables." },
  ] },
  it: { ...shared.it, updatedAt: updatedAt.it, title: "Contatto", description: "Hai bisogno di aiuto con Kelunia, account, pagamento o cancellazione dati? Puoi contattarci via email.", sections: [
    { title: "Email supporto", body: "support@kelunia.com" },
    { title: "Per cosa puoi scriverci", items: ["Domande su account o accesso.", "Aiuto con sedi, prenotazioni, gruppi e notifiche.", "Privacy, eliminazione account o dati personali.", "Trial, abbonamenti, rimborsi o licenze."] },
    { title: "Tempo di risposta", body: "Cerchiamo di rispondere il prima possibile, di solito entro pochi giorni lavorativi." },
  ] },
  fr: { ...shared.fr, updatedAt: updatedAt.fr, title: "Contact", description: "Besoin d'aide avec Kelunia, votre compte, un paiement ou la suppression de données ? Contactez-nous par email.", sections: [
    { title: "Email support", body: "support@kelunia.com" },
    { title: "Motifs de contact", items: ["Questions de compte ou connexion.", "Aide avec lieux, réservations, groupes et notifications.", "Confidentialité, suppression de compte ou données personnelles.", "Essai, abonnement, remboursement ou licences."] },
    { title: "Délai de réponse", body: "Nous essayons de répondre rapidement, généralement sous quelques jours ouvrés." },
  ] },
  pt: { ...shared.pt, updatedAt: updatedAt.pt, title: "Contacto", description: "Precisa de ajuda com a Kelunia, conta, pagamento ou eliminação de dados? Pode contactar-nos por email.", sections: [
    { title: "Email de suporte", body: "support@kelunia.com" },
    { title: "Sobre o que pode contactar", items: ["Questões de conta ou login.", "Ajuda com localizações, reservas, grupos e notificações.", "Privacidade, eliminação de conta ou dados pessoais.", "Teste, subscrição, reembolso ou licenças."] },
    { title: "Tempo de resposta", body: "Tentamos responder o mais rápido possível, normalmente em alguns dias úteis." },
  ] },
};
