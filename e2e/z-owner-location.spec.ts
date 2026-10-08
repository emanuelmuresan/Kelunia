// Rulează după celelalte: proprietarul creează o locație fără administrator, pe viață, și primește fereastra de invitație.
import { expect, test } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

test("the owner opens a location without an administrator and can invite one right away", async ({ page }) => {
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-kelunia" });
  const uid = "owner-e2e-uid-0000000000001";

  try {
    await getAuth(app).deleteUser(uid);
  } catch {
    // prima rulare
  }

  await getAuth(app).createUser({ uid, email: "emanuelmuresan@gmail.com", password: "Test123456", emailVerified: true });
  await getFirestore(app).doc(`users/${uid}`).set({
    uid, email: "emanuelmuresan@gmail.com", displayName: "Proprietar", groupName: "", group: "", role: "manager", isOwner: true,
    locationId: "", locationName: "Kelunia", locationSetupRequired: false, accessCodeId: "", usePin: false, lockOnHide: false,
    useBiometrics: false, roomAccess: "all", allowedRoomIds: [], language: "ro",
  });

  await page.goto("/login");
  await page.locator('input[type="email"]').fill("emanuelmuresan@gmail.com");
  await page.locator('input[type="password"]').first().fill("Test123456");
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });

  await page.getByRole("button", { name: "Adaugă locație" }).click();
  const editor = page.locator('[aria-label="Locație"]');
  await editor.getByLabel("Nume locație").fill("Sala Noua E2E");
  await editor.getByLabel("Adresa locației").fill("Strada Exemplu 1, Brașov");
  await editor.getByLabel("Pe viață (fără expirare)").check();
  await editor.getByRole("button", { name: /Adaugă/ }).last().click();

  // Locația există, fără administrator, activă și fără expirare.
  await expect.poll(async () => {
    const snapshot = await getFirestore(app).collection("locations").where("name", "==", "Sala Noua E2E").get();
    const data = snapshot.docs[0]?.data();
    return data ? `${data.billingStatus}:${data.plan}:${data.subscriptionExpiresAt?.toDate().getFullYear()}` : "";
  }).toBe("active:pro:2100");

  // Fereastra codurilor se deschide cu rolul Administrator ales, gata de trimis.
  const codes = page.locator('[aria-label="Coduri de acces"]');
  await expect(codes).toBeVisible();
  await expect(codes.locator("select").nth(1)).toHaveValue("manager");
  await expect(codes.getByPlaceholder(/email/i).first()).toBeVisible();
});
