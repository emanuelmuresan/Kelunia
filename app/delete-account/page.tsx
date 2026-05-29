import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Delete Account | Kelunia",
  description: "How to request deletion of your Kelunia account and associated personal data.",
};

const updatedAt = "May 29, 2026";

export default function DeleteAccountPage() {
  return (
    <LegalDocument
      title="Delete Account"
      description="Use this page to request deletion of your Kelunia account and associated personal data."
      updatedAt={updatedAt}
      sections={[
        {
          title: "1. How to request account deletion",
          items: [
            "Send an email to support@kelunia.com from the email address connected to your Kelunia account.",
            "Use the subject line: Delete Kelunia account.",
            "Include the email address of the account and, if relevant, the organization or location name.",
            "If you cannot send the request from the account email address, include enough information for us to verify that you own the account.",
          ],
        },
        {
          title: "2. What will be deleted",
          items: [
            "Your personal account profile, such as name, email preferences and personal settings.",
            "Authentication-related data that can be removed from Kelunia-controlled systems.",
            "Push notification tokens and notification preferences associated with your account.",
            "Personal data connected to support or contact requests, unless retention is required for legal or security reasons.",
          ],
        },
        {
          title: "3. Organization and booking data",
          body: "If your account is part of an organization, some booking, audit or operational records may need to remain visible to that organization for accountability, security, legal or legitimate business reasons. Where possible, personal identifiers may be deleted, anonymized or reduced.",
        },
        {
          title: "4. Timing",
          body: "We aim to respond to deletion requests within 30 days. Complex requests, legal requirements or identity verification may require additional time.",
        },
        {
          title: "5. Subscriptions and billing",
          body: "Deleting an account does not automatically cancel any active subscription managed by an app store, payment provider or organization administrator. Please cancel active billing separately where applicable.",
        },
        {
          title: "6. Need help?",
          body: "Contact support@kelunia.com and we will guide you through the account deletion process.",
        },
      ]}
    />
  );
}
