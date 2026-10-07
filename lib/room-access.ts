// Accesul pe camere: un utilizator poate vedea toate camerele sau doar o listă aleasă de manager (roomAccess + allowedRoomIds).
// Managerii și proprietarul văd mereu tot.
import type { Booking, RoomAccessMode, RoomItem } from "@/lib/types/domain";

// Câmpurile din profil/codul de acces care descriu accesul.
export type RoomAccessProfile = {
  roomAccess?: RoomAccessMode | string;
  allowedRoomIds?: unknown;
};

// Orice valoare diferită de „selected” înseamnă acces la toate camerele.
export function normalizeRoomAccessMode(value: unknown): RoomAccessMode {
  return value === "selected" ? "selected" : "all";
}

// Lista de id-uri de camere: fără goluri și fără dubluri.
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

// Accesul efectiv: „selected” fără nicio cameră se tratează ca acces la toate.
export function normalizeRoomAccess(profile: RoomAccessProfile | null | undefined) {
  const roomAccess = normalizeRoomAccessMode(profile?.roomAccess);
  const allowedRoomIds = normalizeAllowedRoomIds(profile?.allowedRoomIds);

  if (roomAccess === "selected" && allowedRoomIds.length > 0) {
    return { roomAccess, allowedRoomIds };
  }

  return { roomAccess: "all" as const, allowedRoomIds: [] };
}

// Camerele pe care utilizatorul are voie să le vadă.
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

// Textul scurt care descrie accesul (ex. „Sala 1, Sala 2 +1”).
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

// O rezervare este vizibilă dacă țintește o cameră permisă (după id sau, la rezervările vechi, după nume).
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
