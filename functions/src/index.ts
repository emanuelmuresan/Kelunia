import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Resend } from "resend";
import { inviteCopy, type InviteCopy } from "./invite-i18n";
import { closureEmail, closureGraceDays, purgeLocation } from "./location-closure";
import { createHash } from "node:crypto";
import { connect } from "node:http2";

initializeApp();

// Region default for every function + a hard ceiling so a traffic spike or abuse
// can't scale Cloud Run (and the bill) without bound. Per-function `region` options
// below are now redundant but kept for readability.
setGlobalOptions({ region: "europe-west1", maxInstances: 20 });

const db = getFirestore();

const resendApiKey = defineSecret("RESEND_API_KEY");
const emailFrom = defineString("EMAIL_FROM", {
  default: "Kelunia <support@kelunia.com>",
});
const appBaseUrl = defineString("APP_BASE_URL", {
  default: "https://www.kelunia.com",
});
const apnsBundleId = defineString("APNS_BUNDLE_ID", {
  default: "com.emanuelmuresan.kelunia",
});
const apnsKeyId = defineString("APNS_KEY_ID", {
  default: "",
});
const apnsTeamId = defineString("APNS_TEAM_ID", {
  default: "",
});
const apnsPrivateKey = defineString("APNS_PRIVATE_KEY", {
  default: "",
});

type CommunityMessage = {
  applicationId?: string;
  body?: string;
  deliveryStatus?: string;
  fromEmail?: string;
  toEmail?: string;
};

type NewsletterCampaign = {
  body?: string;
  createdBy?: string;
  recipientEmail?: string;
  status?: string;
  subject?: string;
};

type NewsletterRecipient = {
  email: string;
};

type LicenseEmailRequest = {
  code?: string;
  language?: string;
  licenseId?: string;
  message?: string;
  status?: string;
  toEmail?: string;
};

type AccessInviteEmailRequest = {
  code?: string;
  language?: string;
  message?: string;
  toEmail?: string;
};

type AccessCodeDocument = {
  active?: boolean;
  code?: string;
  deleted?: boolean;
  expiresAt?: Timestamp;
  groupName?: string;
  locationId?: string;
  locationName?: string;
  role?: UserRole;
};

type SaveBookingRequest = {
  editingId?: string;
  group?: string;
  room?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  locationId?: string;
  locationName?: string;
  notifyOnThisBooking?: boolean;
  notifyOffsets?: string[];
  notifyForUid?: string;
  notifyGroupOnThisBooking?: boolean;
  notifyGroupOffsets?: string[];
  notifyGroupAudience?: "all" | "selected";
  notifyGroupRecipients?: string[];
  notifyGroupNow?: boolean;
  notifyNowScope?: "group" | "location";
};

type UserRole = "manager" | "member" | "guest";

type UserProfile = {
  allowedRoomIds?: string[];
  displayName?: string;
  email?: string;
  groupName?: string;
  isOwner?: boolean;
  locationId?: string;
  locationSetupRequired?: boolean;
  role?: string;
  roomAccess?: string;
};

type NotificationTokenDocument = {
  displayName?: string;
  email?: string;
  groupName?: string;
  locationId?: string;
  locationName?: string;
  platform?: string;
  token?: string;
  tokenType?: "apns" | "fcm";
  uid?: string;
  notifyNewBookings?: boolean;
};

function normalizeRole(role: unknown): UserRole {
  if (role === "manager" || role === "superadmin" || role === "administrator") {
    return "manager";
  }

  if (role === "member" || role === "admin" || role === "collaborator" || role === "colaborator") {
    return "member";
  }

  return "guest";
}

