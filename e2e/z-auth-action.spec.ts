// Pagina /auth/action din linkurile emailurilor: confirmarea adresei de email și alegerea unei parole noi, pe domeniul aplicației.
import { expect, test } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Codul unic dintr-un link generat de Firebase Auth (pe emulator linkul are aceeași formă, cu alt gazdă).
function oobCodeOf(link: string) {
  return new URL(link).searchParams.get("oobCode") ?? "";
}

async function recreateUser(uid: string, email: string, password: string, emailVerified: boolean) {
  const auth = getAuth(getApps()[0] ?? initializeApp({ projectId: "demo-kelunia" }));

  try {
    await auth.deleteUser(uid);
  } catch {
    // prima rulare
  }

  await auth.createUser({ uid, email, password, emailVerified });

  return auth;
}

test("the email confirmation link verifies the address only after the button is pressed", async ({ page }) => {
  const auth = await recreateUser("action-verify-uid-00000001", "confirma.link@e2e.test", "Test123456!", false);
  const code = oobCodeOf(await auth.generateEmailVerificationLink("confirma.link@e2e.test"));

  await page.goto(`/auth/action?mode=verifyEmail&oobCode=${encodeURIComponent(code)}&lang=en`);
  await expect(page.getByRole("button", { name: "Confirm email" })).toBeVisible();

  // Deschiderea paginii nu consumă codul.
  expect((await auth.getUserByEmail("confirma.link@e2e.test")).emailVerified).toBe(false);

  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page.getByText("Your email is confirmed")).toBeVisible();
  expect((await auth.getUserByEmail("confirma.link@e2e.test")).emailVerified).toBe(true);

  // Codul a fost folosit: același link nu mai merge.
  await page.goto(`/auth/action?mode=verifyEmail&oobCode=${encodeURIComponent(code)}&lang=en`);
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page.getByText("no longer valid or was already used")).toBeVisible();
});

test("the password reset link lets the person choose a new password", async ({ page }) => {
  const auth = await recreateUser("action-reset-uid-000000001", "parola.noua@e2e.test", "Veche123456!", true);
  const code = oobCodeOf(await auth.generatePasswordResetLink("parola.noua@e2e.test"));

  await page.goto(`/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(code)}&lang=en`);
  await expect(page.getByText("Choose a new password for parola.noua@e2e.test")).toBeVisible();

  // O parolă slabă este refuzată înainte să se consume codul.
  await page.locator('input[type="password"]').nth(0).fill("slaba");
  await page.locator('input[type="password"]').nth(1).fill("slaba");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.locator(".error-line")).toContainText("does not meet the rules");

  await page.locator('input[type="password"]').nth(0).fill("Noua123456!x");
  await page.locator('input[type="password"]').nth(1).fill("Noua123456!x");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Your password was changed")).toBeVisible();

  // Parola nouă funcționează pe contul real (emulatorul Auth).
  const signIn = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "parola.noua@e2e.test", password: "Noua123456!x", returnSecureToken: true }),
  });
  expect(signIn.status).toBe(200);
});

test("a link without a code or with an unknown mode is rejected", async ({ page }) => {
  await page.goto("/auth/action?lang=en");
  await expect(page.getByText("no longer valid or was already used")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm email" })).toHaveCount(0);
});
