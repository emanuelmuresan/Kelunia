import { describe, expect, it } from "vitest";

import { buildAccessInviteShareText } from "@/lib/access-codes";
import { supportedLocales } from "@/lib/i18n/app-copy-catalog";

const item = {
  code: "KEL-ABCD-EFGH-JKLM",
  role: "member" as const,
  groupName: "Grupa 1",
  locationName: "Sala Mare",
  expiresAt: { toDate: () => new Date("2026-12-31T12:00:00Z") },
};
const link = "https://www.kelunia.com/login?invite=KEL-ABCD-EFGH-JKLM";

describe("buildAccessInviteShareText", () => {
  it.each(supportedLocales.map((locale) => locale.code))("is complete and fully translated in %s", (language) => {
    const text = buildAccessInviteShareText(item, link, undefined, language);

    expect(text).toContain(item.code);
    expect(text).toContain(link);
    expect(text).toContain("Sala Mare");
    expect(text).toContain("Grupa 1");
    expect(text).toContain("2026");
    expect(text).not.toContain("{{");
    expect(text.split("\n").filter((line) => /^[1-4]\. /.test(line))).toHaveLength(4);
  });

  it("differs between languages", () => {
    const ro = buildAccessInviteShareText(item, link, undefined, "ro");
    const en = buildAccessInviteShareText(item, link, undefined, "en");

    expect(ro).toContain("Cod acces");
    expect(en).toContain("Access code");
    expect(en).not.toContain("Cod acces");
  });

  it("keeps a custom message and omits the expiry line when the code never expires", () => {
    const text = buildAccessInviteShareText({ ...item, expiresAt: undefined }, link, "Salut!", "fr");

    expect(text.startsWith("Salut!")).toBe(true);
    expect(text).not.toContain("expire le");
  });

  it("leaves out the group for administrators", () => {
    const text = buildAccessInviteShareText({ ...item, role: "manager" }, link, undefined, "en");

    expect(text).not.toContain("Group:");
  });
});