function emailText(applicationId: string, message: CommunityMessage) {
  return [
    message.body ?? "",
    "",
    "---",
    "Kelunia Community",
    `Cerere: ${applicationId}`,
  ].join("\n");
}

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function tokenDocumentId(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function deleteQueryResults(query: FirebaseFirestore.Query) {
  const snapshot = await query.get();

  if (snapshot.empty) {
    return 0;
  }

  let deleted = 0;

  for (let index = 0; index < snapshot.docs.length; index += 450) {
    const batch = db.batch();
    const docs = snapshot.docs.slice(index, index + 450);

    docs.forEach((documentSnapshot) => {
      batch.delete(documentSnapshot.ref);
    });

    await batch.commit();
    deleted += docs.length;
  }

  return deleted;
}

async function anonymizeAccountBookings(uid: string, email: string) {
  const queries = [
    db.collection("events").where("authorEmail", "==", email).limit(450),
    db.collection("events").where("notifyForUid", "==", uid).limit(450),
  ];
  let updated = 0;

  for (const query of queries) {
    const snapshot = await query.get();

    if (snapshot.empty) {
      continue;
    }

    const batch = db.batch();

    snapshot.docs.forEach((documentSnapshot) => {
      batch.set(
        documentSnapshot.ref,
        {
          authorEmail: "",
          authorName: "Cont șters",
          notifyForUid: "",
          updatedBy: "Cont șters",
          accountDeletedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    updated += snapshot.docs.length;
  }

  return updated;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validDateKeyString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTimeString(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function cleanNotificationOffsets(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item))
    .filter((item) => {
      const match = item.match(/^([1-9]\d*)(m|h|d)$/);

      if (!match) {
        return false;
      }

      const amount = Number(match[1]);
      const unit = match[2];

      if (unit === "m") {
        return amount <= 120;
      }

      if (unit === "h") {
        return amount <= 48;
      }

      return amount <= 30;
    })
    .slice(0, 5);
}

function bookingNotificationBody(booking: Record<string, unknown>) {
  return `${cleanText(booking.group, 120)}, ${cleanText(booking.startDate, 10)}, ${cleanText(booking.startTime, 5)}-${cleanText(booking.endTime, 5)}, ${cleanText(booking.room, 120)}`;
}

async function apnsJwt() {
  const keyId = apnsKeyId.value().trim();
  const teamId = apnsTeamId.value().trim();
  const privateKey = apnsPrivateKey.value().replace(/\\n/g, "\n").trim();

  if (!keyId || !teamId || !privateKey) {
    return "";
  }

  const { SignJWT, importPKCS8 } = await import("jose");
  const key = await importPKCS8(privateKey, "ES256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(key);
}

function sendApnsRequest(host: string, token: string, jwt: string, payload: Record<string, unknown>) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const client = connect(`https://${host}`);
    const chunks: Buffer[] = [];
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-topic": apnsBundleId.value().trim() || "com.emanuelmuresan.kelunia",
    });

    request.setEncoding("utf8");
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("response", (headers) => {
      const status = Number(headers[":status"] ?? 0);
      request.on("end", () => {
        client.close();
        resolve({ status, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    request.on("error", (error) => {
      client.close();
      reject(error);
    });
    request.end(JSON.stringify(payload));
  });
}

async function sendApnsPush(tokens: string[], bookingId: string, title: string, body: string, url: string) {
  const jwt = await apnsJwt();

  if (!jwt || tokens.length === 0) {
    return { invalidTokens: [] as string[], sent: 0 };
  }

  const payload = {
    aps: {
      alert: {
        title,
        body,
      },
      sound: "default",
    },
    bookingId,
    url,
  };
  const invalidTokens: string[] = [];
  let sent = 0;

  for (const token of tokens) {
    let result = await sendApnsRequest("api.sandbox.push.apple.com", token, jwt, payload);

    if (result.status === 400 && result.body.includes("BadDeviceToken")) {
      result = await sendApnsRequest("api.push.apple.com", token, jwt, payload);
    }

    if (result.status >= 200 && result.status < 300) {
      sent += 1;
    }

    if (result.status === 410 || (result.status === 400 && result.body.includes("BadDeviceToken"))) {
      invalidTokens.push(token);
    }
  }

  return { invalidTokens, sent };
}

type PushMessage = {
  bookingId: string;
  body: string;
  tag: string;
  title: string;
  url: string;
};

async function deliverPush(recipients: NotificationTokenDocument[], message: PushMessage) {
  const tokenDatas = [...new Map(
    recipients.filter((item) => Boolean(item.token)).map((item) => [String(item.token), item])
  ).values()];
  const fcmTokens = tokenDatas.filter((item) => item.tokenType !== "apns").map((item) => String(item.token));
  const apnsTokens = tokenDatas.filter((item) => item.tokenType === "apns").map((item) => String(item.token));

  if (fcmTokens.length === 0 && apnsTokens.length === 0) {
    return { sent: 0 };
  }

  let sent = 0;

  for (let index = 0; index < fcmTokens.length; index += 500) {
    const tokens = fcmTokens.slice(index, index + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      android: {
        priority: "high",
        notification: {
          body: message.body,
          clickAction: "OPEN_BOOKING",
          sound: "default",
          tag: message.tag,
          title: message.title,
        },
      },
      data: {
        bookingId: message.bookingId,
        body: message.body,
        tag: message.tag,
        title: message.title,
        url: message.url,
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        fcmOptions: {
          link: `${appBaseUrl.value()}${message.url}`,
        },
      },
    });

    sent += response.successCount;

    const batch = db.batch();
    let invalidCount = 0;

    response.responses.forEach((result, tokenIndex) => {
      const code = result.error?.code;

      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        batch.delete(db.doc(`notificationTokens/${tokenDocumentId(tokens[tokenIndex])}`));
        invalidCount += 1;
      }
    });

    if (invalidCount > 0) {
      await batch.commit();
    }
  }

  const apnsResult = await sendApnsPush(apnsTokens, message.bookingId, message.title, message.body, message.url);
  sent += apnsResult.sent;

  if (apnsResult.invalidTokens.length > 0) {
    const batch = db.batch();
    apnsResult.invalidTokens.forEach((token) => batch.delete(db.doc(`notificationTokens/${tokenDocumentId(token)}`)));
    await batch.commit();
  }

  return { sent };
}

const ownerAccountEmail = "emanuelmuresan@gmail.com";

type PushRecipient = {
  email: string;
  groupName: string;
  isAdmin: boolean;
  token: NotificationTokenDocument;
  wantsBookingPush: boolean;
};

// Resolves who a location's push tokens really belong to *now*: role and group
// come from the user's current profile, not from what the token stored when it
// was registered. Tokens whose user no longer belongs to the location (removed
// account, moved elsewhere) are dropped and cleaned up. The platform owner has
// no single location, so is matched by email.
async function loadLocationPushRecipients(locationId: string) {
  const [tokenSnapshot, userSnapshot] = await Promise.all([
    db.collection("notificationTokens").where("locationId", "==", locationId).get(),
    db.collection("users").where("locationId", "==", locationId).get(),
  ]);
  const members = new Map(
    userSnapshot.docs.map((userDoc) => {
      const profile = userDoc.data() as UserProfile;
      return [userDoc.id, {
        email: cleanEmail(profile.email),
        groupName: cleanText(profile.groupName, 120),
        isAdmin: normalizeRole(profile.role) === "manager",
      }] as const;
    })
  );
  const recipients: PushRecipient[] = [];
  const staleRefs: FirebaseFirestore.DocumentReference[] = [];

  tokenSnapshot.docs.forEach((tokenDoc) => {
    const token = tokenDoc.data() as NotificationTokenDocument;

    if (!token.token) {
      return;
    }

    const member = members.get(String(token.uid ?? ""));
    const isOwner = cleanEmail(token.email) === ownerAccountEmail;

    if (!member && !isOwner) {
      staleRefs.push(tokenDoc.ref);
      return;
    }

    recipients.push({
      email: member?.email || cleanEmail(token.email),
      groupName: member?.groupName ?? "",
      isAdmin: isOwner || member?.isAdmin === true,
      token,
      wantsBookingPush: token.notifyNewBookings !== false,
    });
  });

  if (staleRefs.length > 0) {
    const batch = db.batch();
    staleRefs.slice(0, 450).forEach((ref) => batch.delete(ref));
    await batch.commit().catch((error) => logger.warn("Stale notification token cleanup failed", { error }));
  }

  return recipients;
}

function isGroupRecipient(item: PushRecipient, group: string) {
  const groupKey = group.trim().toLowerCase();
  return Boolean(groupKey) && item.groupName.toLowerCase() === groupKey;
}

type NowPushAudience = {
  audience: "all" | "selected";
  recipients: string[];
  scope: "group" | "location";
};

function nowPushCovers(item: PushRecipient, group: string, nowPush: NowPushAudience) {
  if (nowPush.scope === "location") {
    return true;
  }

  return isGroupRecipient(item, group)
    && (nowPush.audience !== "selected" || nowPush.recipients.includes(item.email));
}

async function sendInstantBookingPush(
  bookingId: string,
  bookingPayload: Record<string, unknown>,
  locationId: string,
  group: string,
  nowPush: NowPushAudience
) {
  const recipients = (await loadLocationPushRecipients(locationId))
    .filter((item) => item.wantsBookingPush && nowPushCovers(item, group, nowPush));

  return deliverPush(recipients.map((item) => item.token), {
    bookingId,
    body: bookingNotificationBody(bookingPayload),
    tag: `booking-now-${bookingId}`,
    title: "Reminder grup",
    url: `/dashboard?booking=${encodeURIComponent(bookingId)}`,
  });
}

// Every new booking pings the location's administrators and the booking's group,
// except the author and anyone the explicit "notify now" push already reached.
async function sendNewBookingPush(
  bookingId: string,
  bookingPayload: Record<string, unknown>,
  locationId: string,
  group: string,
  authorEmail: string,
  nowPush: NowPushAudience | null
) {
  const recipients = (await loadLocationPushRecipients(locationId)).filter((item) =>
    item.wantsBookingPush
    && item.email !== authorEmail
    && (item.isAdmin || isGroupRecipient(item, group))
    && !(nowPush && nowPushCovers(item, group, nowPush))
  );

  return deliverPush(recipients.map((item) => item.token), {
    bookingId,
    body: bookingNotificationBody(bookingPayload),
    tag: `booking-new-${bookingId}`,
    title: "Programare nouă",
    url: `/dashboard?booking=${encodeURIComponent(bookingId)}`,
  });
}

function userClaimsFromProfile(profile: UserProfile) {
  const isOwner = profile.isOwner === true;

  return {
    isOwner,
    locationId: isOwner ? "" : String(profile.locationId ?? ""),
    locationSetupRequired: profile.locationSetupRequired === true,
    role: isOwner ? "manager" : normalizeRole(profile.role),
  };
}

function deliveryIdForEmail(email: string) {
  return encodeURIComponent(email);
}

function newsletterText(campaign: NewsletterCampaign) {
  return [
    campaign.body ?? "",
    "",
    "---",
    "Kelunia",
    "Primești acest email pentru că te-ai înscris pentru actualizări Kelunia.",
    "Pentru dezabonare, răspunde la acest email cu textul DEZABONARE.",
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function newsletterHtml(campaign: NewsletterCampaign) {
  const body = escapeHtml(campaign.body ?? "").replace(/\n/g, "<br />");

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px">',
    '<h1 style="font-size:22px;margin:0 0 18px;color:#0f766e">Kelunia</h1>',
    `<div>${body}</div>`,
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />',
    '<p style="font-size:13px;color:#667085;margin:0">Primești acest email pentru că te-ai înscris pentru actualizări Kelunia. Pentru dezabonare, răspunde la acest email cu textul DEZABONARE.</p>',
    "</div>",
  ].join("");
}

function appUrl(path: string) {
  return `${appBaseUrl.value().replace(/\/$/, "")}${path}`;
}

type EmailLanguage = "ro" | "en" | "es" | "it" | "fr" | "pt";

function emailLanguage(value: unknown): EmailLanguage {
  return value === "en" || value === "es" || value === "it" || value === "fr" || value === "pt" ? value : "ro";
}

function emailSubject(key: "verify" | "reset" | "license" | "invite", languageValue: unknown) {
  const language = emailLanguage(languageValue);
  const subjects = {
    ro: {
      verify: "Confirmă emailul pentru Kelunia",
      reset: "Resetează parola Kelunia",
      license: "Codul tău de licență Kelunia",
      invite: "Invitație Kelunia",
    },
    en: {
      verify: "Confirm your Kelunia email",
      reset: "Reset your Kelunia password",
      license: "Your Kelunia license code",
      invite: "Kelunia invitation",
    },
    es: {
      verify: "Confirma tu email de Kelunia",
      reset: "Restablece tu contraseña Kelunia",
      license: "Tu código de licencia Kelunia",
      invite: "Invitación Kelunia",
    },
    it: {
      verify: "Conferma la tua email Kelunia",
      reset: "Reimposta la password Kelunia",
      license: "Il tuo codice licenza Kelunia",
      invite: "Invito Kelunia",
    },
    fr: {
      verify: "Confirmez votre email Kelunia",
      reset: "Réinitialisez votre mot de passe Kelunia",
      license: "Votre code de licence Kelunia",
      invite: "Invitation Kelunia",
    },
    pt: {
      verify: "Confirme o seu email Kelunia",
      reset: "Repor a palavra-passe Kelunia",
      license: "O seu código de licença Kelunia",
      invite: "Convite Kelunia",
    },
  };

  return subjects[language][key];
}

function licenseEmailText(request: LicenseEmailRequest) {
  const code = request.code ?? request.licenseId ?? "";
  const link = appUrl(`/login?code=${encodeURIComponent(code)}`);

  return [
    request.message?.trim() || "Ai primit un cod de licență Kelunia.",
    "",
    "Acest cod leagă contul tău de locația pentru care vei folosi calendarul Kelunia. După confirmarea emailului, aplicația va putea încărca spațiile, rezervările și permisiunile potrivite.",
    "",
    `Cod licență: ${code}`,
    `Link cont: ${link}`,
    "",
    "Pași:",
    "1. Deschide linkul de mai sus pe telefon sau calculator.",
    "2. Alege „Am cod”, dacă pagina nu a selectat deja această opțiune.",
    "3. Completează numele, emailul și parola, apoi creează contul.",
    "4. Deschide emailul de verificare Kelunia și confirmă adresa de email.",
    "5. Revino în aplicație și intră în cont. După autentificare vei finaliza locația și calendarul.",
    "",
    "Dacă linkul nu se deschide corect, intră manual în aplicația Kelunia, alege „Am cod” și copiază codul de licență de mai sus.",
    "",
    "---",
    "Kelunia",
  ].join("\n");
}

function licenseEmailHtml(request: LicenseEmailRequest) {
  const code = request.code ?? request.licenseId ?? "";
  const link = appUrl(`/login?code=${encodeURIComponent(code)}`);
  const message = escapeHtml(request.message?.trim() || "Ai primit un cod de licență Kelunia.").replace(/\n/g, "<br />");

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px">',
    '<h1 style="font-size:22px;margin:0 0 18px;color:#0f766e">Kelunia</h1>',
    `<p>${message}</p>`,
    '<p>Acest cod leagă contul tău de locația pentru care vei folosi calendarul Kelunia. După confirmarea emailului, aplicația va putea încărca spațiile, rezervările și permisiunile potrivite.</p>',
    '<p style="margin:18px 0 8px;color:#667085">Cod licență</p>',
    `<p style="font-size:24px;font-weight:700;letter-spacing:1px;margin:0 0 18px">${escapeHtml(code)}</p>`,
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Creează contul</a></p>`,
    '<div style="background:#f6f9ff;border:1px solid #d9e4f2;border-radius:10px;padding:14px 16px;margin:18px 0">',
    '<p style="font-weight:700;margin:0 0 8px">Pașii necesari</p>',
    '<ol style="margin:0;padding-left:20px">',
    "<li>Deschide linkul pe telefon sau calculator.</li>",
    "<li>Alege „Am cod”, dacă pagina nu a selectat deja această opțiune.</li>",
    "<li>Completează numele, emailul și parola, apoi creează contul.</li>",
    "<li>Deschide emailul de verificare Kelunia și confirmă adresa de email.</li>",
    "<li>Revino în aplicație și intră în cont. După autentificare vei finaliza locația și calendarul.</li>",
    "</ol>",
    "</div>",
    `<p style="font-size:13px;color:#667085;margin-top:18px">Dacă butonul nu merge, deschide acest link: ${escapeHtml(link)}</p>`,
    '<p style="font-size:13px;color:#667085;margin-top:8px">Dacă linkul nu se deschide corect, intră manual în aplicația Kelunia, alege „Am cod” și copiază codul de licență de mai sus.</p>',
    "</div>",
  ].join("");
}

function verificationEmailText(link: string) {
  return [
    "Bun venit în Kelunia.",
    "",
    "Confirmă adresa de email ca să poți intra în aplicație:",
    link,
    "",
    "Dacă nu ai creat tu acest cont, poți ignora acest mesaj.",
    "",
    "---",
    "Kelunia",
  ].join("\n");
}

function verificationEmailHtml(link: string) {
  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px">',
    '<h1 style="font-size:22px;margin:0 0 18px;color:#0f766e">Kelunia</h1>',
    '<p>Confirmă adresa de email ca să poți intra în aplicație.</p>',
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Confirmă emailul</a></p>`,
    `<p style="font-size:13px;color:#667085;margin-top:18px">Dacă butonul nu merge, deschide acest link: ${escapeHtml(link)}</p>`,
    '<p style="font-size:13px;color:#667085;margin-top:18px">Dacă nu ai creat tu acest cont, poți ignora acest mesaj.</p>',
    "</div>",
  ].join("");
}

function passwordResetEmailText(link: string) {
  return [
    "Ai cerut resetarea parolei pentru contul Kelunia.",
    "",
    "Alege o parolă nouă aici:",
    link,
    "",
    "Dacă nu ai cerut tu resetarea, poți ignora acest mesaj.",
    "",
    "---",
    "Kelunia",
  ].join("\n");
}

function passwordResetEmailHtml(link: string) {
  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px">',
    '<h1 style="font-size:22px;margin:0 0 18px;color:#0f766e">Kelunia</h1>',
    '<p>Ai cerut resetarea parolei pentru contul Kelunia.</p>',
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Resetează parola</a></p>`,
    `<p style="font-size:13px;color:#667085;margin-top:18px">Dacă butonul nu merge, deschide acest link: ${escapeHtml(link)}</p>`,
    '<p style="font-size:13px;color:#667085;margin-top:18px">Dacă nu ai cerut tu resetarea, poți ignora acest mesaj.</p>',
    "</div>",
  ].join("");
}

function inviteRoleLabel(role: UserRole, copy: InviteCopy) {
  if (role === "manager") {
    return copy.roleManager;
  }

  if (role === "member") {
    return copy.roleMember;
  }

  return copy.roleGuest;
}

function accessCodeExpiryDateLabel(accessCode: AccessCodeDocument, copy: InviteCopy) {
  if (!accessCode.expiresAt) {
    return "";
  }

  return accessCode.expiresAt.toDate().toLocaleDateString(copy.dateLocale, { day: "2-digit", month: "long", year: "numeric" });
}

function accessInviteText(request: AccessInviteEmailRequest, accessCode: AccessCodeDocument) {
  const copy = inviteCopy[emailLanguage(request.language)];
  const code = accessCode.code ?? request.code ?? "";
  const email = cleanEmail(request.toEmail);
  const link = appUrl(`/login?invite=${encodeURIComponent(code)}${email ? `&email=${encodeURIComponent(email)}` : ""}`);
  const groupName = accessCode.role === "manager" ? "" : accessCode.groupName?.trim();
  const customMessage = request.message?.trim();
  const expiryLabel = accessCodeExpiryDateLabel(accessCode, copy);

  return [
    customMessage || copy.defaultIntro.replace("{{location}}", accessCode.locationName ?? ""),
    "",
    `${copy.location}: ${accessCode.locationName ?? ""}`,
    `${copy.role}: ${inviteRoleLabel(accessCode.role ?? "guest", copy)}`,
    groupName ? `${copy.group}: ${groupName}` : "",
    "",
    `${copy.stepsTitle}:`,
    ...copy.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `${copy.linkLabel}: ${link}`,
    `${copy.codeLabel}: ${code}`,
    expiryLabel ? copy.expiresOn.replace("{{date}}", expiryLabel) : "",
    "",
    copy.fallback,
    "",
    "---",
    "Kelunia",
  ].filter(Boolean).join("\n");
}

function accessInviteHtml(request: AccessInviteEmailRequest, accessCode: AccessCodeDocument) {
  const copy = inviteCopy[emailLanguage(request.language)];
  const code = accessCode.code ?? request.code ?? "";
  const email = cleanEmail(request.toEmail);
  const link = appUrl(`/login?invite=${encodeURIComponent(code)}${email ? `&email=${encodeURIComponent(email)}` : ""}`);
  const groupName = accessCode.role === "manager" ? "" : accessCode.groupName?.trim();
  const customMessage = escapeHtml(request.message?.trim() || copy.defaultIntro.replace("{{location}}", accessCode.locationName ?? "")).replace(/\n/g, "<br />");
  const expiryLabel = accessCodeExpiryDateLabel(accessCode, copy);

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px">',
    '<h1 style="font-size:22px;margin:0 0 18px;color:#0f766e">Kelunia</h1>',
    `<p>${customMessage}</p>`,
    '<div style="background:#f6f9ff;border:1px solid #d9e4f2;border-radius:10px;padding:14px 16px;margin:18px 0">',
    `<p style="margin:0 0 6px"><strong>${escapeHtml(copy.location)}:</strong> ${escapeHtml(accessCode.locationName ?? "")}</p>`,
    `<p style="margin:0 0 6px"><strong>${escapeHtml(copy.role)}:</strong> ${escapeHtml(inviteRoleLabel(accessCode.role ?? "guest", copy))}</p>`,
    groupName ? `<p style="margin:0"><strong>${escapeHtml(copy.group)}:</strong> ${escapeHtml(groupName)}</p>` : "",
    "</div>",
    `<p style="font-weight:700;margin:18px 0 8px">${escapeHtml(copy.stepsTitle)}</p>`,
    '<ol style="margin:0 0 18px;padding-left:20px">',
    ...copy.steps.map((step) => `<li>${escapeHtml(step)}</li>`),
    "</ol>",
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${escapeHtml(copy.openButton)}</a></p>`,
    `<p style="margin:18px 0 8px;color:#667085">${escapeHtml(copy.codeLabel)}</p>`,
    `<p style="font-size:24px;font-weight:700;letter-spacing:1px;margin:0 0 18px">${escapeHtml(code)}</p>`,
    expiryLabel
      ? `<p style="font-size:13px;color:#b9503d;margin:0 0 18px"><strong>${escapeHtml(copy.expiresOn.replace("{{date}}", expiryLabel))}</strong></p>`
      : "",
    `<p style="font-size:13px;color:#667085;margin-top:18px">${escapeHtml(copy.buttonFallback)} ${escapeHtml(link)}</p>`,
    `<p style="font-size:13px;color:#667085;margin-top:8px">${escapeHtml(copy.fallback)}</p>`,
    "</div>",
  ].join("");
}

export const sendAuthVerificationEmail = onCall(
  {
    region: "europe-west1",
    secrets: [resendApiKey],
    enforceAppCheck: true,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat pentru verificarea emailului.");
    }

    const user = await getAuth().getUser(request.auth.uid);

    if (!user.email) {
      throw new HttpsError("failed-precondition", "Contul nu are email setat.");
    }

    if (user.emailVerified) {
      return { alreadyVerified: true, sent: false };
    }

    // Logging in with an unverified account re-sends the email. Do not pile up
    // sends: within a couple of minutes of the last one, say so instead.
    const lastSentAt = (await getFirestore().doc(`users/${user.uid}`).get()).data()?.verificationEmailSentAt as
      | { toMillis?: () => number }
      | undefined;

    if (lastSentAt?.toMillis && Date.now() - lastSentAt.toMillis() < 2 * 60 * 1000) {
      return { alreadyVerified: false, sent: false, throttled: true };
    }

    let link = "";

    try {
      link = await getAuth().generateEmailVerificationLink(user.email, {
        url: appUrl("/login"),
        handleCodeInApp: false,
      });
    } catch (error) {
      // Firebase Auth rate-limits verification links per account. That is not a
      // configuration problem, so report it as "sent recently", not as a failure.
      if (String((error as { message?: string }).message ?? "").includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
        logger.warn("Verification link rate-limited by Firebase Auth", { uid: user.uid });
        return { alreadyVerified: false, sent: false, throttled: true };
      }

      throw error;
    }

    const resend = new Resend(resendApiKey.value());
    const result = await resend.emails.send({
      from: emailFrom.value(),
      to: [user.email],
      subject: emailSubject("verify", request.data?.language),
      text: verificationEmailText(link),
      html: verificationEmailHtml(link),
    });

    if (result.error) {
      logger.error("Auth verification email failed", {
        uid: user.uid,
        email: user.email,
        error: result.error,
      });
      throw new HttpsError("internal", result.error.message);
    }

    await getFirestore().doc(`users/${user.uid}`).set(
      {
        verificationEmailSentAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { alreadyVerified: false, sent: true };
  }
);

export const sendAuthPasswordResetEmail = onCall(
  {
    region: "europe-west1",
    secrets: [resendApiKey],
    enforceAppCheck: true,
  },
  async (request) => {
    const email = cleanEmail(request.data?.email);

    if (!validEmail(email)) {
      throw new HttpsError("invalid-argument", "Email invalid.");
    }

    let link = "";

    try {
      link = await getAuth().generatePasswordResetLink(email, {
        url: appUrl("/login"),
        handleCodeInApp: false,
      });
    } catch (error) {
      if ((error as { code?: string }).code === "auth/user-not-found") {
        return { sent: true };
      }

      logger.error("Password reset link generation failed", { email, error });
      throw new HttpsError("internal", "Linkul de resetare nu a putut fi generat.");
    }

    const resend = new Resend(resendApiKey.value());
    const result = await resend.emails.send({
      from: emailFrom.value(),
      to: [email],
      subject: emailSubject("reset", request.data?.language),
      text: passwordResetEmailText(link),
      html: passwordResetEmailHtml(link),
    });

    if (result.error) {
      logger.error("Password reset email failed", {
        email,
        error: result.error,
      });
      throw new HttpsError("internal", result.error.message);
    }

    return { sent: true };
  }
);

export const sendAccessInviteEmail = onCall(
  {
    region: "europe-west1",
    secrets: [resendApiKey],
    enforceAppCheck: true,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat pentru a trimite invitații.");
    }

    const currentUser = await getAuth().getUser(request.auth.uid);

    if (!currentUser.emailVerified) {
      throw new HttpsError("failed-precondition", "Confirmă emailul înainte să trimiți invitații.");
    }

    const payload = request.data as AccessInviteEmailRequest;
    const toEmail = cleanEmail(payload?.toEmail);
    const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";

    if (!validEmail(toEmail)) {
      throw new HttpsError("invalid-argument", "Email invalid.");
    }

    if (!/^[A-Z0-9-]{4,24}$/.test(code)) {
      throw new HttpsError("invalid-argument", "Cod invalid.");
    }

    if (message.length > 1200) {
      throw new HttpsError("invalid-argument", "Mesajul este prea lung.");
    }

    const db = getFirestore();
    const accessCodeSnapshot = await db.doc(`accessCodes/${code}`).get();

    if (!accessCodeSnapshot.exists) {
      throw new HttpsError("not-found", "Codul nu mai există.");
    }

    const accessCode = accessCodeSnapshot.data() as AccessCodeDocument;

    if (accessCode.deleted === true || accessCode.active === false) {
      throw new HttpsError("failed-precondition", "Codul nu mai este activ.");
    }

    if (accessCode.expiresAt && accessCode.expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError("failed-precondition", "Codul a expirat. Generează unul nou înainte să trimiți invitația.");
    }

    const claims = request.auth.token as {
      isOwner?: boolean;
      locationId?: string;
      role?: string;
    };
    const canManageLocation =
      claims.isOwner === true ||
      (claims.role === "manager" && typeof accessCode.locationId === "string" && claims.locationId === accessCode.locationId);

    if (!canManageLocation) {
      throw new HttpsError("permission-denied", "Nu ai dreptul să trimiți invitații pentru această locație.");
    }

    const resend = new Resend(resendApiKey.value());
    const result = await resend.emails.send({
      from: emailFrom.value(),
      to: [toEmail],
      replyTo: currentUser.email ? [currentUser.email] : undefined,
      subject: `${emailSubject("invite", payload.language)} - ${accessCode.locationName ?? "Kelunia"}`,
      text: accessInviteText({ ...payload, code, message, toEmail }, { ...accessCode, code }),
      html: accessInviteHtml({ ...payload, code, message, toEmail }, { ...accessCode, code }),
    });

    if (result.error) {
      logger.error("Access invite email failed", {
        code,
        toEmail,
        uid: currentUser.uid,
        error: result.error,
      });
      throw new HttpsError("internal", result.error.message);
    }

    await accessCodeSnapshot.ref.set(
      {
        lastInviteEmailSentAt: FieldValue.serverTimestamp(),
        lastInviteEmailSentBy: currentUser.email ?? request.auth.uid,
        lastInviteEmailSentTo: toEmail,
      },
      { merge: true }
    );

    return { sent: true, id: result.data?.id ?? "" };
  }
);

export const registerNotificationToken = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
  },
  async (request) => {
    if (!request.auth?.uid || request.auth.token.email_verified !== true) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat cu email verificat.");
    }

    const payload = request.data as NotificationTokenDocument;
    const token = cleanText(payload.token, 4096);
    const locationId = cleanText(payload.locationId, 160);

    if (!token || !locationId) {
      throw new HttpsError("invalid-argument", "Tokenul de notificări nu este valid.");
    }

    const userSnapshot = await db.doc(`users/${request.auth.uid}`).get();
    const userProfile = userSnapshot.exists ? userSnapshot.data() as UserProfile : null;
    const isOwner = userProfile?.isOwner === true || request.auth.token.email === "emanuelmuresan@gmail.com";

    if (!isOwner && userProfile?.locationId !== locationId) {
      throw new HttpsError("permission-denied", "Nu ai acces la această locație.");
    }

    await db.doc(`notificationTokens/${tokenDocumentId(token)}`).set(
      {
        displayName: cleanText(payload.displayName || userProfile?.displayName || request.auth.token.email, 180),
        email: cleanEmail(payload.email || userProfile?.email || request.auth.token.email),
        groupName: cleanText(payload.groupName || userProfile?.groupName, 120),
        locationId,
        locationName: cleanText(payload.locationName || "", 180),
        platform: cleanText(payload.platform || "pwa", 40),
        token,
        tokenType: payload.tokenType === "apns" ? "apns" : "fcm",
        notifyNewBookings: payload.notifyNewBookings !== false,
        uid: request.auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { registered: true };
  }
);

export const deleteMyAccount = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
  },
  async (request) => {
    if (!request.auth?.uid || request.auth.token.email_verified !== true) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat cu email verificat.");
    }

    const confirmationEmail = cleanEmail((request.data as { confirmationEmail?: string } | undefined)?.confirmationEmail);
    const accountEmail = cleanEmail(request.auth.token.email);

    if (!accountEmail || confirmationEmail !== accountEmail) {
      throw new HttpsError("invalid-argument", "Emailul de confirmare nu se potrivește cu emailul contului.");
    }

    const uid = request.auth.uid;

    // The last administrator of a location may not leave it without one.
    const ownProfileSnapshot = await db.doc(`users/${uid}`).get();
    const ownProfile = ownProfileSnapshot.exists ? ownProfileSnapshot.data() as UserProfile : null;

    if (
      ownProfile &&
      ownProfile.isOwner !== true &&
      normalizeRole(ownProfile.role) === "manager" &&
      cleanText(ownProfile.locationId, 160)
    ) {
      const locationUsers = await db.collection("users").where("locationId", "==", ownProfile.locationId).get();
      const otherAdmins = locationUsers.docs.filter(
        (userDoc) => userDoc.id !== uid && normalizeRole((userDoc.data() as UserProfile).role) === "manager"
      );

      // A location that is being closed no longer needs an administrator.
      const locationClosing = otherAdmins.length === 0
        && Boolean((await db.doc(`locations/${ownProfile.locationId}`).get()).data()?.closureScheduledFor);

      if (otherAdmins.length === 0 && !locationClosing) {
        throw new HttpsError(
          "failed-precondition",
          "Ești singurul administrator al locației. Numește alt administrator înainte să îți ștergi contul.",
          { reason: "last-admin" }
        );
      }
    }

    const newsletterId = encodeURIComponent(accountEmail);
    const [tokensByUid, tokensByEmail, anonymizedBookings] = await Promise.all([
      deleteQueryResults(db.collection("notificationTokens").where("uid", "==", uid).limit(450)),
      deleteQueryResults(db.collection("notificationTokens").where("email", "==", accountEmail).limit(450)),
      anonymizeAccountBookings(uid, accountEmail),
    ]);

    await Promise.allSettled([
      db.doc(`newsletterSubscribers/${newsletterId}`).delete(),
      db.doc(`users/${uid}`).delete(),
      db.collection("accountDeletionRequests").add({
        uid,
        email: accountEmail,
        status: "completed",
        tokensDeleted: tokensByUid + tokensByEmail,
        bookingsAnonymized: anonymizedBookings,
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);

    await getAuth().deleteUser(uid);

    logger.info("Deleted Kelunia account", {
      uid,
      email: accountEmail,
      tokensDeleted: tokensByUid + tokensByEmail,
      bookingsAnonymized: anonymizedBookings,
    });

    return {
      deleted: true,
      tokensDeleted: tokensByUid + tokensByEmail,
      bookingsAnonymized: anonymizedBookings,
    };
  }
);

export const saveBooking = onCall(
  {
    region: "europe-west1",
    enforceAppCheck: true,
  },
  async (request) => {
    if (!request.auth?.uid || request.auth.token.email_verified !== true) {
      throw new HttpsError("unauthenticated", "Trebuie să fii autentificat cu email verificat.");
    }

    const db = getFirestore();
    const userSnapshot = await db.doc(`users/${request.auth.uid}`).get();
    const userProfile = userSnapshot.exists ? userSnapshot.data() as UserProfile & {
      allowedRoomIds?: string[];
      displayName?: string;
      email?: string;
      groupName?: string;
      isOwner?: boolean;
      roomAccess?: string;
    } : null;
    const isOwner = userProfile?.isOwner === true || request.auth.token.email === "emanuelmuresan@gmail.com";
    const role = normalizeRole(userProfile?.role ?? request.auth.token.role);
    const payload = request.data as SaveBookingRequest;
    const editingId = cleanText(payload.editingId, 160);
    const locationId = cleanText(payload.locationId, 160);
    const locationName = cleanText(payload.locationName, 180);
    const group = cleanText(payload.group, 120);
    const room = cleanText(payload.room, 120);
    const roomId = cleanText(payload.roomId, 160);
    const startDate = cleanText(payload.startDate, 10);
    const endDate = cleanText(payload.endDate || payload.startDate, 10);
    const startTime = cleanText(payload.startTime, 5);
    const endTime = cleanText(payload.endTime, 5);
    const reason = cleanText(payload.reason, 300);

    if (!locationId || !group || !room || !validDateKeyString(startDate) || !validDateKeyString(endDate) || !validTimeString(startTime) || !validTimeString(endTime)) {
      throw new HttpsError("invalid-argument", "Programarea nu are toate câmpurile obligatorii.");
    }

    if (!isOwner && userProfile?.locationId !== locationId) {
      throw new HttpsError("permission-denied", "Nu ai acces la această locație.");
    }

    if (role === "guest") {
      throw new HttpsError("permission-denied", "Ai nevoie de rol de administrator sau colaborator.");
    }

    if (!isOwner && role === "member" && cleanText(userProfile?.groupName, 120) !== group) {
      throw new HttpsError("permission-denied", "Colaboratorii pot face programări doar pentru grupul lor.");
    }

    if (!isOwner && role !== "manager" && userProfile?.roomAccess === "selected" && !userProfile.allowedRoomIds?.includes(roomId)) {
      throw new HttpsError("permission-denied", "Nu ai acces la sala aleasă.");
    }

    const locationSnapshot = await db.doc(`locations/${locationId}`).get();

    if (!locationSnapshot.exists && !isOwner) {
      throw new HttpsError("not-found", "Locația nu există.");
    }

    const location = locationSnapshot.data() ?? {};
    const billingStatus = String(location.billingStatus ?? "");
    const trialEndsAt = location.trialEndsAt as { toMillis?: () => number } | undefined;

    if (!isOwner && billingStatus && billingStatus !== "active" && billingStatus !== "trialing") {
      throw new HttpsError("failed-precondition", "Locația nu permite momentan modificări.");
    }

    if (!isOwner && billingStatus === "trialing" && trialEndsAt?.toMillis && trialEndsAt.toMillis() <= Date.now()) {
      throw new HttpsError("failed-precondition", "Trialul locației a expirat.");
    }

    const notifyOffsets = payload.notifyOnThisBooking ? cleanNotificationOffsets(payload.notifyOffsets) : [];
    const notifyGroupOffsets = payload.notifyGroupOnThisBooking ? cleanNotificationOffsets(payload.notifyGroupOffsets) : [];
    const now = FieldValue.serverTimestamp();
    const bookingPayload: Record<string, unknown> = {
      group,
      congregatie: group,
      room,
      roomId,
      location: room,
      startDate,
      endDate,
      startTime,
      endTime,
      orar: `${startTime} - ${endTime}`,
      reason,
      motiv: reason,
      locationId,
      locationName,
      notifyOnThisBooking: payload.notifyOnThisBooking === true,
      notifyOffsets,
      notifyForUid: payload.notifyOnThisBooking === true ? request.auth.uid : "",
      updatedBy: userProfile?.displayName || request.auth.token.email || "",
      updatedAt: now,
    };

    if (payload.notifyGroupOnThisBooking === true) {
      bookingPayload.notifyGroupOnThisBooking = true;
      bookingPayload.notifyGroupOffsets = notifyGroupOffsets;
      bookingPayload.notifyGroupAudience = payload.notifyGroupAudience === "selected" ? "selected" : "all";
      bookingPayload.notifyGroupRecipients = Array.isArray(payload.notifyGroupRecipients)
        ? payload.notifyGroupRecipients.map((item) => cleanEmail(item)).filter(Boolean).slice(0, 200)
        : [];
    }

    // Collaborators can only ping their own group; the whole-location scope and
    // hand-picked recipients are administrator features, enforced here.
    const canNotifyBeyondGroup = isOwner || role === "manager";
    let nowPush: NowPushAudience | null = null;

    if (payload.notifyGroupNow === true) {
      const scope = canNotifyBeyondGroup && payload.notifyNowScope === "location" ? "location" : "group";
      const audience = canNotifyBeyondGroup && scope === "group" && payload.notifyGroupAudience === "selected" ? "selected" : "all";
      const recipients = audience === "selected" && Array.isArray(payload.notifyGroupRecipients)
        ? payload.notifyGroupRecipients.map((item) => cleanEmail(item)).filter(Boolean).slice(0, 200)
        : [];

      bookingPayload.notifyGroupNowAt = now;
      bookingPayload.notifyGroupNowBy = request.auth.token.email || "";
      bookingPayload.notifyGroupAudience = audience;
      bookingPayload.notifyGroupRecipients = recipients;
      nowPush = { audience, recipients, scope };
    }

    let pushResult = { sent: 0 };

    if (editingId) {
      const ref = db.doc(`events/${editingId}`);
      const beforeSnapshot = await ref.get();

      if (!beforeSnapshot.exists) {
        throw new HttpsError("not-found", "Programarea nu mai există.");
      }

      const before = beforeSnapshot.data() ?? {};

      if (!isOwner && role !== "manager" && before.authorEmail !== request.auth.token.email) {
        throw new HttpsError("permission-denied", "Poți edita doar programările tale.");
      }

      await ref.update(bookingPayload);

      if (nowPush) {
        pushResult = await sendInstantBookingPush(editingId, { ...before, ...bookingPayload }, locationId, group, nowPush);
      }

      return { id: editingId, pushSent: pushResult.sent, saved: true };
    }

    bookingPayload.authorEmail = request.auth.token.email || "";
    bookingPayload.authorName = userProfile?.displayName || request.auth.token.email || "Utilizator";
    bookingPayload.createdAt = now;
    bookingPayload.deleted = false;

    const created = await db.collection("events").add(bookingPayload);

    await db.doc(`locations/${locationId}`).set(
      {
        usage: {
          bookingCount: FieldValue.increment(1),
        },
        updatedAt: now,
      },
      { merge: true }
    );

    if (nowPush) {
      pushResult = await sendInstantBookingPush(created.id, bookingPayload, locationId, group, nowPush);
    }

    try {
      await sendNewBookingPush(
        created.id,
        bookingPayload,
        locationId,
        group,
        cleanEmail(request.auth.token.email),
        nowPush
      );
    } catch (error) {
      logger.error("New booking push failed", { bookingId: created.id, error });
    }

    return { id: created.id, pushSent: pushResult.sent, saved: true };
  }
);

export const syncUserSecurityClaims = onDocumentWritten(
  {
    document: "users/{userId}",
    region: "europe-west1",
  },
  async (event) => {
    const { userId } = event.params;
    const before = event.data?.before;
    const after = event.data?.after;

    try {
      if (!after?.exists) {
        await getAuth().setCustomUserClaims(userId, {});
        logger.info("Cleared user security claims", { userId });
        return;
      }

      const claims = userClaimsFromProfile(after.data() as UserProfile);

      // Most user-doc writes are personal-settings changes (name, notification
      // prefs, language) that don't touch a single security-relevant field. Skip
      // the privileged Admin call + forced token refresh when nothing changed.
      if (before?.exists) {
        const prevClaims = userClaimsFromProfile(before.data() as UserProfile);

        if (JSON.stringify(prevClaims) === JSON.stringify(claims)) {
          return;
        }
      }

      await getAuth().setCustomUserClaims(userId, claims);
      logger.info("Synced user security claims", { userId, claims });
    } catch (error) {
      logger.error("User security claims sync failed", { userId, error });
    }
  }
);

async function newsletterRecipients(recipientEmail = "") {
  const db = getFirestore();
  const recipients = new Map<string, NewsletterRecipient>();
  const targetEmail = cleanEmail(recipientEmail);

  const subscriberSnapshot = await db.collection("newsletterSubscribers").limit(5000).get();

  subscriberSnapshot.forEach((doc) => {
    const data = doc.data();
    const email = cleanEmail(data.email);

    if (data.status === "active" && data.unsubscribed !== true && validEmail(email)) {
      recipients.set(email, { email });
    }
  });

  const legacySnapshot = await db
    .collection("communityApplications")
    .where("source", "==", "landing-newsletter")
    .limit(5000)
    .get();

  legacySnapshot.forEach((doc) => {
    const email = cleanEmail(doc.data().email);

    if (validEmail(email)) {
      recipients.set(email, { email });
    }
  });

  const allRecipients = [...recipients.values()];
  return targetEmail
    ? allRecipients.filter((recipient) => recipient.email === targetEmail)
    : allRecipients;
}

export const sendCommunityApplicationReply = onDocumentCreated(
  {
    document: "communityApplications/{applicationId}/messages/{messageId}",
    region: "europe-west1",
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      return;
    }

    const { applicationId, messageId } = event.params;
    const message = snapshot.data() as CommunityMessage;

    if (message.deliveryStatus !== "pending") {
      return;
    }

    if (!message.toEmail || !message.body) {
      await snapshot.ref.update({
        deliveryStatus: "failed",
        failedAt: FieldValue.serverTimestamp(),
        errorMessage: "Mesajul nu are destinatar sau conținut.",
      });
      return;
    }

    const resend = new Resend(resendApiKey.value());

    try {
      const result = await resend.emails.send({
        from: emailFrom.value(),
        to: [message.toEmail],
        replyTo: message.fromEmail ? [message.fromEmail] : undefined,
        subject: "Răspuns la cererea Community Kelunia",
        text: emailText(applicationId, message),
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      await snapshot.ref.update({
        deliveryStatus: "sent",
        sentAt: FieldValue.serverTimestamp(),
        resendEmailId: result.data?.id ?? "",
      });

      await getFirestore().doc(`communityApplications/${applicationId}`).set(
        {
          status: "replied",
          lastReplyAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "Kelunia Email",
          updatedByUid: "system",
        },
        { merge: true }
      );
    } catch (error) {
      logger.error("Community reply email failed", {
        applicationId,
        messageId,
        error,
      });

      await snapshot.ref.update({
        deliveryStatus: "failed",
        failedAt: FieldValue.serverTimestamp(),
        errorMessage: error instanceof Error ? error.message : "Emailul nu a putut fi trimis.",
      });
    }
  }
);

export const sendNewsletterCampaign = onDocumentCreated(
  {
    document: "newsletterCampaigns/{campaignId}",
    region: "europe-west1",
    secrets: [resendApiKey],
    timeoutSeconds: 540,
  },
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      return;
    }

    const { campaignId } = event.params;
    const campaign = snapshot.data() as NewsletterCampaign;

    if (campaign.status !== "pending") {
      return;
    }

    if (!campaign.subject || !campaign.body) {
      await snapshot.ref.update({
        status: "failed",
        completedAt: FieldValue.serverTimestamp(),
        errorMessage: "Campania nu are subiect sau conținut.",
      });
      return;
    }

    const recipients = await newsletterRecipients(campaign.recipientEmail);

    await snapshot.ref.update({
      status: "sending",
      recipientCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      startedAt: FieldValue.serverTimestamp(),
    });

    if (recipients.length === 0) {
      await snapshot.ref.update({
        status: "failed",
        completedAt: FieldValue.serverTimestamp(),
        errorMessage: campaign.recipientEmail
          ? "Nu există abonat activ pentru acest email."
          : "Nu există abonați activi.",
      });
      return;
    }

    const resend = new Resend(resendApiKey.value());
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const deliveryRef = snapshot.ref.collection("deliveries").doc(deliveryIdForEmail(recipient.email));

      try {
        const result = await resend.emails.send({
          from: emailFrom.value(),
          to: [recipient.email],
          replyTo: campaign.createdBy ? [campaign.createdBy] : undefined,
          subject: campaign.subject,
          text: newsletterText(campaign),
          html: newsletterHtml(campaign),
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        sentCount += 1;

        await deliveryRef.set({
          email: recipient.email,
          status: "sent",
          resendEmailId: result.data?.id ?? "",
          sentAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        failedCount += 1;

        logger.error("Newsletter email failed", {
          campaignId,
          email: recipient.email,
          error,
        });

        await deliveryRef.set({
          email: recipient.email,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Emailul nu a putut fi trimis.",
          failedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await snapshot.ref.update({
      status: failedCount === 0 ? "sent" : sentCount > 0 ? "partial" : "failed",
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      completedAt: FieldValue.serverTimestamp(),
    });
  }
);

export const sendLicenseEmail = onDocumentCreated(
  {
    document: "licenseEmailRequests/{requestId}",
    region: "europe-west1",
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      return;
    }

    const { requestId } = event.params;
    const request = snapshot.data() as LicenseEmailRequest;

    if (request.status !== "pending") {
      return;
    }

    if (!request.toEmail || !request.code) {
      await snapshot.ref.update({
        status: "failed",
        failedAt: FieldValue.serverTimestamp(),
        errorMessage: "Cererea nu are destinatar sau cod.",
      });
      return;
    }

    const resend = new Resend(resendApiKey.value());

    try {
      const result = await resend.emails.send({
        from: emailFrom.value(),
        to: [request.toEmail],
        subject: emailSubject("license", request.language),
        text: licenseEmailText(request),
        html: licenseEmailHtml(request),
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      await snapshot.ref.update({
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
        resendEmailId: result.data?.id ?? "",
      });
    } catch (error) {
      logger.error("License email failed", {
        requestId,
        licenseId: request.licenseId,
        error,
      });

      await snapshot.ref.update({
        status: "failed",
        failedAt: FieldValue.serverTimestamp(),
        errorMessage: error instanceof Error ? error.message : "Emailul nu a putut fi trimis.",
      });
    }
  }
);

export { setPin, verifyPin, disablePin } from "./pin";

// Temporary groups/rooms carry activeUntil (YYYY-MM-DD) and drop out of the
// pickers at midnight after that day. At noon on the last day the location's
// administrators get a push so they can extend it from Settings.
export const notifySpaceExpiry = onSchedule(
  {
    region: "europe-west1",
    schedule: "0 12 * * *",
    timeZone: "Europe/Bucharest",
  },
  async () => {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });
    const expiringByLocation = new Map<string, string[]>();

    for (const [collectionName, label] of [["groups", "Grup"], ["rooms", "Sala"]] as const) {
      const snapshot = await db.collection(collectionName).where("activeUntil", "==", today).get();

      snapshot.docs.forEach((itemDoc) => {
        const data = itemDoc.data();
        const locationId = cleanText(data.locationId, 160);

        if (!locationId || data.deleted === true) {
          return;
        }

        const items = expiringByLocation.get(locationId) ?? [];
        items.push(`${label} ${cleanText(data.name, 120)}`);
        expiringByLocation.set(locationId, items);
      });
    }

    for (const [locationId, items] of expiringByLocation) {
      try {
        const recipients = await loadLocationPushRecipients(locationId);

        await deliverPush(
          recipients.filter((item) => item.isAdmin).map((item) => item.token),
          {
            bookingId: "",
            body: `Provizoriu până azi: ${items.join(", ")}. Dispare la miezul nopții - prelungește din Setări dacă mai e nevoie.`,
            tag: `space-expiry-${locationId}-${today}`,
            title: "Perioadă provizorie încheiată azi",
            url: "/dashboard",
          }
        );
      } catch (error) {
        logger.error("Space expiry push failed", { locationId, error });
      }
    }
  }
);

// ---------------------------------------------------------------------------
// Closing a location: read-only for closureGraceDays, then purged for good.
// ---------------------------------------------------------------------------

async function requireLocationAdmin(request: CallableRequest, locationId: string) {
  if (!request.auth?.uid || request.auth.token.email_verified !== true) {
    throw new HttpsError("unauthenticated", "Trebuie să fii autentificat cu email verificat.");
  }

  const profileSnapshot = await db.doc(`users/${request.auth.uid}`).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() as UserProfile : null;
  const email = cleanEmail(request.auth.token.email);
  const isOwner = profile?.isOwner === true || email === ownerAccountEmail;
  const isLocationAdmin = normalizeRole(profile?.role) === "manager" && profile?.locationId === locationId;

  if (!isOwner && !isLocationAdmin) {
    throw new HttpsError("permission-denied", "Doar un administrator al locației poate face asta.");
  }

  return { email };
}

// Licence / subscription records that mention a location are accounting records:
// the purge deliberately leaves them, and the owner is told which ones remain.
async function linkedBillingDocuments(locationId: string) {
  const [licenses, subscriptions] = await Promise.all([
    db.collection("licenses").where("locationId", "==", locationId).get(),
    db.collection("subscriptions").where("locationId", "==", locationId).get(),
  ]);

  return {
    licenseCodes: licenses.docs.map((item) => cleanText(item.data().code, 80) || item.id),
    subscriptionCount: subscriptions.size,
  };
}

function billingDocumentLines(documents: { licenseCodes: string[]; subscriptionCount: number }) {
  return [
    "Rămân păstrate pentru audit contabil (nu se șterg): înregistrarea locației cu datele de facturare (arhivată în closedLocations), jurnalul de audit pentru locație și licențe, plus:",
    `- Licențe (${documents.licenseCodes.length}): ${documents.licenseCodes.join(", ") || "-"}`,
    `- Abonamente: ${documents.subscriptionCount}`,
  ].join("\n");
}

// Email + push to the platform owner about a location's lifecycle.
async function notifyOwner(subject: string, lines: string[], pushBody: string) {
  const text = lines.join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px"><h1 style="font-size:22px;margin:0 0 18px;color:#b9503d">Kelunia</h1><p>${escapeHtml(text).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br />")}</p></div>`;

  await new Resend(resendApiKey.value()).emails
    .send({ from: emailFrom.value(), to: [ownerAccountEmail], subject, text, html })
    .catch((error) => logger.warn("Owner notice email failed", { subject, error }));

  const tokens = await db.collection("notificationTokens").where("email", "==", ownerAccountEmail).get();

  await deliverPush(
    tokens.docs.map((item) => item.data() as NotificationTokenDocument).filter((item) => Boolean(item.token)),
    { bookingId: "", body: pushBody, tag: `location-lifecycle-${Date.now()}`, title: subject, url: "/dashboard" }
  ).catch((error) => logger.warn("Owner notice push failed", { subject, error }));
}

export const requestLocationClosure = onCall(
  {
    region: "europe-west1",
    secrets: [resendApiKey],
    enforceAppCheck: true,
  },
  async (request) => {
    const data = request.data as { locationId?: string; confirmationName?: string } | undefined;
    const locationId = cleanText(data?.locationId, 160);

    if (!locationId) {
      throw new HttpsError("invalid-argument", "Locația lipsește.");
    }

    const admin = await requireLocationAdmin(request, locationId);
    const locationRef = db.doc(`locations/${locationId}`);
    const locationSnapshot = await locationRef.get();

    if (!locationSnapshot.exists) {
      throw new HttpsError("not-found", "Locația nu există.");
    }

    const location = locationSnapshot.data() ?? {};

    if (location.closureScheduledFor) {
      throw new HttpsError("failed-precondition", "Locația este deja în curs de închidere.", { reason: "already-closing" });
    }

    const locationName = cleanText(location.name ?? location.locationName, 180);

    if (cleanText(data?.confirmationName, 180).toLowerCase() !== locationName.toLowerCase()) {
      throw new HttpsError("invalid-argument", "Numele locației nu se potrivește.", { reason: "name-mismatch" });
    }

    const scheduledFor = Timestamp.fromMillis(Date.now() + closureGraceDays * 24 * 60 * 60 * 1000);

    await locationRef.update({
      billingStatus: "canceled",
      statusBeforeClosure: cleanText(location.billingStatus, 30) || "active",
      closureRequestedAt: FieldValue.serverTimestamp(),
      closureRequestedBy: admin.email,
      closureScheduledFor: scheduledFor,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.email,
    });

    // Tell everyone on the location, each in their own language. A failed email
    // must never undo the closure.
    try {
      const members = await db.collection("users").where("locationId", "==", locationId).get();
      const resend = new Resend(resendApiKey.value());

      for (const member of members.docs.slice(0, 300)) {
        const profile = member.data() as UserProfile & { language?: string };
        const to = cleanEmail(profile.email);

        if (!to || profile.isOwner === true) {
          continue;
        }

        const mail = closureEmail(emailLanguage(profile.language), {
          location: locationName,
          admin: admin.email,
          scheduledFor: scheduledFor.toDate(),
        });

        await resend.emails.send({ from: emailFrom.value(), to: [to], subject: mail.subject, text: mail.text, html: mail.html })
          .catch((error) => logger.warn("Closure notice email failed", { to, error }));
      }
    } catch (error) {
      logger.error("Closure notices failed", { locationId, error });
    }

    try {
      const dateLabel = scheduledFor.toDate().toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
      const billing = await linkedBillingDocuments(locationId);

      await notifyOwner(
        `Locația ${locationName} a fost închisă`,
        [
          `Locația ${locationName} (${locationId}) a fost închisă de ${admin.email}.`,
          `Aplicația rămâne doar în citire pentru ea până pe ${dateLabel}; atunci se șterg automat programările, grupurile, sălile, codurile de acces și toate conturile membrilor.`,
          billingDocumentLines(billing),
          "Dacă a fost o greșeală, locația poate fi redeschisă din Setări până la data de mai sus.",
        ],
        `${locationName} se închide; ștergere automată pe ${dateLabel}.`
      );
    } catch (error) {
      logger.error("Owner closure notice failed", { locationId, error });
    }

    logger.info("Location closure requested", { locationId, by: admin.email, scheduledFor: scheduledFor.toDate().toISOString() });

    return { scheduledFor: scheduledFor.toMillis() };
  }
);

export const cancelLocationClosure = onCall(
  {
    region: "europe-west1",
    secrets: [resendApiKey],
    enforceAppCheck: true,
  },
  async (request) => {
    const locationId = cleanText((request.data as { locationId?: string } | undefined)?.locationId, 160);

    if (!locationId) {
      throw new HttpsError("invalid-argument", "Locația lipsește.");
    }

    const admin = await requireLocationAdmin(request, locationId);
    const locationRef = db.doc(`locations/${locationId}`);
    const locationSnapshot = await locationRef.get();
    const location = locationSnapshot.data();

    if (!location?.closureScheduledFor) {
      throw new HttpsError("failed-precondition", "Locația nu este în curs de închidere.");
    }

    await locationRef.update({
      billingStatus: cleanText(location.statusBeforeClosure, 30) || "active",
      statusBeforeClosure: FieldValue.delete(),
      closureRequestedAt: FieldValue.delete(),
      closureRequestedBy: FieldValue.delete(),
      closureScheduledFor: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.email,
    });

    try {
      const name = cleanText(location.name ?? location.locationName, 180);
      await notifyOwner(
        `Locația ${name} a fost redeschisă`,
        [`${admin.email} a redeschis locația ${name} (${locationId}). Ștergerea programată a fost anulată.`],
        `${name} a fost redeschisă; ștergerea a fost anulată.`
      );
    } catch (error) {
      logger.error("Owner reopen notice failed", { locationId, error });
    }

    logger.info("Location closure cancelled", { locationId, by: admin.email });

    return { reopened: true };
  }
);

export const purgeClosedLocations = onSchedule(
  {
    region: "europe-west1",
    schedule: "0 3 * * *",
    secrets: [resendApiKey],
    timeZone: "Europe/Bucharest",
    timeoutSeconds: 540,
  },
  async () => {
    const due = await db.collection("locations").where("closureScheduledFor", "<=", Timestamp.now()).get();

    for (const location of due.docs) {
      const data = location.data();

      // Only locations that really went through the closure flow.
      if (data.billingStatus !== "canceled" || !data.closureRequestedAt) {
        logger.warn("Skipping purge: location is not in a closed state", { locationId: location.id });
        continue;
      }

      try {
        const name = cleanText(data.name ?? data.locationName, 180);
        // Read before the purge: afterwards nothing links back to the location.
        const billing = await linkedBillingDocuments(location.id);
        const result = await purgeLocation(db, getAuth(), location.id, ownerAccountEmail);
        logger.info("Purged closed location", { locationId: location.id, ...result });

        await notifyOwner(
          `Locația ${name} a fost ștearsă definitiv`,
          [
            `Perioada de 30 de zile s-a încheiat: locația ${name} (${location.id}) și ${result.accountsDeleted} conturi asociate au fost șterse definitiv, împreună cu programările, grupurile, sălile și codurile ei.`,
            billingDocumentLines(billing),
          ],
          `${name} a fost ștearsă definitiv (${result.accountsDeleted} conturi).`
        );
      } catch (error) {
        logger.error("Location purge failed", { locationId: location.id, error });
      }
    }
  }
);
