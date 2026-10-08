// Roata de culori din setările benzii: un clic pe roată, tragerea și glisorul de luminozitate schimbă codul culorii.
import { expect, test } from "@playwright/test";

import { blockOf, openSettingsSection } from "./helpers";

test("the colour wheel and the brightness slider change the colour", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@e2e.test");
  await page.locator('input[type="password"]').first().fill("Test123456");
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Setări/ }).first().click();

  const configuration = await openSettingsSection(page, "Configurare");
  await blockOf(configuration, "Bandă evenimente viitoare").getByRole("button", { name: "Modifică" }).click();
  const modal = page.locator('[aria-labelledby="ticker-settings-title"]');
  await modal.getByLabel("Afișează banda sus (doar pe acest dispozitiv)").check();

  const wheel = modal.locator(".color-picker-wheel").first();
  await wheel.scrollIntoViewIfNeeded();
  const box = (await wheel.boundingBox())!;
  const hex = modal.locator(".color-picker-hex input").first();
  const initial = await hex.inputValue();

  // Un clic în dreapta, la jumătatea razei: nuanță verde-gălbuie, saturație medie.
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.5);
  await expect(hex).toHaveValue("#bfff80");
  expect(initial).not.toBe("#bfff80");

  // Tragerea mută culoarea în altă parte a roții.
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.8, { steps: 6 });
  await page.mouse.up();
  await expect(hex).not.toHaveValue("#bfff80");

  // Luminozitatea la 50% întunecă culoarea.
  const dragged = await hex.inputValue();
  await modal.locator(".color-picker-brightness input").first().fill("50");
  await expect(hex).not.toHaveValue(dragged);
  await expect(hex).toHaveValue(/^#[0-9a-f]{6}$/);
});
