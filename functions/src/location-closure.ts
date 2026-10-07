// Închiderea locațiilor: textul emailului de anunț în șase limbi și ștergerea definitivă a datelor unei locații după perioada de grație.
// Ștergerea este apelată de funcția programată purgeClosedLocations din index.ts.
import type { Auth } from "firebase-admin/auth";
import { Timestamp, type Firestore } from "firebase-admin/firestore";

// A closed location keeps its data read-only for this many days, then is purged.
export const closureGraceDays = 30;

// Limbile emailului de închidere.
export type ClosureLanguage = "ro" | "en" | "es" | "it" | "fr" | "pt";

// Textul emailului: formatul datei, subiectul și corpul, cu {{location}}, {{admin}} și {{date}} înlocuite la trimitere.
type ClosureCopy = {
  dateLocale: string;
  subject: string;
  body: string;
};

// Mirrors nothing in the app catalog: these strings only exist in the email.
const closureCopy: Record<ClosureLanguage, ClosureCopy> = {
  ro: {
    dateLocale: "ro-RO",
    subject: "Locația {{location}} se închide",
    body: "Administratorul {{admin}} a cerut închiderea locației {{location}}.\n\nPână pe {{date}} aplicația rămâne doar în citire. După această dată, locația, programările, grupurile, sălile, codurile de acces și toate conturile asociate vor fi șterse definitiv.\n\nDacă nu ești de acord, cere unui administrator să redeschidă locația înainte de {{date}}.",
  },
  en: {
    dateLocale: "en-GB",
    subject: "The location {{location}} is closing",
    body: "Administrator {{admin}} has asked to close the location {{location}}.\n\nUntil {{date}} the app stays read-only. After that date, the location, its bookings, groups, rooms, access codes and all associated accounts will be permanently deleted.\n\nIf you disagree, ask an administrator to reopen the location before {{date}}.",
  },
  es: {
    dateLocale: "es-ES",
    subject: "La ubicación {{location}} se cierra",
    body: "El administrador {{admin}} ha solicitado cerrar la ubicación {{location}}.\n\nHasta el {{date}} la aplicación permanece en modo de solo lectura. Después de esa fecha, la ubicación, sus reservas, grupos, salas, códigos de acceso y todas las cuentas asociadas se eliminarán definitivamente.\n\nSi no estás de acuerdo, pide a un administrador que reabra la ubicación antes del {{date}}.",
  },
  it: {
    dateLocale: "it-IT",
    subject: "La sede {{location}} sta per chiudere",
    body: "L'amministratore {{admin}} ha chiesto la chiusura della sede {{location}}.\n\nFino al {{date}} l'app resta in sola lettura. Dopo tale data, la sede, le prenotazioni, i gruppi, le sale, i codici di accesso e tutti gli account associati verranno eliminati definitivamente.\n\nSe non sei d'accordo, chiedi a un amministratore di riaprire la sede prima del {{date}}.",
  },
  fr: {
    dateLocale: "fr-FR",
    subject: "Le lieu {{location}} ferme",
    body: "L'administrateur {{admin}} a demandé la fermeture du lieu {{location}}.\n\nJusqu'au {{date}}, l'application reste en lecture seule. Après cette date, le lieu, ses réservations, groupes, salles, codes d'accès et tous les comptes associés seront définitivement supprimés.\n\nSi vous n'êtes pas d'accord, demandez à un administrateur de rouvrir le lieu avant le {{date}}.",
  },
  pt: {
    dateLocale: "pt-PT",
    subject: "O local {{location}} vai encerrar",
    body: "O administrador {{admin}} pediu o encerramento do local {{location}}.\n\nAté {{date}} a aplicação fica só de leitura. Depois dessa data, o local, as reservas, os grupos, as salas, os códigos de acesso e todas as contas associadas serão eliminados definitivamente.\n\nSe não concordar, peça a um administrador que reabra o local antes de {{date}}.",
  },
};

