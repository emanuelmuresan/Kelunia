// Ajutoare pentru abonații la newsletter: emailul se normalizează și devine id de document.
// Normalizează emailul (fără spații, litere mici), ca același abonat să nu apară de două ori.
export function normalizeNewsletterEmail(email: string) {
  return email.trim().toLowerCase();
}

// Id-ul documentului abonatului: emailul normalizat, codificat pentru a fi sigur într-o cale Firestore.
export function newsletterSubscriberId(email: string) {
  return encodeURIComponent(normalizeNewsletterEmail(email));
}
