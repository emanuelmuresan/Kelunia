// Named z-* so it runs after the other specs: registering adds users to the seeded location.
import { expect, test, type Page } from "@playwright/test";

// The real login page + the real Firestore rules (emulator): a brand-new, still
// unverified account registers with an invitation code. Regression net for the
// "Missing or insufficient permissions" reports on access-code registration.

async function stubVerificationEmail(page: Page) {
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

    return route.fulfill({ status: 200, headers, contentType: "application/json", body: JSON.stringify({ result: { sent: true } }) });
  });
}

async function register(page: Page, code: string, typedEmail: string) {
  await stubVerificationEmail(page);
  await page.goto(`/login?invite=${code}`);

  const email = page.locator('input[type="email"]');
  await email.fill(typedEmail);
  await page.getByLabel("Nume și prenume").fill("Test Nou");
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill("Parola-Sigura-2026!");
  await passwords.nth(1).fill("Parola-Sigura-2026!");
  await page.locator('form button[type="submit"]').click();
}

for (const [role, code] of [
  ["administrator", "KEL-E2EM-ANGR-0001"],
  ["collaborator", "KEL-E2EB-MEMB-0002"],
  ["guest", "KEL-E2EG-GUES-0003"],
] as const) {
  test(`registering with a ${role} invitation code works`, async ({ page }) => {
    await register(page, code, `nou.${role}@e2e.test`);

    await expect(page.locator(".success-line")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".error-line")).toHaveCount(0);
  });
}

test("an e-mail typed with capitals still registers (it is normalised to lowercase)", async ({ page }) => {
  await register(page, "KEL-E2EG-GUES-0003", "  Capitalizat.Test@E2E.test ");

  await expect(page.locator(".success-line")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".error-line")).toHaveCount(0);
});
