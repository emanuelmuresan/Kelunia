import { describe, expect, it } from "vitest";

import { isLifetimeDate, lifetimeExpiryDate, locationLicenseAccess } from "@/lib/licensing";
import type { LocationItem } from "@/lib/types/domain";

const baseLocation: LocationItem = { id: "loc", name: "L", ownerEmail: "o@x.com", address: "", placeId: "" };

describe("lifetime licenses", () => {
  it("treats 2099 or later as lifetime", () => {
    expect(isLifetimeDate(lifetimeExpiryDate())).toBe(true);
    expect(isLifetimeDate(new Date("2030-01-01T12:00:00"))).toBe(false);
    expect(isLifetimeDate(null)).toBe(false);
  });

  it("a lifetime location can always write and reports no remaining days", () => {
    const access = locationLicenseAccess({
      ...baseLocation,
      plan: "pro",
      billingStatus: "active",
      subscriptionExpiresAt: lifetimeExpiryDate(),
    });

    expect(access.canWrite).toBe(true);
    expect(access.isLifetime).toBe(true);
    expect(access.daysRemaining).toBeNull();
  });

  it("an expired subscription is not lifetime and cannot write", () => {
    const access = locationLicenseAccess({
      ...baseLocation,
      plan: "pro",
      billingStatus: "active",
      subscriptionExpiresAt: new Date("2020-01-01T12:00:00"),
    });

    expect(access.isLifetime).toBe(false);
    expect(access.canWrite).toBe(false);
  });
});
