// Named z-* so it runs after the other specs: registering adds users to the seeded location.
import { expect, test, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// The real login page + the real Firestore rules (emulator): a brand-new, still
// unverified account registers with an invitation code. Regression net for the
// "Missing or insufficient permissions" reports on access-code registration.

async function stubVerificationEmail(page: Page, response: Record<string, unknown> = { sent: true }) {
  // The verification email is a Cloud Function that does not exist on the emulators.
  await page.route("**/sendAuthVerificationEmail", (route) => {
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "POST, OPTIONS",
    };

    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers });
    }

    return route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify({ result: response }) });
  });
}

const password = "Parola-Sigura-2026!";

type Entry = "link" | "code-only" | "typed-code";

// How an invitee actually arrives: the link from the e-mail (code + e-mail in the
// URL), a link with only the code, or the "Am cod" tab with the code typed by hand.
async function register(page: Page, code: string, typedEmail: string, entry: Entry = "code-only") {
  await stubVerificationEmail(page);

  if (entry === "link") {
    await page.goto(`/login?invite=${code}&email=${encodeURIComponent(typedEmail.trim().toLowerCase())}`);
    await expect(page.locator('input[type="email"]')).toHaveValue(typedEmail.trim().toLowerCase());
  } else if (entry === "typed-code") {
    await page.goto("/login");
    await page.getByRole("button", { name: "Am cod" }).click();
    await page.locator('input[type="email"]').fill(typedEmail);
    await page.getByLabel("Cod acces").fill(` ${code.toLowerCase()} `);
  } else {
    await page.goto(`/login?invite=${code}`);
    await page.locator('input[type="email"]').fill(typedEmail);
  }

  await page.getByLabel("Nume și prenume").fill("Test Nou");
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
  await page.locator('form button[type="submit"]').click();
}

// Stands in for the click on the link in the verification e-mail.
async function verifyEmail(email: string) {
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-kelunia" });
  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email.trim().toLowerCase());
  await auth.updateUser(user.uid, { emailVerified: true });
}

async function logIn(page: Page) {
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('form button[type="submit"]').click();
}

// The whole journey for every role: register with the invitation, confirm the
// e-mail, sign in, land on the dashboard with the right role and permissions.
const journeys = [
  { role: "administrator", label: "Administrator", code: "KEL-E2EM-ANGR-0001", entry: "link" as const },
  { role: "collaborator", label: "Colaborator", code: "KEL-E2EB-MEMB-0002", entry: "link" as const },
  { role: "collaborator (code typed by hand)", label: "Colaborator", code: "KEL-E2EB-MEMB-0002", entry: "typed-code" as const },
  { role: "guest", label: "Oaspete", code: "KEL-E2EG-GUES-0003", entry: "code-only" as const },
];

journeys.forEach(({ role, label, code, entry }, index) => {
  test(`a ${role} can register, verify and sign in`, async ({ page }) => {
    const email = `calatorie.${index}@e2e.test`;

    await register(page, code, email, entry);
    await expect(page.locator(".success-line")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".error-line")).toHaveCount(0);

    await verifyEmail(email);
    await logIn(page);

    await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
    await expect(page.getByText(`· ${label}`).first()).toBeVisible();
    // No "choose your group" interstitial, no error banner.
    await expect(page.locator(".error-line")).toHaveCount(0);

    const canBook = role.startsWith("collaborator") || role === "administrator";
    await expect(page.locator(".fab-add")).toHaveCount(canBook ? 1 : 0);

    await page.getByRole("button", { name: /Setări/ }).first().click();
    const adminCard = page.getByRole("heading", { name: "Închidere locație" });
    await expect(adminCard).toHaveCount(role === "administrator" ? 1 : 0);

    if (role !== "administrator") {
      // Collaborators and guests carry the group the code assigned.
      await expect(page.getByText("Grupa E2E").first()).toBeVisible();
    }
  });
});

test("an e-mail typed with capitals still registers (it is normalised to lowercase)", async ({ page }) => {
  await register(page, "KEL-E2EG-GUES-0003", "  Capitalizat.Test@E2E.test ");

  await expect(page.locator(".success-line")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".error-line")).toHaveCount(0);
});

test("logging in before verifying resends the email, or says one was just sent", async ({ page }) => {
  await register(page, "KEL-E2EG-GUES-0003", "inca.neverificat@e2e.test");
  await expect(page.locator(".success-line")).toBeVisible({ timeout: 20_000 });

  // The form is back in login mode with the e-mail kept; the password was cleared.
  await logIn(page);
  await expect(page.locator(".error-line")).toContainText("Ți-am retrimis emailul de verificare", { timeout: 20_000 });

  await page.unroute("**/sendAuthVerificationEmail");
  await stubVerificationEmail(page, { sent: false, throttled: true });
  await logIn(page);
  await expect(page.locator(".error-line")).toContainText("trimis deja de curând", { timeout: 20_000 });
});
