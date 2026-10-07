// Ajutoare comune pentru testele e2e: deschiderea unei secțiuni din Setări și găsirea unui bloc după titlu.
import type { Page } from "@playwright/test";

// Settings now shows four compact cards (Profil, Configurare, Acces, Suport); a
// card's Deschide opens the section, whose blocks each carry their own Modifică.
export async function openSettingsSection(page: Page, title: string) {
  await page
    .locator("article.settings-section-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .getByRole("button", { name: /^(Deschide|Open)$/ })
    .click();

  return page.getByRole("dialog", { name: title, exact: true });
}

/** The block of an opened section by its heading, e.g. blockOf(section, "Pagini"). */
export function blockOf(section: ReturnType<Page["locator"]>, heading: string) {
  return section.locator(".settings-block").filter({ has: section.page().getByRole("heading", { name: heading, exact: true }) });
}
