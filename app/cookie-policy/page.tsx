import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Cookie Policy | Kelunia",
  description: "How Kelunia uses cookies, local storage and similar technologies.",
};

const updatedAt = "May 29, 2026";

export default function CookiePolicyPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      description="This Cookie Policy explains how Kelunia uses cookies, local storage and similar technologies on the website, PWA and apps."
      updatedAt={updatedAt}
      sections={[
        {
          title: "1. What cookies and local storage are",
          body: "Cookies and local storage are small pieces of data stored on your device. They help websites and apps remember settings, keep sessions secure and provide core functionality.",
        },
        {
          title: "2. What Kelunia uses",
          items: [
            "Essential authentication and security storage needed to sign you in and protect your session.",
            "Preference storage, such as language, interface choices, app lock preferences and notification preferences.",
            "PWA and app storage needed for installation, offline behavior, push notification registration and reliable app loading.",
            "Operational data needed to prevent errors, preserve state and improve the reliability of the service.",
          ],
        },
        {
          title: "3. Analytics and marketing",
          body: "Kelunia does not use non-essential advertising cookies by default. If analytics or marketing cookies are added later, this policy will be updated and, where required, consent controls will be provided.",
        },
        {
          title: "4. Third-party technologies",
          body: "Some service providers, such as Firebase, Vercel, Resend, Apple or Google platform services, may use cookies or similar technologies as part of authentication, hosting, email delivery, push notifications, app distribution or security.",
        },
        {
          title: "5. Managing cookies",
          body: "You can manage cookies and local storage through your browser or operating system settings. Blocking essential storage may prevent login, app installation, notifications or other core features from working correctly.",
        },
        {
          title: "6. Contact",
          body: "For questions about cookies or local storage, contact support@kelunia.com.",
        },
      ]}
    />
  );
}
