import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { Resend } from "resend";

initializeApp();

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

type UserRole = "manager" | "member" | "guest";

type UserProfile = {
  isOwner?: boolean;
  locationId?: string;
  locationSetupRequired?: boolean;
  role?: string;
};

function normalizeRole(role: unknown): UserRole {
  if (role === "manager" || role === "superadmin") {
    return "manager";
  }

  if (role === "member" || role === "admin") {
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

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
