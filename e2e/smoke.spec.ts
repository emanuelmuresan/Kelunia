import { expect, test } from "@playwright/test";

const USER = { email: "member@e2e.test", password: "Test123456" };

test.describe("dashboard smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').first().fill(USER.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator("main.kelunia-shell")).toBeVisible({ timeout: 30_000 });
  });

  test("signs in and lands on the calendar", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("button", { name: /Rezervare nouă/ })).toBeVisible();
  });

  test("navigates between the main views", async ({ page }) => {
    await page.getByRole("button", { name: "Setări", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Setări personale" })).toBeVisible();

    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(page.getByRole("button", { name: /Rezervare nouă/ })).toBeVisible();

    await page.getByRole("button", { name: /program(ă|a)ri/i }).first().click();
    await expect(page.locator("main.kelunia-shell")).toBeVisible();
  });

  test("opens and closes the new-booking modal", async ({ page }) => {
    await page.getByRole("button", { name: /Rezervare nouă/ }).click();

    // scoped to the app modal — a stray dev-overlay dialog must not match
    const dialog = page.locator('.modal-card[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Adaugă programare" })).toBeVisible();

    await dialog.getByRole("button", { name: "Închide" }).click();
    await expect(dialog).toBeHidden();
  });
});
