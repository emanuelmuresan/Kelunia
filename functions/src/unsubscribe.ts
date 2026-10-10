// Dezabonarea de la newsletter fără cont: fiecare email trimis conține un link cu emailul abonatului și un jeton semnat (HMAC),
// ca să nu poată dezabona nimeni o altă adresă. Jetonul se calculează din emailul normalizat și dintr-un secret al serverului.
import { createHmac, timingSafeEqual } from "node:crypto";

// Jetonul pentru o adresă: HMAC-SHA256 cu un secret derivat, codat base64url și scurtat la 32 de caractere.
export function unsubscribeToken(email: string, secret: string) {
  return createHmac("sha256", `${secret}:kelunia-unsubscribe-v1`)
    .update(email.trim().toLowerCase())
    .digest("base64url")
    .slice(0, 32);
}

// Compară jetonul primit cu cel așteptat, în timp constant.
export function validUnsubscribeToken(email: string, token: string, secret: string) {
  const expected = Buffer.from(unsubscribeToken(email, secret));
  const received = Buffer.from(String(token ?? ""));

  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Parametrii unui link de dezabonare: ?e=<email>&t=<jeton>.
export function unsubscribeQuery(email: string, secret: string) {
  const clean = email.trim().toLowerCase();

  return `e=${encodeURIComponent(clean)}&t=${unsubscribeToken(clean, secret)}`;
}
