import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
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
    `Cod licență: ${code}`,
    `Link cont: ${link}`,
    "",
    "Pași:",
    "1. Deschide linkul.",
    "2. Alege „Am cod”, dacă nu este selectat automat.",
    "3. Creează contul și finalizează locația.",
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
    '<p style="margin:18px 0 8px;color:#667085">Cod licență</p>',
    `<p style="font-size:24px;font-weight:700;letter-spacing:1px;margin:0 0 18px">${escapeHtml(code)}</p>`,
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Creează contul</a></p>`,
    `<p style="font-size:13px;color:#667085;margin-top:18px">Dacă butonul nu merge, deschide acest link: ${escapeHtml(link)}</p>`,
    "</div>",
  ].join("");
}

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
