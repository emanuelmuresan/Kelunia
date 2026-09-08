import { test } from "@playwright/test";

const USER = { email: "member@e2e.test", password: "Test123456" };

// Not assertions — captures screenshots into test-results/ for manual review of
// layout-heavy changes (mobile calendar, FAB, modals). Skipped unless VISUAL=1
// so it doesn't slow CI; run locally with `VISUAL=1 npm run test:e2e`.
test.skip(!process.env.VISUAL, "set VISUAL=1 to capture screenshots");

test("capture mobile calendar + FAB + notify-now", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    try {
      if (!localStorage.getItem("kelunia.upcomingTicker")) {
        localStorage.setItem(
          "kelunia.upcomingTicker",
          JSON.stringify({ enabled: true, color: "#8b5cf6", leadDays: 7 })
        );
      }
    } catch {
      /* ignore */
    }
  });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(USER.email);
  await page.locator('input[type="password"]').first().fill(USER.password);
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "test-results/calendar-mobile.png" });

  // and without the ticker
  await page.evaluate(() => {
    try {
      localStorage.setItem("kelunia.upcomingTicker", JSON.stringify({ enabled: false, color: "#1787ff", leadDays: 7 }));
    } catch {
      /* ignore */
    }
  });
  await page.reload();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/calendar-no-ticker.png" });

  await page.getByRole("button", { name: "An", exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/year-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Lună", exact: true }).click();
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: /Rezervare nouă/ }).click();
  await page.locator('.modal-card[role="dialog"]').waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/booking-modal-mobile.png" });

  // fill enough to enable "Notifica acum", then open the audience confirm
  await page.locator('select').first().selectOption({ index: 1 }).catch(() => {});
  await page.waitForTimeout(200);
  const notify = page.getByRole("button", { name: /Notific/i }).first();
  if (await notify.isVisible().catch(() => false)) {
    await notify.click().catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/notify-now-mobile.png" });
  }
});
