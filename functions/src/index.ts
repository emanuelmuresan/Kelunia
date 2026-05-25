import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { Resend } from "resend";
import { createHash } from "node:crypto";

initializeApp();

const db = getFirestore();

const resendApiKey = defineSecret("RESEND_API_KEY");
const emailFrom = defineString("EMAIL_FROM", {
  default: "Kelunia <support@kelunia.com>",
});
const appBaseUrl = defineString("APP_BASE_URL", {
  default: "https://www.kelunia.com",
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
  licenseId?: string;
  message?: string;
  status?: string;
  toEmail?: string;
};

type AccessInviteEmailRequest = {
  code?: string;
  message?: string;
  toEmail?: string;
};

type AccessCodeDocument = {
  active?: boolean;
  code?: string;
  deleted?: boolean;
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
  uid?: string;
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

async function sendInstantBookingPush(
  bookingId: string,
  bookingPayload: Record<string, unknown>,
  senderUid: string,
  locationId: string,
  group: string,
  audience: "all" | "selected",
  recipients: string[]
) {
  const locationTokensSnapshot = await db
    .collection("notificationTokens")
    .where("locationId", "==", locationId)
    .get();
  const groupKey = group.trim().toLowerCase();
  const recipientSet = new Set(recipients.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const tokenDocs = locationTokensSnapshot.docs.filter((tokenDoc) => {
    const tokenData = tokenDoc.data() as NotificationTokenDocument;
    const sameGroup = cleanText(tokenData.groupName, 120).toLowerCase() === groupKey;
    const selectedRecipient = audience !== "selected" || recipientSet.has(cleanEmail(tokenData.email));

    return Boolean(tokenData.token) && sameGroup && selectedRecipient && tokenData.uid !== senderUid;
  });
  const uniqueTokens = [...new Set(tokenDocs.map((tokenDoc) => String((tokenDoc.data() as NotificationTokenDocument).token)))];

  if (uniqueTokens.length === 0) {
    return { sent: 0 };
  }

  const url = `/dashboard?booking=${encodeURIComponent(bookingId)}`;
  let sent = 0;

  for (let index = 0; index < uniqueTokens.length; index += 500) {
    const tokens = uniqueTokens.slice(index, index + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      data: {
        bookingId,
        body: bookingNotificationBody(bookingPayload),
        tag: `booking-now-${bookingId}`,
        title: "Reminder grup",
        url,
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        fcmOptions: {
          link: `${appBaseUrl.value()}${url}`,
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

  return { sent };
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

function roleLabel(role: UserRole) {
  if (role === "manager") {
    return "Administrator";
  }

  if (role === "member") {
    return "Colaborator";
  }

  return "Oaspete";
}

function accessInviteText(request: AccessInviteEmailRequest, accessCode: AccessCodeDocument) {
  const code = accessCode.code ?? request.code ?? "";
  const email = cleanEmail(request.toEmail);
  const link = appUrl(`/login?invite=${encodeURIComponent(code)}${email ? `&email=${encodeURIComponent(email)}` : ""}`);
  const groupName = accessCode.role === "manager" ? "" : accessCode.groupName?.trim();
  const customMessage = request.message?.trim();

  return [
    customMessage || `Ai primit o invitație pentru Kelunia, locația ${accessCode.locationName ?? ""}.`,
    "",
    `Locație: ${accessCode.locationName ?? ""}`,
    `Rol: ${roleLabel(accessCode.role ?? "guest")}`,
    groupName ? `Grup: ${groupName}` : "",
    "",
    "Pași:",
    "1. Deschide linkul de mai jos pe telefon sau calculator.",
    "2. Creează contul sau intră în cont dacă ai deja unul.",
    "3. Confirmă emailul, dacă aplicația îți cere acest lucru.",
    "4. Kelunia va folosi codul de acces pentru a te conecta la locația potrivită.",
    "",
    `Link invitație: ${link}`,
    `Cod acces: ${code}`,
    "",
    "Dacă linkul nu se deschide corect, intră manual în aplicația Kelunia și folosește codul de acces de mai sus.",
    "",
    "---",
    "Kelunia",
  ].filter(Boolean).join("\n");
}

function accessInviteHtml(request: AccessInviteEmailRequest, accessCode: AccessCodeDocument) {
  const code = accessCode.code ?? request.code ?? "";
  const email = cleanEmail(request.toEmail);
  const link = appUrl(`/login?invite=${encodeURIComponent(code)}${email ? `&email=${encodeURIComponent(email)}` : ""}`);
  const groupName = accessCode.role === "manager" ? "" : accessCode.groupName?.trim();
  const customMessage = escapeHtml(request.message?.trim() || `Ai primit o invitație pentru Kelunia, locația ${accessCode.locationName ?? ""}.`).replace(/\n/g, "<br />");

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px">',
    '<h1 style="font-size:22px;margin:0 0 18px;color:#0f766e">Kelunia</h1>',
    `<p>${customMessage}</p>`,
    '<div style="background:#f6f9ff;border:1px solid #d9e4f2;border-radius:10px;padding:14px 16px;margin:18px 0">',
    `<p style="margin:0 0 6px"><strong>Locație:</strong> ${escapeHtml(accessCode.locationName ?? "")}</p>`,
    `<p style="margin:0 0 6px"><strong>Rol:</strong> ${escapeHtml(roleLabel(accessCode.role ?? "guest"))}</p>`,
    groupName ? `<p style="margin:0"><strong>Grup:</strong> ${escapeHtml(groupName)}</p>` : "",
    "</div>",
    '<p style="font-weight:700;margin:18px 0 8px">Pașii necesari</p>',
    '<ol style="margin:0 0 18px;padding-left:20px">',
    "<li>Deschide linkul pe telefon sau calculator.</li>",
    "<li>Creează contul sau intră în cont dacă ai deja unul.</li>",
    "<li>Confirmă emailul, dacă aplicația îți cere acest lucru.</li>",
    "<li>Kelunia va folosi codul de acces pentru a te conecta la locația potrivită.</li>",
    "</ol>",
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Deschide invitația</a></p>`,
    '<p style="margin:18px 0 8px;color:#667085">Cod acces</p>',
    `<p style="font-size:24px;font-weight:700;letter-spacing:1px;margin:0 0 18px">${escapeHtml(code)}</p>`,
    `<p style="font-size:13px;color:#667085;margin-top:18px">Dacă butonul nu merge, deschide acest link: ${escapeHtml(link)}</p>`,
    '<p style="font-size:13px;color:#667085;margin-top:8px">Dacă linkul nu se deschide corect, intră manual în aplicația Kelunia și folosește codul de acces de mai sus.</p>',
    "</div>",
  ].join("");
}

export const sendAuthVerificationEmail = onCall(
  {
    region: "europe-west1",
    secrets: [resendApiKey],
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

    const link = await getAuth().generateEmailVerificationLink(user.email, {
      url: appUrl("/login"),
      handleCodeInApp: false,
    });

    const resend = new Resend(resendApiKey.value());
    const result = await resend.emails.send({
      from: emailFrom.value(),
      to: [user.email],
      subject: "Confirmă emailul pentru Kelunia",
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
      subject: "Resetează parola Kelunia",
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
      subject: `Invitație Kelunia - ${accessCode.locationName ?? "locația ta"}`,
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
        uid: request.auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { registered: true };
  }
);

export const saveBooking = onCall(
  {
    region: "europe-west1",
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

    if (payload.notifyGroupNow === true) {
      bookingPayload.notifyGroupNowAt = now;
      bookingPayload.notifyGroupNowBy = request.auth.token.email || "";
      bookingPayload.notifyGroupAudience = payload.notifyGroupAudience === "selected" ? "selected" : "all";
      bookingPayload.notifyGroupRecipients = Array.isArray(payload.notifyGroupRecipients)
        ? payload.notifyGroupRecipients.map((item) => cleanEmail(item)).filter(Boolean).slice(0, 200)
        : [];
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

      if (payload.notifyGroupNow === true) {
        pushResult = await sendInstantBookingPush(
          editingId,
          { ...before, ...bookingPayload },
          request.auth.uid,
          locationId,
          group,
          bookingPayload.notifyGroupAudience === "selected" ? "selected" : "all",
          Array.isArray(bookingPayload.notifyGroupRecipients) ? bookingPayload.notifyGroupRecipients as string[] : []
        );
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

    if (payload.notifyGroupNow === true) {
      pushResult = await sendInstantBookingPush(
        created.id,
        bookingPayload,
        request.auth.uid,
        locationId,
        group,
        bookingPayload.notifyGroupAudience === "selected" ? "selected" : "all",
        Array.isArray(bookingPayload.notifyGroupRecipients) ? bookingPayload.notifyGroupRecipients as string[] : []
      );
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
    const after = event.data?.after;

    try {
      if (!after?.exists) {
        await getAuth().setCustomUserClaims(userId, {});
        logger.info("Cleared user security claims", { userId });
        return;
      }

      const profile = after.data() as UserProfile;
      const claims = userClaimsFromProfile(profile);

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

  const subscriberSnapshot = await db.collection("newsletterSubscribers").get();

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
        subject: "Codul tău de licență Kelunia",
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
