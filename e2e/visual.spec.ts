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

test("capture notification settings in the profile modal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(USER.email);
  await page.locator('input[type="password"]').first().fill(USER.password);
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });

  await page.getByRole("button", { name: /Setări/ }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/settings-mobile.png", fullPage: true });

  await page.getByRole("button", { name: "Modifică" }).first().click();
  await page.locator('[aria-labelledby="profile-settings-title"]').waitFor();
  await page.getByLabel("Primesc remindere pentru programările grupului meu").check();
  await page.waitForTimeout(300);
  await page.locator('[aria-labelledby="profile-settings-title"]').evaluate((node) => { node.scrollTop = node.scrollHeight; });
  await page.waitForTimeout(200);
  await page.locator('[aria-labelledby="profile-settings-title"]').screenshot({ path: "test-results/notification-settings.png" });
});

test("capture ticker settings editing + empty-state band", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("kelunia.upcomingTicker", JSON.stringify({ enabled: true, color: "#1787ff", leadDays: 1 }));
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
  await page.screenshot({ path: "test-results/ticker-band.png" });

  await page.getByRole("button", { name: /Setări/ }).first().click();
  await page.waitForTimeout(500);
  const tickerCard = page.locator("article.settings-panel", { hasText: "Bandă evenimente viitoare" });
  await tickerCard.getByRole("button", { name: "Modifică" }).click();
  const modal = page.locator('[aria-labelledby="ticker-settings-title"]');
  const days = modal.locator('input[inputmode="numeric"]');
  await days.fill("");
  await days.pressSequentially("014");
  await modal.screenshot({ path: "test-results/ticker-settings.png" });
  if ((await days.inputValue()) !== "14") {
    throw new Error(`days field shows "${await days.inputValue()}" instead of 14`);
  }
});

test("capture admin settings: pages summary + modal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@e2e.test");
  await page.locator('input[type="password"]').first().fill("Test123456");
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Setări/ }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/admin-settings.png", fullPage: true });

  const pagesCard = page.locator("article.settings-panel", { hasText: "Navigare" });
  await pagesCard.getByRole("button", { name: "Modifică" }).click();
  await page.locator('[aria-labelledby="pages-settings-title"]').screenshot({ path: "test-results/pages-modal.png" });
});

test("capture unified row actions + toast", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@e2e.test");
  await page.locator('input[type="password"]').first().fill("Test123456");
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Setări/ }).first().click();

  await page
    .locator("article.settings-panel")
    .filter({ has: page.getByRole("heading", { name: "Spații și grupuri" }) })
    .getByRole("button", { name: "Modifică" })
    .click();
  await page.locator('[aria-labelledby="resources-manager-title"]').screenshot({ path: "test-results/resources-rows.png" });
  await page.locator('[aria-labelledby="resources-manager-title"]').getByRole("button", { name: "Gata" }).click();

  const ticker = page.locator("article.settings-panel", { hasText: "Bandă evenimente viitoare" });
  await ticker.getByRole("button", { name: "Modifică" }).click();
  await page.locator('[aria-labelledby="ticker-settings-title"]').getByLabel("Afișează banda sus (doar pe acest dispozitiv)").check();
  await page.locator('[aria-labelledby="ticker-settings-title"]').getByRole("button", { name: "Salvează" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/toast-after-save.png" });
});

test("capture ticker colors", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, color] of [["blue", "#1787ff"], ["white", "#ffffff"], ["dark", "#16172b"]]) {
    await page.addInitScript(([c]) => {
      try {
        localStorage.setItem("kelunia.upcomingTicker", JSON.stringify({ enabled: true, color: c, textColor: "", leadDays: 7 }));
      } catch {
        /* ignore */
      }
    }, [color]);
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').first().fill(USER.password);
    await page.locator('form button[type="submit"]').click();
    await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.locator(".upcoming-ticker").screenshot({ path: `test-results/ticker-${name}.png` });
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
    await page.goto("/login");
  }
});

test("capture inline colour picker", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(USER.email);
  await page.locator('input[type="password"]').first().fill(USER.password);
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Setări/ }).first().click();
  await page.locator("article.settings-panel", { hasText: "Bandă evenimente viitoare" }).getByRole("button", { name: "Modifică" }).click();
  const modal = page.locator('[aria-labelledby="ticker-settings-title"]');
  await modal.getByLabel("Afișează banda sus (doar pe acest dispozitiv)").check();
  await modal.getByLabel("Automată (alb pe culori închise, negru pe culori deschise)").uncheck();
  await modal.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  await modal.screenshot({ path: "test-results/color-picker.png" });
});

test("capture profile card, opened view and standalone report row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@e2e.test");
  await page.locator('input[type="password"]').first().fill("Test123456");
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Setări/ }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/settings-top.png" });
  await page.locator(".report-problem-panel").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/settings-bottom.png" });

  await page.locator("article.settings-panel").filter({ has: page.getByRole("heading", { name: "Setări personale" }) }).getByRole("button", { name: "Deschide" }).click();
  const view = page.locator('[aria-labelledby="profile-view-title"]');
  await view.waitFor();
  await view.screenshot({ path: "test-results/profile-view.png" });
});

test("capture the four settings cards and opened sections", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@e2e.test");
  await page.locator('input[type="password"]').first().fill("Test123456");
  await page.locator('form button[type="submit"]').click();
  await page.locator("main.kelunia-shell").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Setări/ }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/settings-cards.png" });

  for (const [title, file] of [["Configurare", "section-config"], ["Acces", "section-access"], ["Suport", "section-support"]]) {
    await page.locator("article.settings-section-card").filter({ has: page.getByRole("heading", { name: title, exact: true }) }).getByRole("button", { name: "Deschide" }).click();
    const section = page.getByRole("dialog", { name: title, exact: true });
    await section.waitFor();
    await section.screenshot({ path: `test-results/${file}.png` });
    await section.getByRole("button", { name: "Gata" }).click();
  }
});
