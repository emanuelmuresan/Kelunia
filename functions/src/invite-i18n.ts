// Invitation email wording per language. Mirrors the `invite.*` keys of the app's
// catalog (lib/i18n/app-copy-catalog.ts) - the functions package cannot import it,
// so keep the two in sync when editing a sentence.
// Tipul limbilor și structura textelor invitației.
export type InviteLanguage = "ro" | "en" | "es" | "it" | "fr" | "pt";

export type InviteCopy = {
  dateLocale: string;
  defaultIntro: string;
  location: string;
  role: string;
  group: string;
  roleManager: string;
  roleMember: string;
  roleGuest: string;
  stepsTitle: string;
  steps: [string, string, string, string];
  linkLabel: string;
  codeLabel: string;
  expiresOn: string;
  fallback: string;
  openButton: string;
  buttonFallback: string;
};

// Textele invitației pe limbi (română, engleză, spaniolă, italiană, franceză, portugheză), folosite la emailul trimis de funcția sendAccessInviteEmail.
export const inviteCopy: Record<InviteLanguage, InviteCopy> = {
  // Română.
  ro: {
    dateLocale: "ro-RO",
    defaultIntro: "Ai primit o invitație pentru Kelunia, locația {{location}}.",
    location: "Locație",
    role: "Rol",
    group: "Grup",
    roleManager: "Administrator",
    roleMember: "Colaborator",
    roleGuest: "Oaspete",
    stepsTitle: "Pași",
    steps: [
      "Deschide linkul de mai jos pe telefon sau calculator.",
      "Creează contul sau intră în cont dacă ai deja unul.",
      "Confirmă emailul, dacă aplicația îți cere acest lucru.",
      "Kelunia va folosi codul de acces pentru a te conecta la locația potrivită.",
    ],
    linkLabel: "Link invitație",
    codeLabel: "Cod acces",
    expiresOn: "Acest cod expiră pe {{date}}. Dacă a trecut termenul, cere unul nou.",
    fallback: "Dacă linkul nu se deschide corect, intră manual în aplicația Kelunia și folosește codul de acces de mai sus.",
    openButton: "Deschide invitația",
    buttonFallback: "Dacă butonul nu merge, deschide acest link:",
  },
  // Engleză.
  en: {
    dateLocale: "en-GB",
    defaultIntro: "You have received an invitation to Kelunia, location {{location}}.",
    location: "Location",
    role: "Role",
    group: "Group",
    roleManager: "Administrator",
    roleMember: "Collaborator",
    roleGuest: "Guest",
    stepsTitle: "Steps",
    steps: [
      "Open the link below on your phone or computer.",
      "Create your account or sign in if you already have one.",
      "Confirm your email if the app asks you to.",
      "Kelunia will use the access code to connect you to the right location.",
    ],
    linkLabel: "Invitation link",
    codeLabel: "Access code",
    expiresOn: "This code expires on {{date}}. If it has passed, ask for a new one.",
    fallback: "If the link does not open properly, open the Kelunia app manually and use the access code above.",
    openButton: "Open the invitation",
    buttonFallback: "If the button does not work, open this link:",
  },
  // Spaniolă.
  es: {
    dateLocale: "es-ES",
    defaultIntro: "Has recibido una invitación a Kelunia, ubicación {{location}}.",
    location: "Ubicación",
    role: "Rol",
    group: "Grupo",
    roleManager: "Administrador",
    roleMember: "Colaborador",
    roleGuest: "Invitado",
    stepsTitle: "Pasos",
    steps: [
      "Abre el enlace de abajo en el móvil o el ordenador.",
      "Crea tu cuenta o inicia sesión si ya tienes una.",
      "Confirma tu email si la aplicación te lo pide.",
      "Kelunia usará el código de acceso para conectarte a la ubicación correcta.",
    ],
    linkLabel: "Enlace de invitación",
    codeLabel: "Código de acceso",
    expiresOn: "Este código caduca el {{date}}. Si ha pasado la fecha, pide uno nuevo.",
    fallback: "Si el enlace no se abre bien, entra manualmente en la aplicación Kelunia y usa el código de acceso de arriba.",
    openButton: "Abrir la invitación",
    buttonFallback: "Si el botón no funciona, abre este enlace:",
  },
  // Italiană.
  it: {
    dateLocale: "it-IT",
    defaultIntro: "Hai ricevuto un invito a Kelunia, sede {{location}}.",
    location: "Sede",
    role: "Ruolo",
    group: "Gruppo",
    roleManager: "Amministratore",
    roleMember: "Collaboratore",
    roleGuest: "Ospite",
    stepsTitle: "Passaggi",
    steps: [
      "Apri il link qui sotto dal telefono o dal computer.",
      "Crea l'account o accedi se ne hai già uno.",
      "Conferma l'email se l'app te lo chiede.",
      "Kelunia userà il codice di accesso per collegarti alla sede giusta.",
    ],
    linkLabel: "Link di invito",
    codeLabel: "Codice di accesso",
    expiresOn: "Questo codice scade il {{date}}. Se è scaduto, chiedine uno nuovo.",
    fallback: "Se il link non si apre correttamente, apri manualmente l'app Kelunia e usa il codice di accesso qui sopra.",
    openButton: "Apri l'invito",
    buttonFallback: "Se il pulsante non funziona, apri questo link:",
  },
  // Franceză.
  fr: {
    dateLocale: "fr-FR",
    defaultIntro: "Vous avez reçu une invitation à Kelunia, lieu {{location}}.",
    location: "Lieu",
    role: "Rôle",
    group: "Groupe",
    roleManager: "Administrateur",
    roleMember: "Collaborateur",
    roleGuest: "Invité",
    stepsTitle: "Étapes",
    steps: [
      "Ouvrez le lien ci-dessous sur votre téléphone ou ordinateur.",
      "Créez votre compte ou connectez-vous si vous en avez déjà un.",
      "Confirmez votre e-mail si l'application vous le demande.",
      "Kelunia utilisera le code d'accès pour vous connecter au bon lieu.",
    ],
    linkLabel: "Lien d'invitation",
    codeLabel: "Code d'accès",
    expiresOn: "Ce code expire le {{date}}. S'il est expiré, demandez-en un nouveau.",
    fallback: "Si le lien ne s'ouvre pas correctement, ouvrez manuellement l'application Kelunia et utilisez le code d'accès ci-dessus.",
    openButton: "Ouvrir l'invitation",
    buttonFallback: "Si le bouton ne fonctionne pas, ouvrez ce lien :",
  },
  // Portugheză.
  pt: {
    dateLocale: "pt-PT",
    defaultIntro: "Recebeu um convite para o Kelunia, local {{location}}.",
    location: "Local",
    role: "Função",
    group: "Grupo",
    roleManager: "Administrador",
    roleMember: "Colaborador",
    roleGuest: "Convidado",
    stepsTitle: "Passos",
    steps: [
      "Abra a ligação abaixo no telemóvel ou no computador.",
      "Crie a sua conta ou inicie sessão se já tiver uma.",
      "Confirme o email se a aplicação o pedir.",
      "O Kelunia usará o código de acesso para o ligar ao local certo.",
    ],
    linkLabel: "Ligação do convite",
    codeLabel: "Código de acesso",
    expiresOn: "Este código expira em {{date}}. Se já passou o prazo, peça um novo.",
    fallback: "Se a ligação não abrir corretamente, abra manualmente a aplicação Kelunia e use o código de acesso acima.",
    openButton: "Abrir o convite",
    buttonFallback: "Se o botão não funcionar, abra esta ligação:",
  },
};
