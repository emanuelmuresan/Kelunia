export function normalizeNewsletterEmail(email: string) {
  return email.trim().toLowerCase();
}

export function newsletterSubscriberId(email: string) {
  return encodeURIComponent(normalizeNewsletterEmail(email));
}