// Scapă caracterele speciale HTML din valorile inserate în email.
function escapeForHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Construiește emailul de închidere (subiect, text și HTML) în limba membrului, cu numele locației, administratorul și data ștergerii.
export function closureEmail(
  language: ClosureLanguage,
  params: { location: string; admin: string; scheduledFor: Date }
) {
  const copy = closureCopy[language];
  const date = params.scheduledFor.toLocaleDateString(copy.dateLocale, { day: "2-digit", month: "long", year: "numeric" });
  const fill = (template: string) =>
    template
      .split("{{location}}").join(params.location)
      .split("{{admin}}").join(params.admin)
      .split("{{date}}").join(date);
  const text = fill(copy.body);

  return {
    subject: fill(copy.subject),
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px"><h1 style="font-size:22px;margin:0 0 18px;color:#b9503d">Kelunia</h1><p>${escapeForHtml(text).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br />")}</p></div>`,
  };
}

// Colecțiile ale căror documente aparțin locației (după câmpul locationId) și se șterg la purjare.
const locationScopedCollections = ["events", "groups", "rooms", "fixedSchedules", "accessCodes", "notificationTokens"];

// What an accounting audit still needs after a purge: the licence/subscription
// records themselves are never touched, the location's billing data is archived
// in closedLocations/{id}, and the audit trail of location and licence changes stays.
const retainedAuditEntityTypes = new Set(["location", "license"]);

// Șterge, în loturi de 450, toate documentele unei colecții cu o anumită valoare într-un câmp.
async function deleteWhere(db: Firestore, collection: string, field: string, value: string) {
  let deleted = 0;

  for (;;) {
    const snapshot = await db.collection(collection).where(field, "==", value).limit(450).get();

    if (snapshot.empty) {
      return deleted;
    }

    const batch = db.batch();
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
}

// Operational audit entries (bookings, rooms, users...) go; location/licence ones stay.
async function deleteOperationalAuditLogs(db: Firestore, locationId: string) {
  let deleted = 0;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  for (;;) {
    let query = db.collection("auditLogs").where("locationId", "==", locationId).orderBy("__name__").limit(450);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return deleted;
    }

    const batch = db.batch();
    snapshot.docs
      .filter((item) => !retainedAuditEntityTypes.has(String(item.data().entityType ?? "")))
      .forEach((item) => {
        batch.delete(item.ref);
        deleted += 1;
      });
    await batch.commit();
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
}

/**
 * Permanently removes a closed location: its operational data, its settings and
 * every member account (Auth user, profile, tokens). Platform owner accounts are
 * never touched. Billing records stay for accounting: licences and subscriptions
 * are not touched, and the location's own record is archived to closedLocations
 * (which also frees the location id for a later, brand-new location).
 */
export async function purgeLocation(db: Firestore, auth: Auth, locationId: string, ownerEmail: string) {
  // Pentru fiecare membru care nu este proprietar: șterge jetoanele push, abonarea newsletter, profilul (cu subcolecțiile) și contul Firebase Auth.
  const members = await db.collection("users").where("locationId", "==", locationId).get();
  let accountsDeleted = 0;

  for (const member of members.docs) {
    const profile = member.data() as { email?: string; isOwner?: boolean };
    const email = String(profile.email ?? "").trim().toLowerCase();

    if (profile.isOwner === true || email === ownerEmail) {
      continue;
    }

    await Promise.all([
      deleteWhere(db, "notificationTokens", "uid", member.id),
      email ? db.doc(`newsletterSubscribers/${encodeURIComponent(email)}`).delete() : Promise.resolve(),
    ]);
    await db.recursiveDelete(member.ref);

    try {
      await auth.deleteUser(member.id);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") {
        throw error;
      }
    }

    accountsDeleted += 1;
  }

  // Șterge datele operaționale ale locației, istoricul operațional și documentul de setări.
  const removed: Record<string, number> = {};

  for (const collection of locationScopedCollections) {
    removed[collection] = await deleteWhere(db, collection, "locationId", locationId);
  }

  removed.auditLogs = await deleteOperationalAuditLogs(db, locationId);

  await db.doc(`settings/calendar_${locationId}`).delete();

  // Arhivează înregistrarea locației (fără contoarele de utilizare) în closedLocations, apoi șterge documentul locației.
  const locationRef = db.doc(`locations/${locationId}`);
  const locationSnapshot = await locationRef.get();

  if (locationSnapshot.exists) {
    const { usage: _usage, ...billingRecord } = locationSnapshot.data() ?? {};
    void _usage;
    await db.doc(`closedLocations/${locationId}`).set({ ...billingRecord, purgedAt: Timestamp.now(), accountsDeleted });
  }

  await db.recursiveDelete(locationRef);

  return { accountsDeleted, removed };
}
