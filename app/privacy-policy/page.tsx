import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | Kelunia",
  description: "How Kelunia collects, uses, stores and protects personal data.",
};

const updatedAt = "May 29, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="This Privacy Policy explains how Kelunia handles personal data when you use the website, PWA, Android app, iOS app or related services."
      updatedAt={updatedAt}
      sections={[
        {
          title: "1. Who we are",
          body: "Kelunia is a scheduling and shared-space management service. For privacy questions, data access requests or deletion requests, contact us at support@kelunia.com.",
        },
        {
          title: "2. Data we collect",
          items: [
            "Account data, such as name, email address, language preference, role and authentication status.",
            "Location and workspace data, such as location names, rooms, groups, user permissions and access codes.",
            "Booking data, such as dates, times, rooms, groups, notes, recurring schedules and booking history.",
            "Security and audit data, such as account actions, permission changes, login-related events and device or session metadata needed to protect the service.",
            "Notification data, such as push notification tokens, reminder preferences and delivery status.",
            "Support or contact data, such as messages sent through the website, newsletter signups or email communication.",
          ],
        },
        {
          title: "3. How we use data",
          items: [
            "To create and manage accounts, locations, rooms, groups, bookings and access permissions.",
            "To send authentication emails, password reset emails, access invitations, booking reminders and service messages.",
            "To protect the service, prevent abuse, troubleshoot issues and keep audit logs for accountability.",
            "To improve Kelunia, understand usage and prepare customer support responses.",
            "To comply with legal, security, billing and platform requirements.",
          ],
        },
        {
          title: "4. Legal bases",
          body: "Where applicable, we process personal data to provide the service under a contract, to comply with legal obligations, based on legitimate interests such as security and service improvement, or based on consent for optional communications and notifications.",
        },
        {
          title: "5. Service providers",
          items: [
            "Firebase / Google Cloud for authentication, database, storage, cloud functions and push notification infrastructure.",
            "Vercel for hosting the public web app and PWA.",
            "Resend for transactional and service emails.",
            "Apple and Google platform services for app distribution, device-level push delivery and operating system integrations.",
          ],
        },
        {
          title: "6. Data retention",
          body: "We keep data only as long as needed for the service, security, audit, billing and legal purposes. Account and location data may be deleted or anonymized after a valid deletion request, unless retention is required for legitimate legal or security reasons.",
        },
        {
          title: "7. Your rights",
          items: [
            "You can request access to your personal data.",
            "You can request correction of inaccurate data.",
            "You can request deletion of your account and associated personal data.",
            "You can object to certain processing or request restriction where applicable.",
            "You can withdraw optional consent, such as newsletter or notification consent, where applicable.",
          ],
        },
        {
          title: "8. Security",
          body: "Kelunia uses authentication, access controls, Firebase security rules, audit records and least-privilege design to protect data. No system is perfectly secure, but we work to reduce risk and respond to security issues quickly.",
        },
        {
          title: "9. International transfers",
          body: "Service providers may process data in countries other than your own. Where required, data transfers rely on appropriate safeguards provided by those service providers.",
        },
        {
          title: "10. Contact",
          body: "For privacy questions or requests, email support@kelunia.com. If you ask us to delete an account, use the email address associated with that account so we can verify ownership.",
        },
      ]}
    />
  );
}
