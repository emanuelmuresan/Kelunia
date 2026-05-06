"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth, UserRole } from "@/context/AuthContext";

type AppView = "calendar" | "list" | "settings";
type CalendarMode = "month" | "week" | "day";
type ListFilter = "future" | "past" | "all";
type SortDirection = "asc" | "desc";
type SpaceKind = "room" | "group";
type PinIntent = "pin" | "biometrics";

interface LocationItem {
  id: string;
  name: string;
  ownerEmail: string;
}

interface SpaceEditor {
  kind: SpaceKind;
  id: string | null;
  name: string;
}

interface LocationEditor {
  id: string | null;
  name: string;
}

interface Booking {
  id: string;
  group: string;
  room: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  authorEmail: string;
  authorName: string;
  updatedBy?: string;
  createdAt?: unknown;
}

interface BookingForm {
  group: string;
  room: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface RoomItem {
  id: string;
  name: string;
}

interface GroupItem {
  id: string;
  name: string;
}

interface FixedSchedule {
  id: string;
  dayIndex: number;
  group: string;
  room: string;
  startTime: string;
  endTime: string;
  title: string;
}

interface FixedScheduleDraft {
  dayIndex: number | "";
  group: string;
  room: string;
  startTime: string;
  endTime: string;
  title: string;
}

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  groupName: string;
  role: UserRole;
  isOwner: boolean;
  locationId: string;
  locationName: string;
}

interface LocationCode {
  id: string;
  code: string;
  role: UserRole;
  locationId: string;
  locationName: string;
}

interface AuthCodesState {
  adminCode: string;
  viewerCode: string;
  userCode: string;
  superadminCode: string;
  locationCodes: LocationCode[];
}

const dayLabels = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const shortDayLabels = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const defaultLocationName = "Sala Regatului Iuliu Maniu 13";
const defaultFixedSectionTitle = "Întruniri săptămânale";

const defaultRooms: RoomItem[] = [];
const defaultGroups: GroupItem[] = [];
const defaultFixedSchedules: FixedSchedule[] = [];
const demoBookings: Booking[] = [];

const emptyForm: BookingForm = {
  group: "",
  room: "",
  startDate: "",
  endDate: "",
  startTime: "18:00",
  endTime: "20:00",
  reason: "",
};

const emptyFixedDraft: FixedScheduleDraft = {
  dayIndex: "",
  group: "",
  room: "",
  startTime: "",
  endTime: "",
  title: "",
};

const emptyAuthCodes: AuthCodesState = {
  adminCode: "",
  viewerCode: "",
  userCode: "",
  superadminCode: "",
  locationCodes: [],
};

const roleLabels: Record<UserRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  viewer: "User",
  user: "User",
};

function dateKey(date: Date) {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

function parseDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

function addDays(date: Date, count: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + count);
  return copy;
}

function getWeekStart(date: Date) {
  const copy = new Date(date);
  const dayIndex = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - dayIndex);
  return copy;
}

function formatDateLabel(key: string, options: Intl.DateTimeFormatOptions = {}) {
  return parseDateKey(key).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    ...options,
  });
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

function dateRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && startB <= endA;
}

function datesInRange(start: string, end: string) {
  const days: string[] = [];
  let cursor = parseDateKey(start);
  const last = parseDateKey(end || start);

  while (cursor <= last) {
    days.push(dateKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
}

function weekdayIndexFromKey(key: string) {
  return (parseDateKey(key).getDay() + 6) % 7;
}

function normalizeRole(role: unknown): UserRole {
  if (role === "superadmin" || role === "admin" || role === "viewer" || role === "user") {
    return role;
  }

  return "viewer";
}

function appRoleLabel(profile: { isOwner?: boolean } | null | undefined, currentRole: UserRole) {
  return profile?.isOwner ? "Owner" : roleLabels[currentRole];
}

function normalizeLocationCodes(value: unknown): LocationCode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      id: String(record.id ?? `code-${index}`),
      code: String(record.code ?? ""),
      role: normalizeRole(record.role),
      locationId: String(record.locationId ?? "main-location"),
      locationName: String(record.locationName ?? defaultLocationName),
    };
  });
}

function normalizeBooking(id: string, data: Record<string, unknown>): Booking {
  const legacyTime = String(data.orar ?? "08:00 - 10:00").split(" - ");
  const startDate = String(data.startDate ?? data.date ?? dateKey(new Date()));
  const endDate = String(data.endDate ?? startDate);

  return {
    id,
    group: String(data.group ?? data.congregatie ?? ""),
    room: String(data.room ?? data.location ?? ""),
    startDate,
    endDate,
    startTime: String(data.startTime ?? legacyTime[0] ?? "08:00"),
    endTime: String(data.endTime ?? legacyTime[1] ?? "10:00"),
    reason: String(data.reason ?? data.motiv ?? ""),
    authorEmail: String(data.authorEmail ?? data.author ?? ""),
    authorName: String(data.authorName ?? data.author ?? "Utilizator"),
    updatedBy: data.updatedBy ? String(data.updatedBy) : undefined,
    createdAt: data.createdAt,
  };
}

