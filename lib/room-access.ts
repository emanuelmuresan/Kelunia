import type { Booking, RoomAccessMode, RoomItem } from "@/lib/types/domain";

export type RoomAccessProfile = {
  roomAccess?: RoomAccessMode | string;
  allowedRoomIds?: unknown;
};

export function normalizeRoomAccessMode(value: unknown): RoomAccessMode {
  return value === "selected" ? "selected" : "all";
}

export function normalizeAllowedRoomIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

export function normalizeRoomAccess(profile: RoomAccessProfile | null | undefined) {
  const roomAccess = normalizeRoomAccessMode(profile?.roomAccess);
  const allowedRoomIds = normalizeAllowedRoomIds(profile?.allowedRoomIds);

  if (roomAccess === "selected" && allowedRoomIds.length > 0) {
    return { roomAccess, allowedRoomIds };
  }

  return { roomAccess: "all" as const, allowedRoomIds: [] };
}

export function filterRoomsByAccess(
  rooms: RoomItem[],
  profile: RoomAccessProfile | null | undefined,
  hasFullAccess: boolean
) {
  if (hasFullAccess) {
    return rooms;
  }

  const access = normalizeRoomAccess(profile);

  if (access.roomAccess === "all") {
    return rooms;
  }

  const allowed = new Set(access.allowedRoomIds);
  return rooms.filter((room) => allowed.has(room.id));
}

export function roomAccessLabel(profile: RoomAccessProfile | null | undefined, rooms: RoomItem[]) {
  const access = normalizeRoomAccess(profile);

  if (access.roomAccess === "all") {
    return "toate sălile";
  }

  const allowed = new Set(access.allowedRoomIds);
  const names = rooms.filter((room) => allowed.has(room.id)).map((room) => room.name);

  if (names.length === 0) {
    return "nicio sală";
  }

  if (names.length <= 2) {
    return names.join(", ");
  }

  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export function bookingMatchesRoomAccess(
  booking: Booking,
  rooms: RoomItem[],
  profile: RoomAccessProfile | null | undefined,
  hasFullAccess: boolean
) {
  if (hasFullAccess) {
    return true;
  }

  const access = normalizeRoomAccess(profile);

  if (access.roomAccess === "all") {
    return true;
  }

  const allowed = new Set(access.allowedRoomIds);

  if (booking.roomId && allowed.has(booking.roomId)) {
    return true;
  }

  const matchedRoom = rooms.find((room) => room.name === booking.room);
  return Boolean(matchedRoom && allowed.has(matchedRoom.id));
}
