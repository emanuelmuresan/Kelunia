import { describe, expect, it } from "vitest";

import { passwordSecurityError } from "@/lib/security/password";

describe("passwordSecurityError", () => {
  it("rejects short passwords", () => {
    expect(passwordSecurityError("Ab1")).not.toBe("");
    expect(passwordSecurityError("12346")).not.toBe("");
  });

  it("requires lower case, upper case, a digit and a special character", () => {
    expect(passwordSecurityError("abcdefg1!")).not.toBe("");
    expect(passwordSecurityError("ABCDEFG1!")).not.toBe("");
    expect(passwordSecurityError("Abcdefgh!")).not.toBe("");
    expect(passwordSecurityError("Abcdefg12")).not.toBe("");
    expect(passwordSecurityError("Abcdefg1!")).toBe("");
  });

  it("rejects a password that contains the main part of the email", () => {
    expect(passwordSecurityError("Emanuel2026!x", "emanuel@example.com")).not.toBe("");
  });
});
