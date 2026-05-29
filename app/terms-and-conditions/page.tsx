import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms & Conditions | Kelunia",
  description: "The terms that apply when using Kelunia.",
};

const updatedAt = "May 29, 2026";

export default function TermsAndConditionsPage() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      description="These Terms & Conditions govern your access to and use of Kelunia."
      updatedAt={updatedAt}
      sections={[
        {
          title: "1. Acceptance",
          body: "By using Kelunia, you agree to these Terms & Conditions. If you use Kelunia for an organization, you confirm that you are authorized to use the service on its behalf.",
        },
        {
          title: "2. The service",
          body: "Kelunia provides tools for managing shared spaces, rooms, groups, bookings, recurring schedules, permissions, reminders, audit history and related administrative workflows.",
        },
        {
          title: "3. Accounts and responsibility",
          items: [
            "You must provide accurate account information and keep your login credentials secure.",
            "You are responsible for activity performed through your account.",
            "Administrators are responsible for configuring location access, permissions, groups, rooms and user roles correctly.",
            "You must not share access codes, credentials or administrative permissions with unauthorized people.",
          ],
        },
        {
          title: "4. Acceptable use",
          items: [
            "Do not use Kelunia for unlawful, harmful, abusive, fraudulent or misleading activity.",
            "Do not attempt to bypass security, access another workspace without permission or interfere with the service.",
            "Do not upload or enter content that infringes rights, exposes sensitive third-party data without permission or violates applicable law.",
          ],
        },
        {
          title: "5. Bookings and organization data",
          body: "Kelunia helps organize bookings and permissions, but each organization remains responsible for its own operational decisions, room availability, internal policies and user management.",
        },
        {
          title: "6. Plans, trials and payments",
          body: "Some features may require a paid plan or active license. Trial periods, plan limits, pricing and billing terms may change over time. Any paid subscription is subject to the billing terms shown at the time of purchase or activation.",
        },
        {
          title: "7. Availability and changes",
          body: "We aim to keep Kelunia reliable, but we do not guarantee uninterrupted availability. We may improve, change, suspend or discontinue parts of the service when needed for security, maintenance, legal or product reasons.",
        },
        {
          title: "8. Intellectual property",
          body: "Kelunia, its design, software, branding and related materials are owned by Kelunia or its licensors. You retain responsibility for the content and data you add to your workspace.",
        },
        {
          title: "9. Limitation of liability",
          body: "To the maximum extent permitted by law, Kelunia is provided as is and we are not liable for indirect, incidental, special or consequential damages, loss of profits, loss of data or operational disruption arising from use of the service.",
        },
        {
          title: "10. Termination",
          body: "You may stop using Kelunia at any time. We may suspend or terminate access if these terms are violated, if required by law, or if continued use creates security, legal or operational risk.",
        },
        {
          title: "11. Contact",
          body: "For questions about these terms, contact support@kelunia.com.",
        },
      ]}
    />
  );
}
