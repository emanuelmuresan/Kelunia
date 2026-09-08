import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRequiredGroupSetup } from "./useRequiredGroupSetup";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join("/") })),
  setDoc: vi.fn(() => Promise.resolve()),
}));

const { setDoc } = await import("firebase/firestore");

type Overrides = Partial<Parameters<typeof useRequiredGroupSetup>[0]>;

function setup(overrides: Overrides = {}) {
  const setGroupSetupError = vi.fn();
  const setPersonalDraft = vi.fn();
  const recordAuditLog = vi.fn(() => Promise.resolve());
  const requireOnline = vi.fn(() => true);

  const params = {
    db: {} as never,
    user: { uid: "u1", email: "u1@example.com" } as never,
    profile: {
      displayName: "Ana",
      groupName: "",
      locationId: "loc1",
      locationName: "Sala Centrala",
      roomAccess: "all",
      allowedRoomIds: [],
    } as never,
    role: "member" as const,
    isSuperAdmin: false,
    groups: [{ id: "g1", name: "Grup A" }] as never,
    currentLocationId: "loc1",
    locationName: "Sala Centrala",
    requireOnline,
    recordAuditLog,
    setPersonalDraft,
    setGroupSetupError,
    ...overrides,
  };

  const view = renderHook((props: typeof params) => useRequiredGroupSetup(props), {
    initialProps: params,
  });

  return {
    view,
    setGroupSetupError,
    setPersonalDraft,
    recordAuditLog,
    requireOnline: params.requireOnline,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRequiredGroupSetup", () => {
  it("rejects an empty group draft without writing", async () => {
    const { view, setGroupSetupError } = setup();

    await act(async () => {
      await view.result.current.saveRequiredGroup();
    });

    expect(setGroupSetupError).toHaveBeenCalledWith("Alege grupul din care faci parte.");
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("rejects a group that does not exist in the location", async () => {
    const { view, setGroupSetupError } = setup();

    act(() => {
      view.result.current.setGroupSetupDraft("Grup Inexistent");
    });
    await act(async () => {
      await view.result.current.saveRequiredGroup();
    });

    expect(setGroupSetupError).toHaveBeenCalledWith("Alege un grup existent în locația ta.");
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("bails out when offline", async () => {
    const { view, requireOnline } = setup({ requireOnline: vi.fn(() => false) });

    act(() => {
      view.result.current.setGroupSetupDraft("Grup A");
    });
    await act(async () => {
      await view.result.current.saveRequiredGroup();
    });

    expect(requireOnline).toHaveBeenCalledWith("group");
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("writes the chosen group, records an audit log and marks setup complete", async () => {
    const { view, setPersonalDraft, recordAuditLog } = setup();

    act(() => {
      view.result.current.setGroupSetupDraft("Grup A");
    });
    await act(async () => {
      await view.result.current.saveRequiredGroup();
    });

    expect(setDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = (setDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(payload).toMatchObject({
      groupName: "Grup A",
      role: "member",
      locationId: "loc1",
      roomAccess: "all",
      allowedRoomIds: [],
    });
    expect(options).toEqual({ merge: true });

    expect(recordAuditLog).toHaveBeenCalledWith(
      "user",
      "update",
      "u1",
      expect.anything(),
      { groupName: "Grup A", group: "Grup A" },
      "loc1",
      "Sala Centrala"
    );

    const updater = setPersonalDraft.mock.calls[0][0] as (draft: { groupName: string }) => { groupName: string };
    expect(updater({ groupName: "" }).groupName).toBe("Grup A");

    expect(view.result.current.mustChooseGroup).toBe(false);
  });

  it("derives mustChooseGroup from role and profile group", () => {
    const superAdmin = setup({ isSuperAdmin: true });
    expect(superAdmin.view.result.current.mustChooseGroup).toBe(false);

    const withGroup = setup({
      profile: {
        displayName: "Ana",
        groupName: "Grup A",
        locationId: "loc1",
        locationName: "Sala Centrala",
        roomAccess: "all",
        allowedRoomIds: [],
      } as never,
    });
    expect(withGroup.view.result.current.mustChooseGroup).toBe(false);

    const needsGroup = setup();
    expect(needsGroup.view.result.current.mustChooseGroup).toBe(true);
  });
});
