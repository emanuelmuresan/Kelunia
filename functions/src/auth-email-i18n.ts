// Textele emailurilor de verificare a adresei și de resetare a parolei, în cele șase limbi ale aplicației.
// Limba vine din profilul utilizatorului (sau din limba aleasă în pagina de login); una necunoscută devine română.
// Formularea este separată de index.ts ca să rămână ușor de revizuit; structura emailului rămâne în index.ts.
export type AuthEmailLanguage = "ro" | "en" | "es" | "it" | "fr" | "pt";

export type AuthEmailCopy = {
  // Cod de limbă pentru pagina Firebase unde se alege parola / se confirmă emailul (parametrul lang).
  firebaseLang: string;
  welcome: string;
  verifyIntro: string;
  verifyButton: string;
  verifyIgnore: string;
  resetIntro: string;
  resetChoose: string;
  resetButton: string;
  resetIgnore: string;
  buttonFallback: string;
  spamHint: string;
};

export const authEmailCopy: Record<AuthEmailLanguage, AuthEmailCopy> = {
  ro: {
    firebaseLang: "ro",
    welcome: "Bun venit în Kelunia.",
    verifyIntro: "Confirmă adresa de email ca să poți intra în aplicație",
    verifyButton: "Confirmă emailul",
    verifyIgnore: "Dacă nu ai creat tu acest cont, poți ignora acest mesaj.",
    resetIntro: "Ai cerut resetarea parolei pentru contul Kelunia.",
    resetChoose: "Alege o parolă nouă aici",
    resetButton: "Resetează parola",
    resetIgnore: "Dacă nu ai cerut tu resetarea, poți ignora acest mesaj.",
    buttonFallback: "Dacă butonul nu merge, deschide acest link:",
    spamHint: "Dacă nu găsești emailurile Kelunia, verifică și Spam sau Promoții.",
  },
  en: {
    firebaseLang: "en",
    welcome: "Welcome to Kelunia.",
    verifyIntro: "Confirm your email address so you can enter the app",
    verifyButton: "Confirm email",
    verifyIgnore: "If you did not create this account, you can ignore this message.",
    resetIntro: "You asked to reset the password of your Kelunia account.",
    resetChoose: "Choose a new password here",
    resetButton: "Reset password",
    resetIgnore: "If you did not ask for this, you can ignore this message.",
    buttonFallback: "If the button does not work, open this link:",
    spamHint: "If you cannot find Kelunia emails, also check Spam or Promotions.",
  },
  es: {
    firebaseLang: "es",
    welcome: "Bienvenido a Kelunia.",
    verifyIntro: "Confirma tu dirección de email para poder entrar en la aplicación",
    verifyButton: "Confirmar email",
    verifyIgnore: "Si no has creado tú esta cuenta, puedes ignorar este mensaje.",
    resetIntro: "Has pedido restablecer la contraseña de tu cuenta de Kelunia.",
    resetChoose: "Elige una contraseña nueva aquí",
    resetButton: "Restablecer contraseña",
    resetIgnore: "Si no lo has pedido tú, puedes ignorar este mensaje.",
    buttonFallback: "Si el botón no funciona, abre este enlace:",
    spamHint: "Si no encuentras los emails de Kelunia, revisa también Spam o Promociones.",
  },
  it: {
    firebaseLang: "it",
    welcome: "Benvenuto in Kelunia.",
    verifyIntro: "Conferma il tuo indirizzo email per poter entrare nell'app",
    verifyButton: "Conferma email",
    verifyIgnore: "Se non hai creato tu questo account, puoi ignorare questo messaggio.",
    resetIntro: "Hai chiesto di reimpostare la password del tuo account Kelunia.",
    resetChoose: "Scegli una nuova password qui",
    resetButton: "Reimposta password",
    resetIgnore: "Se non l'hai chiesto tu, puoi ignorare questo messaggio.",
    buttonFallback: "Se il pulsante non funziona, apri questo link:",
    spamHint: "Se non trovi le email di Kelunia, controlla anche Spam o Promozioni.",
  },
  fr: {
    firebaseLang: "fr",
    welcome: "Bienvenue sur Kelunia.",
    verifyIntro: "Confirmez votre adresse email pour pouvoir entrer dans l'application",
    verifyButton: "Confirmer l'email",
    verifyIgnore: "Si vous n'avez pas créé ce compte, vous pouvez ignorer ce message.",
    resetIntro: "Vous avez demandé la réinitialisation du mot de passe de votre compte Kelunia.",
    resetChoose: "Choisissez un nouveau mot de passe ici",
    resetButton: "Réinitialiser le mot de passe",
    resetIgnore: "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.",
    buttonFallback: "Si le bouton ne fonctionne pas, ouvrez ce lien :",
    spamHint: "Si vous ne trouvez pas les emails de Kelunia, vérifiez aussi les spams ou les promotions.",
  },
  pt: {
    firebaseLang: "pt",
    welcome: "Bem-vindo à Kelunia.",
    verifyIntro: "Confirme o seu endereço de email para poder entrar na aplicação",
    verifyButton: "Confirmar email",
    verifyIgnore: "Se não criou esta conta, pode ignorar esta mensagem.",
    resetIntro: "Pediu a reposição da palavra-passe da sua conta Kelunia.",
    resetChoose: "Escolha uma palavra-passe nova aqui",
    resetButton: "Repor palavra-passe",
    resetIgnore: "Se não fez este pedido, pode ignorar esta mensagem.",
    buttonFallback: "Se o botão não funcionar, abra este link:",
    spamHint: "Se não encontrar os emails da Kelunia, verifique também o Spam ou as Promoções.",
  },
};
