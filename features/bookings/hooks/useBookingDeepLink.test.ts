import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBookingDeepLink } from "./useBookingDeepLink";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join("/") })),
  getDoc: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  LocalNotifications: {
    addListener: vi.fn(() => Promise.resolve({ remove: () => Promise.resolve() })),
  },
}));

vi.mock("@/lib/scheduling", () => ({
  normalizeBooking: vi.fn((id: string, data: Record<string, unknown>) => ({ id, ...data })),
}));

vi.mock("@/lib/soft-delete", () => ({
  isSoftDeleted: vi.fn((data: Record<string, unknown>) => data.deleted === true),
}));

const { getDoc } = await import("firebase/firestore");

type Params = Parameters<typeof useBookingDeepLink>[0];

function renderWith(overrides: Partial<Params> = {}) {
  const setActiveView = vi.fn();
  const setSelectedBooking = vi.fn();
  const setSelectedBookingNotice = vi.fn();

  const params: Params = {
    db: {} as never,
    bookings: [],
    setActiveView,
    setSelectedBooking,
    setSelectedBookingNotice,
    ...overrides,
  };

  renderHook(() => useBookingDeepLink(params));

  return { setActiveView, setSelectedBooking, setSelectedBookingNotice };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/dashboard");
});

afterEach(() => {
  window.history.replaceState({}, "", "/dashboard");
});

describe("useBookingDeepLink", () => {
  it("opens a booking already in the loaded list without a document read", async () => {
    window.history.replaceState({}, "", "/dashboard?booking=b1");
    const booking = { id: "b1", startDate: "2026-02-01" } as never;
    const { setActiveView, setSelectedBooking } = renderWith({ bookings: [booking] });

    await waitFor(() => expect(setSelectedBooking).toHaveBeenCalledWith(booking));
    expect(setActiveView).toHaveBeenCalledWith("calendar");
    expect(getDoc).not.toHaveBeenCalled();
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("falls back to a direct document read when the booking is outside the window", async () => {
    window.history.replaceState({}, "", "/dashboard?booking=b2");
    (getDoc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      exists: () => true,
      id: "b2",
      data: () => ({ startDate: "2026-03-03", deleted: false }),
    });
    const { setActiveView, setSelectedBooking } = renderWith({ bookings: [] });

    await waitFor(() => expect(setSelectedBooking).toHaveBeenCalledWith({ id: "b2", startDate: "2026-03-03", deleted: false }));
    expect(setActiveView).toHaveBeenCalledWith("calendar");
  });

  it("ignores a soft-deleted booking from the fallback read", async () => {
    window.history.replaceState({}, "", "/dashboard?booking=b3");
    (getDoc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      exists: () => true,
      id: "b3",
      data: () => ({ deleted: true }),
    });
    const { setSelectedBooking } = renderWith({ bookings: [] });

    await waitFor(() => expect(getDoc).toHaveBeenCalled());
    expect(setSelectedBooking).not.toHaveBeenCalled();
  });

  it("ignores fixed-schedule ids", async () => {
    window.history.replaceState({}, "", "/dashboard?booking=fixed:s1");
    const { setSelectedBooking } = renderWith({ bookings: [] });

    await new Promise((r) => setTimeout(r, 0));
    expect(getDoc).not.toHaveBeenCalled();
    expect(setSelectedBooking).not.toHaveBeenCalled();
  });
});