function bookingsForDay(bookings: Booking[], key: string) {
  return bookings
    .filter((booking) => key >= booking.startDate && key <= booking.endDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function fixedForDay(schedules: FixedSchedule[], dayIndex: number) {
  return schedules
    .filter((schedule) => schedule.dayIndex === dayIndex)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

async function hashPin(uid: string, pin: string) {
  const bytes = new TextEncoder().encode(`${uid}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function KeluniaPage() {
  const { user, profile, role, isAdmin, isSuperAdmin, isOwner } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>(demoBookings);
  const [rooms, setRooms] = useState<RoomItem[]>(defaultRooms);
  const [groups, setGroups] = useState<GroupItem[]>(defaultGroups);
  const [fixedSchedules, setFixedSchedules] = useState<FixedSchedule[]>(defaultFixedSchedules);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [authCodes, setAuthCodes] = useState<AuthCodesState>(emptyAuthCodes);

  const [activeView, setActiveView] = useState<AppView>("calendar");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeLocationId, setActiveLocationId] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("future");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const [showCodesModal, setShowCodesModal] = useState(false);
  const [codesDraft, setCodesDraft] = useState<AuthCodesState>(emptyAuthCodes);
  const [codesConfirming, setCodesConfirming] = useState(false);
  const [codesError, setCodesError] = useState("");
  const [newLocationCode, setNewLocationCode] = useState({
    code: "",
    role: "viewer" as UserRole,
    locationId: "",
  });
  const [locationEditor, setLocationEditor] = useState<LocationEditor | null>(null);
  const [locationError, setLocationError] = useState("");
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [personalDraft, setPersonalDraft] = useState({
    displayName: "",
    groupName: "",
    usePin: false,
    lockOnHide: false,
    useBiometrics: false,
  });
  const [groupSetupDraft, setGroupSetupDraft] = useState("");
  const [groupSetupError, setGroupSetupError] = useState("");
  const [groupSetupCompleted, setGroupSetupCompleted] = useState(false);
  const [spaceEditor, setSpaceEditor] = useState<SpaceEditor | null>(null);
  const [spaceError, setSpaceError] = useState("");
  const [fixedSectionTitle, setFixedSectionTitle] = useState(defaultFixedSectionTitle);
  const [fixedSectionDraft, setFixedSectionDraft] = useState(defaultFixedSectionTitle);
  const [showFixedManager, setShowFixedManager] = useState(false);
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [fixedEditingId, setFixedEditingId] = useState<string | null>(null);
  const [fixedDraft, setFixedDraft] = useState<FixedScheduleDraft>(emptyFixedDraft);
  const [fixedError, setFixedError] = useState("");
  const [pinIntent, setPinIntent] = useState<PinIntent | null>(null);
  const [pinDraft, setPinDraft] = useState({ pin: "", confirm: "" });
  const [pinError, setPinError] = useState("");
  const [pendingPinHash, setPendingPinHash] = useState<string | null>(null);

  const today = dateKey(new Date());
  const fallbackLocationId = profile?.locationId || "main-location";
  const currentLocationId = isOwner ? activeLocationId || fallbackLocationId : fallbackLocationId;
  const currentLocation = locations.find((location) => location.id === currentLocationId);
  const locationName = currentLocation?.name || profile?.locationName || defaultLocationName;
  const canManageBookings = Boolean(user && isAdmin);
  const mustChooseGroup = Boolean(user && profile && !isSuperAdmin && !profile.groupName.trim() && !groupSetupCompleted);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setActiveLocationId((current) => current || profile.locationId || "main-location");
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setLocations([]);
      return;
    }

    if (!isOwner) {
      return onSnapshot(
        doc(db, "locations", currentLocationId),
        (snapshot) => {
          if (!snapshot.exists() && profile) {
            setLocations([{ id: profile.locationId, name: profile.locationName || defaultLocationName, ownerEmail: profile.email }]);
            return;
          }

          const data = snapshot.data() ?? {};
          setLocations([
            {
              id: snapshot.id,
              name: String(data.name ?? data.locationName ?? profile?.locationName ?? defaultLocationName),
              ownerEmail: String(data.ownerEmail ?? ""),
            },
          ]);
        },
        (error) => {
          console.warn("Locația nu a putut fi citită:", error);
          setLocations(profile ? [{ id: profile.locationId, name: profile.locationName || defaultLocationName, ownerEmail: profile.email }] : []);
        }
      );
    }

    return onSnapshot(
      query(collection(db, "locations"), orderBy("name", "asc")),
      (snapshot) => {
        const normalized = snapshot.docs.map((item) => ({
          id: item.id,
          name: String(item.data().name ?? item.data().locationName ?? defaultLocationName),
          ownerEmail: String(item.data().ownerEmail ?? ""),
        }));

        if (normalized.length === 0 && profile) {
          setLocations([{ id: profile.locationId, name: profile.locationName || defaultLocationName, ownerEmail: profile.email }]);
          return;
        }

        setLocations(normalized);
      },
      (error) => {
        console.warn("Locațiile nu au putut fi citite:", error);
        setLocations(profile ? [{ id: profile.locationId, name: profile.locationName || defaultLocationName, ownerEmail: profile.email }] : []);
      }
    );
  }, [currentLocationId, isOwner, profile, user]);

  useEffect(() => {
    if (!user) {
      setBookings(demoBookings);
      return;
    }

    const bookingsQuery = query(collection(db, "events"), where("locationId", "==", currentLocationId));
    return onSnapshot(
      bookingsQuery,
      (snapshot) => {
        setBookings(snapshot.docs.map((item) => normalizeBooking(item.id, item.data())).sort((a, b) => a.startDate.localeCompare(b.startDate)));
      },
      (error) => {
        console.error("Programările nu au putut fi citite:", error);
        setBookings([]);
      }
    );
  }, [currentLocationId, user]);

  useEffect(() => {
    if (!user) {
      setRooms(defaultRooms);
      setGroups(defaultGroups);
      setFixedSchedules(defaultFixedSchedules);
      return;
    }

    const unsubRooms = onSnapshot(
      query(collection(db, "rooms"), where("locationId", "==", currentLocationId)),
      (snapshot) => {
        setRooms(snapshot.docs.map((item) => ({ id: item.id, name: String(item.data().name ?? "") })));
      },
      (error) => {
        console.warn("Sălile nu au putut fi citite:", error);
        setRooms(defaultRooms);
      }
    );
    const unsubGroups = onSnapshot(
      query(collection(db, "groups"), where("locationId", "==", currentLocationId)),
      (snapshot) => {
        setGroups(snapshot.docs.map((item) => ({ id: item.id, name: String(item.data().name ?? "") })));
      },
      (error) => {
        console.warn("Grupurile nu au putut fi citite:", error);
        setGroups(defaultGroups);
      }
    );
    const unsubFixed = onSnapshot(
      query(collection(db, "fixedSchedules"), where("locationId", "==", currentLocationId)),
      (snapshot) => {
        setFixedSchedules(
          snapshot.docs.map((item) => {
            const data = item.data();
            return {
              id: item.id,
              dayIndex: Number(data.dayIndex ?? 0),
              group: String(data.group ?? ""),
              room: String(data.room ?? ""),
              startTime: String(data.startTime ?? ""),
              endTime: String(data.endTime ?? ""),
              title: String(data.title ?? ""),
            };
          })
        );
      },
      (error) => {
        console.warn("Programările fixe nu au putut fi citite:", error);
        setFixedSchedules(defaultFixedSchedules);
      }
    );

    return () => {
      unsubRooms();
      unsubGroups();
      unsubFixed();
    };
  }, [currentLocationId, user]);

  useEffect(() => {
    if (!user) {
      setFixedSectionTitle(defaultFixedSectionTitle);
      setFixedSectionDraft(defaultFixedSectionTitle);
      return;
    }

    return onSnapshot(
      doc(db, "settings", `calendar_${currentLocationId}`),
      (snapshot) => {
        const title = String(snapshot.data()?.fixedSectionTitle ?? defaultFixedSectionTitle).trim() || defaultFixedSectionTitle;
        setFixedSectionTitle(title);
        setFixedSectionDraft(title);
      },
      (error) => {
        console.warn("Numele secțiunii din calendar nu a putut fi citit:", error);
        setFixedSectionTitle(defaultFixedSectionTitle);
        setFixedSectionDraft(defaultFixedSectionTitle);
      }
    );
  }, [currentLocationId, user]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setManagedUsers([]);
      return;
    }

    const usersQuery = isOwner
      ? query(collection(db, "users"), orderBy("email", "asc"))
      : query(collection(db, "users"), where("locationId", "==", currentLocationId));
    const unsubUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        setManagedUsers(
          snapshot.docs.map((item) => {
            const data = item.data();
            return {
              id: item.id,
              email: String(data.email ?? ""),
              displayName: String(data.displayName ?? data.name ?? ""),
              groupName: String(data.groupName ?? data.group ?? ""),
              role: normalizeRole(data.role),
              isOwner: Boolean(data.isOwner || data.owner || data.isLocationOwner),
              locationId: String(data.locationId ?? "main-location"),
              locationName: String(data.locationName ?? defaultLocationName),
            };
          })
        );
      },
      (error) => {
        console.warn("Utilizatorii nu au putut fi citiți:", error);
        setManagedUsers([]);
      }
    );

    const unsubCodes = onSnapshot(
      doc(db, "settings", "auth_codes"),
      (snapshot) => {
        const data = snapshot.data() ?? {};
        setAuthCodes({
          adminCode: String(data.adminCode ?? ""),
          viewerCode: String(data.viewerCode ?? data.userCode ?? ""),
          userCode: String(data.userCode ?? ""),
          superadminCode: String(data.superadminCode ?? ""),
          locationCodes: normalizeLocationCodes(data.locationCodes),
        });
      },
      (error) => {
        console.warn("Codurile de acces nu au putut fi citite:", error);
        setAuthCodes(emptyAuthCodes);
      }
    );

    return () => {
      unsubUsers();
      unsubCodes();
    };
  }, [currentLocationId, isOwner, isSuperAdmin]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setPersonalDraft({
      displayName: profile.displayName,
      groupName: profile.groupName,
      usePin: profile.usePin,
      lockOnHide: profile.lockOnHide,
      useBiometrics: profile.useBiometrics,
    });
    setGroupSetupDraft(profile.groupName);
  }, [profile]);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      group: current.group && groups.some((group) => group.name === current.group) ? current.group : profile?.groupName ?? "",
      room: current.room && rooms.some((room) => room.name === current.room) ? current.room : "",
    }));
  }, [groups, rooms, profile?.groupName]);

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => booking.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [bookings, today]
  );

  const listBookings = useMemo(() => {
    const filtered = bookings.filter((booking) => {
      if (listFilter === "future") {
        return booking.endDate >= today;
      }

      if (listFilter === "past") {
        return booking.endDate < today;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const value = `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`);
      return sortDirection === "asc" ? value : -value;
    });
  }, [bookings, listFilter, sortDirection, today]);

  const activePeriodDays = useMemo(() => {
    if (calendarMode === "day") {
      return [dateKey(currentDate)];
    }

    if (calendarMode === "week") {
      const start = getWeekStart(currentDate);
      return Array.from({ length: 7 }, (_, index) => dateKey(addDays(start, index)));
    }

    return [];
  }, [calendarMode, currentDate]);

  const monthCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const blanks = (firstDay.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];

    for (let i = 0; i < blanks; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= count; day += 1) {
      cells.push(dateKey(new Date(year, month, day)));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentDate]);

  const periodTitle = useMemo(() => {
    if (calendarMode === "month") {
      return currentDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    }

    if (calendarMode === "week") {
      const start = getWeekStart(currentDate);
      const end = addDays(start, 6);
      return `${formatDateLabel(dateKey(start))} - ${formatDateLabel(dateKey(end), { year: "numeric" })}`;
    }

    return parseDateKey(dateKey(currentDate)).toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [calendarMode, currentDate]);

  const todayBookings = bookingsForDay(bookings, today);

  function movePeriod(direction: -1 | 1) {
    const copy = new Date(currentDate);

    if (calendarMode === "month") {
      copy.setMonth(copy.getMonth() + direction);
    } else if (calendarMode === "week") {
      copy.setDate(copy.getDate() + direction * 7);
    } else {
      copy.setDate(copy.getDate() + direction);
    }

    setCurrentDate(copy);
  }

  function openCreateForm(date?: string) {
    if (!canManageBookings) {
      return;
    }

    setEditingId(null);
    setFormError("");
    setFormData({
      ...emptyForm,
      group: profile?.groupName || "",
      room: "",
      startDate: date || today,
      endDate: date || today,
    });
    setShowBookingModal(true);
  }

  function openEditForm(booking: Booking) {
    if (!canEditBooking(booking)) {
      return;
    }

    setSelectedBooking(null);
    setEditingId(booking.id);
    setFormError("");
    setFormData({
      group: booking.group,
      room: booking.room,
      startDate: booking.startDate,
      endDate: booking.endDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      reason: booking.reason,
    });
    setShowBookingModal(true);
  }

  function canEditBooking(booking: Booking) {
    return Boolean(user && (isSuperAdmin || (role === "admin" && booking.authorEmail === user.email)));
  }

  function findConflict(form: BookingForm, ignoredId: string | null) {
    const normalizedEndDate = form.endDate || form.startDate;
    const eventConflict = bookings.find((booking) => {
      if (ignoredId && booking.id === ignoredId) {
        return false;
      }

      return (
        booking.room === form.room &&
        dateRangesOverlap(form.startDate, normalizedEndDate, booking.startDate, booking.endDate) &&
        timeRangesOverlap(form.startTime, form.endTime, booking.startTime, booking.endTime)
      );
    });

    if (eventConflict) {
      return `${eventConflict.group}, ${eventConflict.startTime}-${eventConflict.endTime}, ${eventConflict.room}`;
    }

    const fixedConflict = fixedSchedules.find((schedule) => {
      if (schedule.room !== form.room) {
        return false;
      }

      const touchesDay = datesInRange(form.startDate, normalizedEndDate).some((date) => weekdayIndexFromKey(date) === schedule.dayIndex);
      return touchesDay && timeRangesOverlap(form.startTime, form.endTime, schedule.startTime, schedule.endTime);
    });

    if (fixedConflict) {
      return `${fixedConflict.title}, ${fixedConflict.group}, ${fixedConflict.startTime}-${fixedConflict.endTime}`;
    }

    return "";
  }

  async function handleBookingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!user || !canManageBookings) {
      setFormError("Ai nevoie de drepturi de admin pentru programări.");
      return;
    }

    if (!formData.startDate) {
      setFormError("Alege data programării.");
      return;
    }

    if (!formData.group || !formData.room) {
      setFormError("Alege grupul și sala.");
      return;
    }

    const normalizedEndDate = formData.endDate || formData.startDate;

    if (normalizedEndDate < formData.startDate) {
      setFormError("Data de final trebuie să fie după data de început.");
      return;
    }

    if (timeToMinutes(formData.endTime) <= timeToMinutes(formData.startTime)) {
      setFormError("Ora de final trebuie să fie după ora de început.");
      return;
    }

    const conflict = findConflict({ ...formData, endDate: normalizedEndDate }, editingId);

    if (conflict) {
      setFormError(`Există deja o programare: ${conflict}.`);
      return;
    }

    const originalBooking = editingId ? bookings.find((booking) => booking.id === editingId) : null;
    const payload = {
      group: formData.group,
      congregatie: formData.group,
      room: formData.room,
      location: formData.room,
      startDate: formData.startDate,
      endDate: normalizedEndDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      orar: `${formData.startTime} - ${formData.endTime}`,
      reason: formData.reason,
      motiv: formData.reason,
      authorEmail: editingId ? originalBooking?.authorEmail ?? user.email : user.email,
      authorName: editingId ? originalBooking?.authorName ?? profile?.displayName ?? user.email : profile?.displayName ?? user.email,
      updatedBy: profile?.displayName ?? user.email,
      locationId: currentLocationId,
      locationName,
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), payload);
      } else {
        await addDoc(collection(db, "events"), { ...payload, createdAt: Timestamp.now() });
      }

      setShowBookingModal(false);
      setEditingId(null);
    } catch (error) {
      console.error("Programarea nu a putut fi salvată:", error);
      setFormError("Programarea nu a putut fi salvată.");
    }
  }

  async function removeBooking(booking: Booking) {
    if (!canEditBooking(booking) || !confirm("Ștergi această programare?")) {
      return;
    }

    await deleteDoc(doc(db, "events", booking.id));
    setSelectedBooking(null);
  }

  function openPinSetup(intent: PinIntent) {
    setPinIntent(intent);
    setPinDraft({ pin: "", confirm: "" });
    setPinError("");
  }

  function closePinSetup() {
    setPinIntent(null);
    setPinDraft({ pin: "", confirm: "" });
    setPinError("");
  }

  function handlePinToggle(checked: boolean) {
    if (checked) {
      openPinSetup("pin");
      return;
    }

    setPersonalDraft((current) => ({
      ...current,
      usePin: false,
      useBiometrics: false,
      lockOnHide: false,
    }));
    setPendingPinHash(null);
  }

  function handleBiometricsToggle(checked: boolean) {
    if (!checked) {
      setPersonalDraft((current) => ({ ...current, useBiometrics: false }));
      return;
    }

    if (!personalDraft.usePin || (!profile?.hasPin && !pendingPinHash)) {
      openPinSetup("biometrics");
      return;
    }

    setPersonalDraft((current) => ({ ...current, usePin: true, useBiometrics: true }));
  }

  async function confirmPinSetup() {
    if (!user || !pinIntent) {
      return;
    }

    setPinError("");

    if (!/^\d{4,8}$/.test(pinDraft.pin)) {
      setPinError("PIN-ul trebuie să aibă între 4 și 8 cifre.");
      return;
    }

    if (pinDraft.pin !== pinDraft.confirm) {
      setPinError("Confirmarea nu se potrivește cu PIN-ul.");
      return;
    }

    const pinHash = await hashPin(user.uid, pinDraft.pin);
    setPendingPinHash(pinHash);
    setPersonalDraft((current) => ({
      ...current,
      usePin: true,
      useBiometrics: pinIntent === "biometrics" ? true : current.useBiometrics,
    }));
    closePinSetup();
  }

  async function savePersonalSettings() {
    if (!user) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    if (!isSuperAdmin && !personalDraft.groupName.trim()) {
      setSettingsError("Alege un grup înainte să salvezi.");
      return;
    }

    if ((personalDraft.usePin || personalDraft.useBiometrics) && !profile?.hasPin && !pendingPinHash) {
      openPinSetup(personalDraft.useBiometrics ? "biometrics" : "pin");
      return;
    }

    const usePin = personalDraft.usePin || personalDraft.useBiometrics;
    const payload: Record<string, unknown> = {
      email: user.email,
      displayName: personalDraft.displayName,
      groupName: isSuperAdmin ? "" : personalDraft.groupName,
      role,
      locationId: profile?.locationId ?? "main-location",
      locationName: profile?.locationName ?? locationName,
      usePin,
      lockOnHide: usePin ? personalDraft.lockOnHide : false,
      useBiometrics: usePin ? personalDraft.useBiometrics : false,
    };

    if (pendingPinHash) {
      payload.pinHash = pendingPinHash;
      payload.pinSet = true;
    }

    try {
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
      setPendingPinHash(null);
      setSettingsMessage("Setările au fost salvate.");
    } catch (error) {
      console.error("Setările nu au putut fi salvate:", error);
      setSettingsError("Setările nu au putut fi salvate. Verifică regulile Firebase.");
    }
  }

  async function saveRequiredGroup() {
    setGroupSetupError("");

    if (!user || !profile) {
      return;
    }

    if (!groupSetupDraft.trim()) {
      setGroupSetupError("Alege grupul din care faci parte.");
      return;
    }

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          displayName: profile.displayName,
          groupName: groupSetupDraft,
          role,
          locationId: profile.locationId,
          locationName: profile.locationName || locationName,
        },
        { merge: true }
      );
      setPersonalDraft((current) => ({ ...current, groupName: groupSetupDraft }));
      setGroupSetupCompleted(true);
    } catch (error) {
      console.error("Grupul nu a putut fi salvat:", error);
      setGroupSetupError("Grupul nu a putut fi salvat. Verifică regulile Firebase.");
    }
  }

  function openSpaceEditor(kind: SpaceKind, item?: RoomItem | GroupItem) {
    setSpaceEditor({ kind, id: item?.id ?? null, name: item?.name ?? "" });
    setSpaceError("");
    setSettingsError("");
    setSettingsMessage("");
  }

  async function saveSpaceItem() {
    if (!isSuperAdmin || !spaceEditor) {
      return;
    }

    const name = spaceEditor.name.trim();
    const collectionName = spaceEditor.kind === "room" ? "rooms" : "groups";
    const label = spaceEditor.kind === "room" ? "Sala" : "Grupul";

    if (!name) {
      setSpaceError(spaceEditor.kind === "room" ? "Scrie numele sălii." : "Scrie numele grupului.");
      return;
    }

    setSettingsError("");
    setSpaceError("");

    try {
      const payload = {
        name,
        locationId: currentLocationId,
        locationName,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      };

      if (spaceEditor.id) {
        await updateDoc(doc(db, collectionName, spaceEditor.id), payload);
      } else {
        await addDoc(collection(db, collectionName), {
          ...payload,
          createdBy: user?.email ?? "",
          createdAt: Timestamp.now(),
        });
      }

      setSpaceEditor(null);
      setSettingsMessage(
        spaceEditor.kind === "room"
          ? `Sala a fost ${spaceEditor.id ? "actualizată" : "adăugată"}.`
          : `Grupul a fost ${spaceEditor.id ? "actualizat" : "adăugat"}.`
      );
    } catch (error) {
      console.error(`${label} nu a putut fi salvată:`, error);
      setSpaceError("Firebase nu permite încă această modificare. Actualizează regulile Firestore pentru superadmin.");
    }
  }

  async function removeSpaceItem(kind: SpaceKind, itemId: string) {
    const collectionName = kind === "room" ? "rooms" : "groups";
    const label = kind === "room" ? "această sală" : "acest grup";

    if (!isSuperAdmin || !confirm(`Ștergi ${label}?`)) {
      return;
    }

    setSettingsError("");

    try {
      await deleteDoc(doc(db, collectionName, itemId));
      setSettingsMessage(kind === "room" ? "Sala a fost ștearsă." : "Grupul a fost șters.");
    } catch (error) {
      console.error("Elementul nu a putut fi șters:", error);
      setSettingsError("Firebase nu permite încă ștergerea. Actualizează regulile Firestore pentru superadmin.");
    }
  }

  function openFixedManager() {
    setFixedSectionDraft(fixedSectionTitle);
    setFixedDraft(emptyFixedDraft);
    setFixedEditingId(null);
    setShowFixedForm(false);
    setFixedError("");
    setShowFixedManager(true);
  }

  function startFixedAdd() {
    setFixedDraft(emptyFixedDraft);
    setFixedEditingId(null);
    setFixedError("");
    setShowFixedForm(true);
  }

  function startFixedEdit(item: FixedSchedule) {
    setFixedDraft({
      dayIndex: item.dayIndex,
      group: item.group,
      room: item.room,
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
    });
    setFixedEditingId(item.id);
    setFixedError("");
    setShowFixedForm(true);
  }

  async function saveFixedSectionName() {
    if (!isSuperAdmin) {
      return;
    }

    const title = fixedSectionDraft.trim();

    if (!title) {
      setFixedError("Scrie numele secțiunii.");
      return;
    }

    setSettingsError("");
    setFixedError("");

    try {
      await setDoc(
        doc(db, "settings", `calendar_${currentLocationId}`),
        {
          fixedSectionTitle: title,
          locationId: currentLocationId,
          locationName,
          updatedBy: user?.email ?? "",
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      setFixedSectionTitle(title);
      setSettingsMessage("Numele secțiunii a fost salvat.");
    } catch (error) {
      console.error("Numele secțiunii nu a putut fi salvat:", error);
      setFixedError("Firebase nu permite încă salvarea numelui secțiunii.");
    }
  }

  async function saveFixedSchedule() {
    if (!isSuperAdmin) {
      return;
    }

    setFixedError("");

    if (
      fixedDraft.dayIndex === "" ||
      !fixedDraft.group ||
      !fixedDraft.room ||
      !fixedDraft.startTime ||
      !fixedDraft.endTime ||
      !fixedDraft.title.trim()
    ) {
      setFixedError("Completează ziua, grupul, sala, orele și numele.");
      return;
    }

    if (timeToMinutes(fixedDraft.endTime) <= timeToMinutes(fixedDraft.startTime)) {
      setFixedError("Ora de final trebuie să fie după ora de început.");
      return;
    }

    try {
      const payload = {
        dayIndex: fixedDraft.dayIndex,
        group: fixedDraft.group,
        room: fixedDraft.room,
        startTime: fixedDraft.startTime,
        endTime: fixedDraft.endTime,
        title: fixedDraft.title.trim(),
        locationId: currentLocationId,
        locationName,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      };

      if (fixedEditingId) {
        await updateDoc(doc(db, "fixedSchedules", fixedEditingId), payload);
      } else {
        await addDoc(collection(db, "fixedSchedules"), { ...payload, createdAt: Timestamp.now() });
      }

      setFixedDraft(emptyFixedDraft);
      setFixedEditingId(null);
      setShowFixedForm(false);
      setSettingsMessage(fixedEditingId ? "Programul a fost actualizat." : "Programul a fost adăugat.");
    } catch (error) {
      console.error("Programul nu a putut fi salvat:", error);
      setFixedError("Firebase nu permite încă salvarea programului. Actualizează regulile Firestore pentru superadmin.");
    }
  }

  async function removeFixedSchedule(itemId: string) {
    if (!isSuperAdmin || !confirm("Ștergi acest program?")) {
      return;
    }

    setFixedError("");

    try {
      await deleteDoc(doc(db, "fixedSchedules", itemId));
      setSettingsMessage("Programul a fost șters.");
    } catch (error) {
      console.error("Programul nu a putut fi șters:", error);
      setFixedError("Firebase nu permite încă ștergerea programului.");
    }
  }

  function openCodesEditor() {
    const draft = {
      ...authCodes,
      locationCodes: authCodes.locationCodes
        .filter((item) => isOwner || item.locationId === currentLocationId)
        .map((item) => ({ ...item })),
    };
    setCodesDraft(draft);
    setNewLocationCode({
      code: "",
      role: "viewer",
      locationId: currentLocationId,
    });
    setCodesConfirming(false);
    setCodesError("");
    setShowCodesModal(true);
  }

  function addLocationCodeDraft() {
    const code = newLocationCode.code.trim();
    const location = locations.find((item) => item.id === newLocationCode.locationId) ?? currentLocation;

    if (!code || !location) {
      setCodesError("Alege locația, rolul și scrie codul.");
      return;
    }

    setCodesDraft((current) => ({
      ...current,
      locationCodes: [
        ...current.locationCodes,
        {
          id: crypto.randomUUID(),
          code,
          role: newLocationCode.role,
          locationId: location.id,
          locationName: location.name,
        },
      ],
    }));
    setNewLocationCode({ code: "", role: "viewer", locationId: location.id });
    setCodesError("");
  }

  function updateLocationCodeDraft(id: string, patch: Partial<LocationCode>) {
    setCodesDraft((current) => ({
      ...current,
      locationCodes: current.locationCodes.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const next = { ...item, ...patch };
        if (patch.locationId) {
          const location = locations.find((candidate) => candidate.id === patch.locationId);
          next.locationName = location?.name ?? next.locationName;
        }

        return next;
      }),
    }));
  }

  async function saveAuthCodes() {
    if (!isSuperAdmin) {
      return;
    }

    setCodesError("");

    try {
      const savedLocationCodes = isOwner
        ? codesDraft.locationCodes
        : [
            ...authCodes.locationCodes.filter((item) => item.locationId !== currentLocationId),
            ...codesDraft.locationCodes,
          ];

      await setDoc(
        doc(db, "settings", "auth_codes"),
        {
          adminCode: codesDraft.adminCode,
          viewerCode: codesDraft.viewerCode,
          userCode: codesDraft.viewerCode || codesDraft.userCode,
          superadminCode: codesDraft.superadminCode,
          locationCodes: savedLocationCodes.filter((item) => item.code.trim()).map((item) => ({
            ...item,
            code: item.code.trim(),
          })),
          updatedBy: user?.email ?? "",
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      setCodesConfirming(false);
      setShowCodesModal(false);
      setSettingsMessage("Codurile au fost salvate.");
    } catch (error) {
      console.error("Codurile nu au putut fi salvate:", error);
      setCodesError("Codurile nu au putut fi salvate. Verifică regulile Firebase.");
    }
  }

  function openLocationEditor(item?: LocationItem) {
    setLocationEditor({ id: item?.id ?? null, name: item?.name ?? "" });
    setLocationError("");
    setSettingsMessage("");
    setSettingsError("");
  }

  async function saveLocation() {
    if (!isOwner || !locationEditor) {
      return;
    }

    const name = locationEditor.name.trim();

    if (!name) {
      setLocationError("Scrie numele locației.");
      return;
    }

    setLocationError("");

    try {
      if (locationEditor.id) {
        await updateDoc(doc(db, "locations", locationEditor.id), {
          name,
          updatedBy: user?.email ?? "",
          updatedAt: Timestamp.now(),
        });
      } else {
        const created = await addDoc(collection(db, "locations"), {
          name,
          ownerEmail: user?.email ?? "",
          createdBy: user?.email ?? "",
          createdAt: Timestamp.now(),
        });
        setActiveLocationId(created.id);
      }

      setLocationEditor(null);
      setSettingsMessage(locationEditor.id ? "Locația a fost actualizată." : "Locația a fost adăugată.");
    } catch (error) {
      console.error("Locația nu a putut fi salvată:", error);
      setLocationError("Locația nu a putut fi salvată. Verifică regulile Firebase.");
    }
  }

  async function removeLocation(item: LocationItem) {
    if (!isOwner || !confirm(`Ștergi locația ${item.name}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "locations", item.id));
      if (activeLocationId === item.id) {
        setActiveLocationId(profile?.locationId ?? "main-location");
      }
      setSettingsMessage("Locația a fost ștearsă.");
    } catch (error) {
      console.error("Locația nu a putut fi ștearsă:", error);
      setSettingsError("Locația nu a putut fi ștearsă. Verifică regulile Firebase.");
    }
  }

  function openPasswordModal() {
    setPasswordDraft({ current: "", next: "", confirm: "" });
    setPasswordError("");
    setPasswordMessage("");
    setPasswordModal(true);
  }

  async function savePasswordChange() {
    if (!user?.email) {
      return;
    }

    setPasswordError("");
    setPasswordMessage("");

    if (passwordDraft.next.length < 6) {
      setPasswordError("Parola nouă trebuie să aibă cel puțin 6 caractere.");
      return;
    }

    if (passwordDraft.next !== passwordDraft.confirm) {
      setPasswordError("Confirmarea parolei nu se potrivește.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, passwordDraft.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordDraft.next);
      setPasswordMessage("Parola a fost schimbată.");
      setPasswordDraft({ current: "", next: "", confirm: "" });
    } catch (error) {
      console.error("Parola nu a putut fi schimbată:", error);
      setPasswordError("Parola nu a putut fi schimbată. Verifică parola actuală sau folosește emailul de resetare.");
    }
  }

  async function sendPasswordReset() {
    if (!user?.email) {
      return;
    }

    setPasswordError("");

    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordMessage("Ți-am trimis emailul pentru resetarea parolei.");
    } catch (error) {
      console.error("Emailul de resetare nu a putut fi trimis:", error);
      setPasswordError("Emailul de resetare nu a putut fi trimis.");
    }
  }

  const stats = [
    { label: "Azi", value: todayBookings.length },
    { label: "Viitoare", value: upcomingBookings.length },
    { label: "Săli", value: rooms.length },
    { label: "Rol", value: appRoleLabel(profile, role) },
  ];
  const editableCodeLocations = isOwner
    ? locations
    : currentLocation
      ? [currentLocation]
      : [{ id: currentLocationId, name: locationName, ownerEmail: "" }];

  if (mustChooseGroup) {
    return (
      <main className="kelunia-shell">
        <header className="app-topbar">
          <div>
            <span className="eyebrow">Kelunia</span>
            <h1>{locationName}</h1>
            <p>{profile?.displayName || user?.email} · {appRoleLabel(profile, role)}</p>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => signOut(auth)} aria-label="Ieșire">
              <span aria-hidden="true">↗</span>
              <span>Ieșire</span>
            </button>
          </div>
        </header>

        <section className="group-required-panel">
          <div>
            <span className="eyebrow">Profil incomplet</span>
            <h2>Alege grupul tău</h2>
            <p>După salvare vei putea folosi aplicația.</p>
          </div>
          <label>
            Grup
            <select value={groupSetupDraft} onChange={(event) => setGroupSetupDraft(event.target.value)}>
              <option value="">Alege grupul</option>
              {groups.map((group) => (
                <option key={group.id} value={group.name}>{group.name}</option>
              ))}
            </select>
          </label>
          {groupSetupError && <p className="error-line">{groupSetupError}</p>}
          <button className="primary-button" onClick={saveRequiredGroup} type="button">
            Salvează și continuă
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="kelunia-shell">
      <header className="app-topbar">
        <div>
          <span className="eyebrow">Kelunia</span>
          <h1>{locationName}</h1>
          <p>{profile ? `${profile.displayName} · ${appRoleLabel(profile, role)}` : "Previzualizare aplicație"}</p>
        </div>
        <div className="topbar-actions">
          {isOwner && locations.length > 0 && (
            <select
              className="topbar-select"
              value={currentLocationId}
              onChange={(event) => setActiveLocationId(event.target.value)}
              aria-label="Locație activă"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          )}
          {user ? (
            <button className="icon-button" onClick={() => signOut(auth)} aria-label="Ieșire">
              <span aria-hidden="true">↗</span>
              <span>Ieșire</span>
            </button>
          ) : (
            <Link className="primary-link" href="/login">
              Intră în cont
            </Link>
          )}
        </div>
      </header>

      <section className="quick-stats" aria-label="Rezumat">
        {stats.map((stat) => (
          <div className="stat-tile" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </section>

      <nav className="app-tabs" aria-label="Navigare">
        {[
          ["calendar", "Calendar"],
          ["list", "Listă"],
          ["settings", "Setări"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={activeView === value ? "active" : ""}
            onClick={() => setActiveView(value as AppView)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {activeView === "calendar" && (
        <section className="fixed-schedule-band">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Săptămână</span>
              <h2>{fixedSectionTitle}</h2>
            </div>
            {isSuperAdmin && (
              <button className="secondary-button compact" onClick={openFixedManager} type="button">
                Administrează
              </button>
            )}
          </div>
          <div className="fixed-grid">
            {dayLabels.map((day, index) => {
              const items = fixedForDay(fixedSchedules, index);
              return (
                <article className="fixed-day" key={day}>
                  <span>{day}</span>
                  {items.length === 0 ? (
                    <p>Liber</p>
                  ) : (
                    items.map((item) => (
                      <div className="fixed-pill" key={item.id}>
                        <strong>{item.startTime} - {item.endTime}</strong>
                        <span>{item.title}</span>
                        <small>{item.group} · {item.room}</small>
                      </div>
                    ))
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeView === "calendar" && (
        <section className="workspace-panel">
          <div className="calendar-toolbar">
            <div>
              <span className="eyebrow">Calendar</span>
              <h2>{periodTitle}</h2>
            </div>
            <div className="toolbar-actions">
              {canManageBookings && (
                <button className="primary-button compact" onClick={() => openCreateForm(dateKey(currentDate))} type="button">
                  + Rezervare nouă
                </button>
              )}
              <button className="icon-only" onClick={() => movePeriod(-1)} type="button" aria-label="Perioada anterioară">
                ‹
              </button>
              <button className="secondary-button compact" onClick={() => setCurrentDate(new Date())} type="button">
                Azi
              </button>
              <button className="icon-only" onClick={() => movePeriod(1)} type="button" aria-label="Perioada următoare">
                ›
              </button>
            </div>
          </div>

          <div className="segmented-control" role="group" aria-label="Mod calendar">
            {[
              ["month", "Lună"],
              ["week", "Săptămână"],
              ["day", "Zi"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={calendarMode === value ? "active" : ""}
                onClick={() => setCalendarMode(value as CalendarMode)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {calendarMode === "month" ? (
            <div className="month-calendar">
              {shortDayLabels.map((day) => (
                <div className="month-heading" key={day}>
                  {day}
                </div>
              ))}
              {monthCells.map((cell, index) => {
                const dayBookings = cell ? bookingsForDay(bookings, cell) : [];
                return (
                  <div
                    className={`month-cell ${cell === today ? "today" : ""} ${cell ? "" : "muted"}`}
                    key={`${cell ?? "blank"}-${index}`}
                    onClick={() => cell && setCurrentDate(parseDateKey(cell))}
                  >
                    {cell && (
                      <>
                        <div className="cell-date">
                          <span>{parseDateKey(cell).getDate()}</span>
                          {canManageBookings && (
                            <button onClick={(event) => { event.stopPropagation(); openCreateForm(cell); }} type="button" aria-label="Adaugă">
                              +
                            </button>
                          )}
                        </div>
                        <div className="cell-events">
                          {dayBookings.slice(0, 3).map((booking) => (
                            <button key={booking.id} onClick={(event) => { event.stopPropagation(); setSelectedBooking(booking); }} type="button">
                              <strong>{booking.startTime}</strong>
                              <span>{booking.group}</span>
                            </button>
                          ))}
                          {dayBookings.length > 3 && <small>+{dayBookings.length - 3}</small>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="agenda-grid">
              {activePeriodDays.map((day) => {
                const dayBookings = bookingsForDay(bookings, day);
                return (
                  <article className="agenda-day" key={day}>
                    <div className="agenda-day-head">
                      <div>
                        <span>{parseDateKey(day).toLocaleDateString("ro-RO", { weekday: "long" })}</span>
                        <strong>{formatDateLabel(day, { year: "numeric" })}</strong>
                      </div>
                      {canManageBookings && (
                        <button onClick={() => openCreateForm(day)} type="button" aria-label="Adaugă">
                          +
                        </button>
                      )}
                    </div>
                    {dayBookings.length === 0 ? (
                      <p className="empty-line">Nicio programare</p>
                    ) : (
                      dayBookings.map((booking) => (
                        <button className="agenda-booking" key={booking.id} onClick={() => setSelectedBooking(booking)} type="button">
                          <span>{booking.startTime} - {booking.endTime}</span>
                          <strong>{booking.group}</strong>
                          <small>{booking.room}</small>
                        </button>
                      ))
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeView === "list" && (
        <section className="workspace-panel">
          <div className="section-heading list-heading">
            <div>
              <span className="eyebrow">Listă programări</span>
              <h2>{listBookings.length} rezultate</h2>
            </div>
            <div className="toolbar-actions">
              <select value={listFilter} onChange={(event) => setListFilter(event.target.value as ListFilter)}>
                <option value="future">Viitoare</option>
                <option value="past">Trecute</option>
                <option value="all">Toate</option>
              </select>
              <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
                <option value="asc">Crescător</option>
                <option value="desc">Descrescător</option>
              </select>
            </div>
          </div>

          <div className="booking-list">
            {listBookings.length === 0 ? (
              <p className="empty-line">Nu există programări de afișat.</p>
            ) : (
              listBookings.map((booking) => (
                <article className="booking-row" key={booking.id}>
                  <button onClick={() => setSelectedBooking(booking)} type="button">
                    <span className="date-badge">{formatDateLabel(booking.startDate, { year: "numeric" })}</span>
                    <div>
                      <strong>{booking.group}</strong>
                      <p>{booking.startTime} - {booking.endTime} · {booking.room}</p>
                      <small>{booking.reason}</small>
                    </div>
                  </button>
                  {canEditBooking(booking) && (
                    <div className="row-actions">
                      <button onClick={() => openEditForm(booking)} type="button" aria-label="Editează">
                        ✎
                      </button>
                      <button onClick={() => removeBooking(booking)} type="button" aria-label="Șterge">
                        ×
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {activeView === "settings" && (
        <section className="settings-grid">
          {settingsError && <p className="error-line settings-alert">{settingsError}</p>}
          {settingsMessage && <p className="success-line settings-alert">{settingsMessage}</p>}
          <article className="settings-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Profil</span>
                <h2>Setări personale</h2>
              </div>
            </div>
            {user ? (
              <div className="settings-form">
                <label>
                  Nume
                  <input
                    value={personalDraft.displayName}
                    onChange={(event) => setPersonalDraft({ ...personalDraft, displayName: event.target.value })}
                  />
                </label>
                {!isSuperAdmin && (
                  <label>
                    Grup
                    <select
                      value={personalDraft.groupName}
                      onChange={(event) => setPersonalDraft({ ...personalDraft, groupName: event.target.value })}
                    >
                      <option value="">Alege grupul</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.name}>{group.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                {isSuperAdmin && (
                  <p className="muted-note">
                    {isOwner ? "Ownerul nu trebuie să aparțină unui grup." : "Superadminul nu trebuie să aparțină unui grup."}
                  </p>
                )}
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={personalDraft.usePin}
                    onChange={(event) => handlePinToggle(event.target.checked)}
                  />
                  Blocare cu PIN
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={personalDraft.useBiometrics}
                    onChange={(event) => handleBiometricsToggle(event.target.checked)}
                  />
                  Biometrie
                </label>
                <p className="muted-note">Biometria folosește PIN-ul ca rezervă dacă deblocarea biometrică nu merge.</p>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={personalDraft.lockOnHide}
                    onChange={(event) => setPersonalDraft({ ...personalDraft, lockOnHide: event.target.checked })}
                  />
                  Blochează când ieși din aplicație
                </label>
                <button className="primary-button" onClick={savePersonalSettings} type="button">
                  Salvează
                </button>
                <button className="secondary-button" onClick={openPasswordModal} type="button">
                  Schimbă parola
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <p>Intră în cont pentru setări.</p>
                <Link className="primary-link" href="/login">Autentificare</Link>
              </div>
            )}
          </article>

          {isSuperAdmin && (
            <>
              <article className="settings-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Acces</span>
                    <h2>Coduri</h2>
                  </div>
                  <button className="secondary-button compact" onClick={openCodesEditor} type="button">
                    Editează
                  </button>
                </div>
                <div className="settings-summary-list">
                  <div><span>Admin</span><strong>{authCodes.adminCode || "Nesetat"}</strong></div>
                  <div><span>User</span><strong>{authCodes.viewerCode || authCodes.userCode || "Nesetat"}</strong></div>
                  <div><span>Pe locații</span><strong>{authCodes.locationCodes.length}</strong></div>
                </div>
              </article>

              {isOwner && (
                <article className="settings-panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">Owner</span>
                      <h2>Locații</h2>
                    </div>
                    <button className="secondary-button compact" onClick={() => openLocationEditor()} type="button">
                      + Locație
                    </button>
                  </div>
                  <div className="mini-list">
                    {locations.length === 0 ? (
                      <p className="empty-line">Nu există locații adăugate.</p>
                    ) : (
                      locations.map((location) => (
                        <div className="mini-row" key={location.id}>
                          <span>{location.name}</span>
                          <div className="row-actions">
                            <button onClick={() => openLocationEditor(location)} type="button" aria-label="Editează locația">✎</button>
                            <button onClick={() => removeLocation(location)} type="button" aria-label="Șterge locația">×</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              )}

              <article className="settings-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Spații</span>
                    <h2>Săli și grupuri</h2>
                  </div>
                </div>
                <div className="split-list">
                  <div className="mini-column">
                    <div className="mini-section-head">
                      <h3>Săli</h3>
                      <button className="secondary-button compact" onClick={() => openSpaceEditor("room")} type="button">
                        + Sală
                      </button>
                    </div>
                    <div className="mini-list">
                      {rooms.length === 0 ? (
                        <p className="empty-line">Nu există săli adăugate.</p>
                      ) : (
                        rooms.map((room) => (
                          <div className="mini-row" key={room.id}>
                            <span>{room.name}</span>
                            <div className="row-actions">
                              <button onClick={() => openSpaceEditor("room", room)} type="button" aria-label="Editează sala">✎</button>
                              <button onClick={() => removeSpaceItem("room", room.id)} type="button" aria-label="Șterge sala">×</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mini-column">
                    <div className="mini-section-head">
                      <h3>Grupuri</h3>
                      <button className="secondary-button compact" onClick={() => openSpaceEditor("group")} type="button">
                        + Grup
                      </button>
                    </div>
                    <div className="mini-list">
                      {groups.length === 0 ? (
                        <p className="empty-line">Nu există grupuri adăugate.</p>
                      ) : (
                        groups.map((group) => (
                          <div className="mini-row" key={group.id}>
                            <span>{group.name}</span>
                            <div className="row-actions">
                              <button onClick={() => openSpaceEditor("group", group)} type="button" aria-label="Editează grupul">✎</button>
                              <button onClick={() => removeSpaceItem("group", group.id)} type="button" aria-label="Șterge grupul">×</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </article>

              <article className="settings-panel wide">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Utilizatori</span>
                    <h2>{managedUsers.length} conturi</h2>
                  </div>
                </div>
                <div className="users-table">
                  {managedUsers.map((managedUser) => (
                    <div className="user-row" key={managedUser.id}>
                      <div>
                        <strong>{managedUser.displayName || managedUser.email}</strong>
                        <span>
                          {managedUser.email} · {managedUser.locationName || "fără locație"} · {managedUser.groupName || "fără grup"}
                        </span>
                      </div>
                      <select
                        value={managedUser.role}
                        onChange={(event) => updateDoc(doc(db, "users", managedUser.id), { role: event.target.value })}
                        disabled={managedUser.isOwner}
                      >
                        <option value="viewer">User</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                      <button disabled={managedUser.isOwner} onClick={() => deleteDoc(doc(db, "users", managedUser.id))} type="button">×</button>
                    </div>
                  ))}
                </div>
              </article>
            </>
          )}
        </section>
      )}

      {passwordModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card small-card" role="dialog" aria-modal="true" aria-label="Schimbare parolă">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Cont</span>
                <h2>Schimbă parola</h2>
              </div>
              <button onClick={() => setPasswordModal(false)} type="button" aria-label="Închide">×</button>
            </div>
            <div className="settings-form">
              <label>
                Parola actuală
                <input
                  type="password"
                  value={passwordDraft.current}
                  onChange={(event) => setPasswordDraft({ ...passwordDraft, current: event.target.value })}
                  autoComplete="current-password"
                />
              </label>
              <label>
                Parola nouă
                <input
                  type="password"
                  value={passwordDraft.next}
                  onChange={(event) => setPasswordDraft({ ...passwordDraft, next: event.target.value })}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirmă parola nouă
                <input
                  type="password"
                  value={passwordDraft.confirm}
                  onChange={(event) => setPasswordDraft({ ...passwordDraft, confirm: event.target.value })}
                  autoComplete="new-password"
                />
              </label>
              {passwordError && <p className="error-line">{passwordError}</p>}
              {passwordMessage && <p className="success-line">{passwordMessage}</p>}
              <div className="modal-actions">
                <button className="secondary-button" onClick={sendPasswordReset} type="button">Trimite email resetare</button>
                <button className="primary-button" onClick={savePasswordChange} type="button">Schimbă parola</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCodesModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card manager-card" role="dialog" aria-modal="true" aria-label="Coduri de acces">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Acces</span>
                <h2>Coduri de acces</h2>
              </div>
              <button onClick={() => setShowCodesModal(false)} type="button" aria-label="Închide">×</button>
            </div>

            <div className="booking-form">
              {isOwner && (
                <>
                  <label>
                    Cod owner/superadmin global
                    <input value={codesDraft.superadminCode} onChange={(event) => setCodesDraft({ ...codesDraft, superadminCode: event.target.value })} />
                  </label>
                  <label>
                    Cod admin vechi
                    <input value={codesDraft.adminCode} onChange={(event) => setCodesDraft({ ...codesDraft, adminCode: event.target.value })} />
                  </label>
                  <label>
                    Cod user vechi
                    <input value={codesDraft.viewerCode} onChange={(event) => setCodesDraft({ ...codesDraft, viewerCode: event.target.value })} />
                  </label>
                </>
              )}
            </div>

            <div className="manager-divider" />
            <div className="mini-section-head">
              <h3>Coduri pe locații</h3>
            </div>
            <div className="code-add-grid">
              <input
                placeholder="Cod nou"
                value={newLocationCode.code}
                onChange={(event) => setNewLocationCode({ ...newLocationCode, code: event.target.value })}
              />
              <select
                value={newLocationCode.role}
                onChange={(event) => setNewLocationCode({ ...newLocationCode, role: event.target.value as UserRole })}
              >
                <option value="viewer">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <select
                value={newLocationCode.locationId}
                onChange={(event) => setNewLocationCode({ ...newLocationCode, locationId: event.target.value })}
              >
                <option value="">Alege locația</option>
                {editableCodeLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <button className="secondary-button compact" onClick={addLocationCodeDraft} type="button">Adaugă</button>
            </div>

            <div className="mini-list">
              {codesDraft.locationCodes.length === 0 ? (
                <p className="empty-line">Nu există coduri pe locații.</p>
              ) : (
                codesDraft.locationCodes.map((item) => (
                  <div className="code-row" key={item.id}>
                    <input value={item.code} onChange={(event) => updateLocationCodeDraft(item.id, { code: event.target.value })} />
                    <select value={item.role} onChange={(event) => updateLocationCodeDraft(item.id, { role: event.target.value as UserRole })}>
                      <option value="viewer">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                    <select value={item.locationId} onChange={(event) => updateLocationCodeDraft(item.id, { locationId: event.target.value })}>
                      {editableCodeLocations.map((location) => (
                        <option key={location.id} value={location.id}>{location.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        setCodesDraft((current) => ({
                          ...current,
                          locationCodes: current.locationCodes.filter((candidate) => candidate.id !== item.id),
                        }))
                      }
                      type="button"
                      aria-label="Șterge codul"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {codesError && <p className="error-line manager-alert">{codesError}</p>}
            {codesConfirming && (
              <p className="warning-line manager-alert">Confirmă salvarea codurilor. Codurile noi vor putea crea conturi în locațiile alese.</p>
            )}

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowCodesModal(false)} type="button">Anulează</button>
              {codesConfirming ? (
                <button className="primary-button" onClick={saveAuthCodes} type="button">Confirmă salvarea</button>
              ) : (
                <button className="primary-button" onClick={() => setCodesConfirming(true)} type="button">Salvează</button>
              )}
            </div>
          </div>
        </div>
      )}

      {locationEditor && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card small-card" role="dialog" aria-modal="true" aria-label="Locație">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Locație</span>
                <h2>{locationEditor.id ? "Editează locația" : "Adaugă locație"}</h2>
              </div>
              <button onClick={() => setLocationEditor(null)} type="button" aria-label="Închide">×</button>
            </div>
            <div className="settings-form">
              <label>
                Nume locație
                <input
                  autoFocus
                  value={locationEditor.name}
                  onChange={(event) => setLocationEditor({ ...locationEditor, name: event.target.value })}
                />
              </label>
              {locationError && <p className="error-line">{locationError}</p>}
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setLocationEditor(null)} type="button">Anulează</button>
                <button className="primary-button" onClick={saveLocation} type="button">{locationEditor.id ? "Salvează" : "Adaugă"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pinIntent && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card small-card" role="dialog" aria-modal="true" aria-label="Setare PIN">
            <div className="modal-head">
              <div>
                <span className="eyebrow">{pinIntent === "biometrics" ? "PIN de rezervă" : "Blocare"}</span>
                <h2>{pinIntent === "biometrics" ? "Alege PIN-ul pentru biometrie" : "Alege PIN-ul"}</h2>
              </div>
              <button onClick={closePinSetup} type="button" aria-label="Închide">×</button>
            </div>
            <div className="settings-form">
              <label>
                PIN
                <input
                  inputMode="numeric"
                  maxLength={8}
                  pattern="[0-9]*"
                  type="password"
                  value={pinDraft.pin}
                  onChange={(event) => setPinDraft({ ...pinDraft, pin: event.target.value.replace(/\D/g, "") })}
                />
              </label>
              <label>
                Confirmare PIN
                <input
                  inputMode="numeric"
                  maxLength={8}
                  pattern="[0-9]*"
                  type="password"
                  value={pinDraft.confirm}
                  onChange={(event) => setPinDraft({ ...pinDraft, confirm: event.target.value.replace(/\D/g, "") })}
                />
              </label>
              {pinError && <p className="error-line">{pinError}</p>}
              <div className="modal-actions">
                <button className="secondary-button" onClick={closePinSetup} type="button">Anulează</button>
                <button className="primary-button" onClick={confirmPinSetup} type="button">Salvează PIN</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {spaceEditor && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card small-card" role="dialog" aria-modal="true" aria-label="Administrare spațiu">
            <div className="modal-head">
              <div>
                <span className="eyebrow">{spaceEditor.kind === "room" ? "Sală" : "Grup"}</span>
                <h2>
                  {spaceEditor.id
                    ? spaceEditor.kind === "room" ? "Editează sala" : "Editează grupul"
                    : spaceEditor.kind === "room" ? "Adaugă sală" : "Adaugă grup"}
                </h2>
              </div>
              <button onClick={() => setSpaceEditor(null)} type="button" aria-label="Închide">×</button>
            </div>
            <div className="settings-form">
              <label>
                Nume
                <input
                  autoFocus
                  value={spaceEditor.name}
                  onChange={(event) => setSpaceEditor({ ...spaceEditor, name: event.target.value })}
                />
              </label>
              {spaceError && <p className="error-line">{spaceError}</p>}
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setSpaceEditor(null)} type="button">Anulează</button>
                <button className="primary-button" onClick={saveSpaceItem} type="button">
                  {spaceEditor.id ? "Salvează" : "Adaugă"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFixedManager && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card manager-card" role="dialog" aria-modal="true" aria-label="Administrare calendar săptămânal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Calendar</span>
                <h2>{fixedSectionTitle}</h2>
              </div>
              <button onClick={() => setShowFixedManager(false)} type="button" aria-label="Închide">×</button>
            </div>

            <div className="settings-form">
              <label>
                Numele secțiunii
                <input value={fixedSectionDraft} onChange={(event) => setFixedSectionDraft(event.target.value)} />
              </label>
              <button className="secondary-button" onClick={saveFixedSectionName} type="button">Salvează numele</button>
            </div>

            <div className="manager-divider" />
            <div className="mini-section-head">
              <h3>Elemente săptămânale</h3>
              <button className="primary-button compact" onClick={startFixedAdd} type="button">+ Adaugă</button>
            </div>

            {showFixedForm && (
              <div className="embedded-editor">
                <div className="booking-form">
                  <label>
                    Zi
                    <select
                      value={fixedDraft.dayIndex}
                      onChange={(event) =>
                        setFixedDraft({ ...fixedDraft, dayIndex: event.target.value === "" ? "" : Number(event.target.value) })
                      }
                    >
                      <option value="">Alege ziua</option>
                      {dayLabels.map((day, index) => <option key={day} value={index}>{day}</option>)}
                    </select>
                  </label>
                  <label>
                    Grup
                    <select value={fixedDraft.group} onChange={(event) => setFixedDraft({ ...fixedDraft, group: event.target.value })}>
                      <option value="">Alege grupul</option>
                      {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Sală
                    <select value={fixedDraft.room} onChange={(event) => setFixedDraft({ ...fixedDraft, room: event.target.value })}>
                      <option value="">Alege sala</option>
                      {rooms.map((room) => <option key={room.id} value={room.name}>{room.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Nume
                    <input value={fixedDraft.title} onChange={(event) => setFixedDraft({ ...fixedDraft, title: event.target.value })} />
                  </label>
                  <label>
                    Ora început
                    <input type="time" value={fixedDraft.startTime} onChange={(event) => setFixedDraft({ ...fixedDraft, startTime: event.target.value })} />
                  </label>
                  <label>
                    Ora final
                    <input type="time" value={fixedDraft.endTime} onChange={(event) => setFixedDraft({ ...fixedDraft, endTime: event.target.value })} />
                  </label>
                  <div className="modal-actions full-field">
                    <button className="secondary-button" onClick={() => { setShowFixedForm(false); setFixedEditingId(null); setFixedDraft(emptyFixedDraft); }} type="button">
                      Anulează
                    </button>
                    <button className="primary-button" onClick={saveFixedSchedule} type="button">
                      {fixedEditingId ? "Salvează" : "Adaugă"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {fixedError && <p className="error-line manager-alert">{fixedError}</p>}

            <div className="mini-list">
              {fixedSchedules.length === 0 ? (
                <p className="empty-line">Nu există elemente adăugate.</p>
              ) : (
                fixedSchedules.map((item) => (
                  <div className="mini-row" key={item.id}>
                    <span>{dayLabels[item.dayIndex]} · {item.startTime}-{item.endTime} · {item.title}</span>
                    <div className="row-actions">
                      <button onClick={() => startFixedEdit(item)} type="button" aria-label="Editează">✎</button>
                      <button onClick={() => removeFixedSchedule(item.id)} type="button" aria-label="Șterge">×</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showBookingModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Programare">
            <div className="modal-head">
              <div>
                <span className="eyebrow">{editingId ? "Editare" : "Programare nouă"}</span>
                <h2>{editingId ? "Actualizează programarea" : "Adaugă programare"}</h2>
              </div>
              <button onClick={() => setShowBookingModal(false)} type="button" aria-label="Închide">
                ×
              </button>
            </div>
            <form className="booking-form" onSubmit={handleBookingSubmit}>
              <label>
                Grup
                <select value={formData.group} onChange={(event) => setFormData({ ...formData, group: event.target.value })}>
                  <option value="">Alege grupul</option>
                  {groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
                </select>
              </label>
              <label>
                Sală
                <select value={formData.room} onChange={(event) => setFormData({ ...formData, room: event.target.value })}>
                  <option value="">Alege sala</option>
                  {rooms.map((room) => <option key={room.id} value={room.name}>{room.name}</option>)}
                </select>
              </label>
              <label>
                Data început
                <input type="date" value={formData.startDate} onChange={(event) => setFormData({ ...formData, startDate: event.target.value, endDate: event.target.value })} required />
              </label>
              <label>
                Data final
                <input type="date" value={formData.endDate} onChange={(event) => setFormData({ ...formData, endDate: event.target.value })} />
              </label>
              <label>
                Ora început
                <input type="time" value={formData.startTime} onChange={(event) => setFormData({ ...formData, startTime: event.target.value })} required />
              </label>
              <label>
                Ora final
                <input type="time" value={formData.endTime} onChange={(event) => setFormData({ ...formData, endTime: event.target.value })} required />
              </label>
              <label className="full-field">
                Motiv
                <input value={formData.reason} onChange={(event) => setFormData({ ...formData, reason: event.target.value })} required />
              </label>
              {formError && <p className="error-line full-field">{formError}</p>}
              <div className="modal-actions full-field">
                <button className="secondary-button" type="button" onClick={() => setShowBookingModal(false)}>Anulează</button>
                <button className="primary-button" type="submit">{editingId ? "Salvează" : "Confirmă"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card details-card" role="dialog" aria-modal="true" aria-label="Detalii programare">
            <div className="modal-head">
              <div>
                <span className="eyebrow">{selectedBooking.room}</span>
                <h2>{selectedBooking.group}</h2>
              </div>
              <button onClick={() => setSelectedBooking(null)} type="button" aria-label="Închide">×</button>
            </div>
            <dl className="details-list">
              <div><dt>Data</dt><dd>{formatDateLabel(selectedBooking.startDate, { year: "numeric" })}</dd></div>
              <div><dt>Orar</dt><dd>{selectedBooking.startTime} - {selectedBooking.endTime}</dd></div>
              <div><dt>Motiv</dt><dd>{selectedBooking.reason}</dd></div>
              <div><dt>Introdus de</dt><dd>{selectedBooking.authorName || selectedBooking.authorEmail}</dd></div>
              {selectedBooking.updatedBy && <div><dt>Ultima editare</dt><dd>{selectedBooking.updatedBy}</dd></div>}
            </dl>
            <div className="modal-actions">
              {canEditBooking(selectedBooking) && (
                <>
                  <button className="secondary-button" onClick={() => openEditForm(selectedBooking)} type="button">Editează</button>
                  <button className="danger-button" onClick={() => removeBooking(selectedBooking)} type="button">Șterge</button>
                </>
              )}
              <button className="primary-button" onClick={() => setSelectedBooking(null)} type="button">Gata</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
