import { describe, expect, it } from "vitest";

import { passwordSecurityError } from "@/lib/security/password";

describe("passwordSecurityError", () => {
  it("rejects short passwords", () => {
    expect(passwordSecurityError("Ab1")).not.toBe("");
    expect(passwordSecurityError("12346")).not.toBe("");
  });

  it("requires a lower case letter, an upper case letter and a digit", () => {
    expect(passwordSecurityError("abcdefg1")).not.toBe("");
    expect(passwordSecurityError("ABCDEFG1")).not.toBe("");
    expect(passwordSecurityError("Abcdefgh")).not.toBe("");
    expect(passwordSecurityError("Abcdefg1")).toBe("");
  });

  it("rejects a password that contains the main part of the email", () => {
    expect(passwordSecurityError("Emanuel2026x", "emanuel@example.com")).not.toBe("");
  });
});
