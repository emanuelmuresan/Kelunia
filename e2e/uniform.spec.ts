import { expect, test, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@e2e.test");
  await page.locator('input[type="password"]').first().fill("Test123456");
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Setări/ }).first().click();
}

test("deleting a group is undoable from the toast", async ({ page }) => {
  await loginAsAdmin(page);

  await page
    .locator("article.settings-panel")
    .filter({ has: page.getByRole("heading", { name: "Spații și grupuri" }) })
    .getByRole("button", { name: "Modifică" })
    .click();
  const dialog = page.locator('[aria-labelledby="resources-manager-title"]');
  const row = dialog.locator(".mini-row", { hasText: "Grupa B" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Șterge" }).click();
  await expect(row).toHaveCount(0);

  const toast = page.locator(".toast", { hasText: "Grupul a fost șters" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Anulează" }).click();

  await expect(dialog.locator(".mini-row", { hasText: "Grupa B" })).toBeVisible();
});

test("clicking outside an edited profile asks before discarding", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByRole("button", { name: "Modifică setările" }).click();
  const profile = page.locator('[aria-labelledby="profile-settings-title"]');
  await profile.locator("input").first().fill("Nume nou");

  await page.mouse.click(4, 4);
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toBeVisible();

  await confirm.getByRole("button", { name: "Continuă editarea" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(profile).toBeVisible();

  await profile.getByRole("button", { name: "Renunță" }).click();
  await expect(profile).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("clicking outside an untouched profile just closes it", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByRole("button", { name: "Modifică setările" }).click();
  const profile = page.locator('[aria-labelledby="profile-settings-title"]');
  await expect(profile).toBeVisible();

  await page.mouse.click(4, 4);
  await expect(profile).toHaveCount(0);
});

test("the invitation language can be picked in the codes modal", async ({ page }) => {
  await loginAsAdmin(page);

  await page
    .locator("article.settings-panel")
    .filter({ has: page.getByRole("heading", { name: "Coduri" }) })
    .getByRole("button", { name: "Modifică" })
    .click();

  const dialog = page.locator('[aria-label="Coduri de acces"]');
  const languagePicker = dialog.locator(".invite-language-field select");
  await expect(languagePicker).toHaveValue("ro");

  await languagePicker.selectOption("en");
  await expect(languagePicker).toHaveValue("en");
  await dialog.screenshot({ path: "test-results/invite-language.png" });
});

test("an administrator cannot change their own role", async ({ page }) => {
  await loginAsAdmin(page);

  await page
    .locator("article.settings-panel")
    .filter({ has: page.getByRole("heading", { name: "Utilizatori" }) })
    .getByRole("button", { name: "Modifică" })
    .click();

  const dialog = page.locator('[aria-labelledby="users-manager-title"]');
  const ownRow = dialog.locator(".user-row", { hasText: "admin@e2e.test" });
  await expect(ownRow.getByText("Acesta este contul tău.")).toBeVisible();
  await expect(ownRow.locator("select").first()).toBeDisabled();
  await expect(ownRow.getByRole("button", { name: "Modifică" })).toBeDisabled();
  await expect(ownRow.getByRole("button", { name: "Șterge" })).toBeDisabled();

  // Another user can still be edited.
  await expect(dialog.locator(".user-row", { hasText: "member@e2e.test" }).getByRole("button", { name: "Modifică" })).toBeEnabled();
});

test("the only administrator cannot delete their account", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByRole("button", { name: "Șterge contul" }).click();
  const dialog = page.locator('[aria-labelledby="delete-account-title"]');
  await expect(dialog.getByText("Ești singurul administrator al acestei locații.")).toBeVisible();
  await dialog.getByPlaceholder("admin@e2e.test").fill("admin@e2e.test");
  await expect(dialog.getByRole("button", { name: "Șterge definitiv contul" })).toBeDisabled();
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`the upcoming-events band keeps flowing (motion: ${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      localStorage.setItem("kelunia.upcomingTicker", JSON.stringify({ enabled: true, color: "#1787ff", textColor: "", leadDays: 30 }));
    });
    await loginAsAdmin(page);
    await page.getByRole("button", { name: /Calendar/ }).first().click();

    const track = page.locator(".upcoming-ticker-track");
    await expect(track).toBeVisible();
    const position = () => track.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41);

    const first = await position();
    await page.waitForTimeout(900);
    const second = await position();

    expect(second).toBeLessThan(first);
  });
}

// Runs last: it switches the seeded admin to English.
test("messages follow the chosen language", async ({ page }) => {
  await loginAsAdmin(page);

  await page.getByRole("button", { name: "Modifică setările" }).click();
  const profile = page.locator('[aria-labelledby="profile-settings-title"]');
  await profile.locator("select").first().selectOption({ label: "English" });
  await profile.getByRole("button", { name: "Save" }).click();
  await expect(profile).toHaveCount(0);

  // The new language applies at once: toast in English and the navigation switched.
  await expect(page.locator(".toast", { hasText: "Settings were saved." })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Settings$/ }).first()).toBeVisible();

  await page
    .locator("article.settings-panel", { hasText: "Grupa B" })
    .getByRole("button", { name: "Edit" })
    .click();
  const dialog = page.locator('[aria-labelledby="resources-manager-title"]');
  await dialog.locator(".mini-row", { hasText: "Grupa B" }).getByRole("button", { name: "Delete" }).click();

  const toast = page.locator(".toast", { hasText: "The group was deleted" });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole("button", { name: "Undo" })).toBeVisible();
});
