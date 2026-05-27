"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { registerPlugin } from "@capacitor/core";
import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, cloudFunctions, db } from "@/lib/firebase";
import { useAuth, type AppLanguage, type UserRole } from "@/context/AuthContext";
import { AccessCodesModal } from "@/features/access-codes/components/AccessCodesModal";
import { useAccessCodeGroupSync } from "@/features/access-codes/hooks/useAccessCodeGroupSync";
import { useAccessCodes } from "@/features/access-codes/hooks/useAccessCodes";
import { BookingModal } from "@/features/bookings/components/BookingModal";
import { DayBookingsModal } from "@/features/bookings/components/DayBookingsModal";
import { FixedScheduleModal } from "@/features/fixed-schedules/components/FixedScheduleModal";
import { KeluniaShellChrome } from "@/features/shell/components/KeluniaShellChrome";
import {
  accessCodeUsageLabel,
  isAccessCodeFull,
} from "@/lib/access-codes";
import {
  appRoleLabel,
  dayLabels,
  defaultFixedSectionTitle,
  defaultGroupsLabel,
  defaultLocationName,
  defaultResourcesSectionTitle,
  defaultRoomsLabel,
  emptyFixedDraft,
  offlineReadOnlyMessage,
  shortDayLabels,
} from "@/lib/config/app";
import { dateKey, parseDateKey } from "@/lib/dates";
import { normalizeGroupColor } from "@/lib/group-colors";
import { initialLocationBillingFields } from "@/lib/licensing";
import {
  canUseNativeNotifications,
  LocalNotifications,
  normalizeNotificationOffsetRules,
  normalizeNotificationOffsets,
  notificationOffsetToKey,
  requestKeluniaNotificationPermission,
} from "@/lib/notifications";
import { can } from "@/lib/permissions/capabilities";
import { bookingQueryWindow } from "@/lib/queries/bookings";
import { bookingMatchesRoomAccess, filterRoomsByAccess, normalizeAllowedRoomIds, normalizeRoomAccessMode } from "@/lib/room-access";
import {
  bookingsForDay,
  timeToMinutes,
} from "@/lib/scheduling";
import { clearBiometricCredential, hashPin, registerBiometricCredential, verifyBiometricCredential } from "@/lib/security";
import { updateLocationCounterSafely } from "@/lib/usage-counters";
import type {
  AppView,
  Booking,
  CalendarMode,
  FixedSchedule,
  FixedScheduleDraft,
  GroupItem,
  ListFilter,
  LocationEditor,
  LocationItem,
  LocationPlan,
  ManagedUser,
  PinIntent,
  RoomItem,
  RoomAccessMode,
  SortDirection,
  SpaceEditor,
  SpaceKind,
  WriteTarget,
} from "@/lib/types/domain";
import { MonthView } from "@/features/calendar/views/MonthView";
import { WeekView } from "@/features/calendar/views/WeekView";
import { DayView } from "@/features/calendar/views/DayView";
import { CalendarToolbar } from "@/features/calendar/components/CalendarToolbar";
import { ListView } from "@/features/bookings/views/ListView";
import { FixedSchedulesView } from "@/features/fixed-schedules/views/FixedSchedulesView";
import { BookingDetailsModal } from "@/features/bookings/components/BookingDetailsModal";
import { LocationEditorModal } from "@/features/locations/components/LocationEditorModal";
import { LocationSetupView } from "@/features/locations/components/LocationSetupView";
import { PasswordModal } from "@/features/settings/components/PasswordModal";
import { SettingsView } from "@/features/settings/views/SettingsView";
import { FixedSchedulesManagerModal } from "@/features/fixed-schedules/components/FixedSchedulesManagerModal";
import { LicenseCodesModal } from "@/features/licensing/components/LicenseCodesModal";
import { SpaceEditorModal } from "@/features/settings/components/SpaceEditorModal";
import { PinSetupModal } from "@/features/settings/components/PinSetupModal";
import { AuditHistoryModal } from "@/features/audit/components/AuditHistoryModal";
import { useAuditLogs } from "@/features/audit/hooks/useAuditLogs";
import { useBookingList } from "@/features/bookings/hooks/useBookingList";
import { useBookingEditor } from "@/features/bookings/hooks/useBookingEditor";
import { useBookings } from "@/features/bookings/hooks/useBookings";
import { useCalendar } from "@/features/calendar/hooks/useCalendar";
import { useCurrentLocationContext } from "@/features/locations/hooks/useCurrentLocationContext";
import { useLocationSetup } from "@/features/locations/hooks/useLocationSetup";
import { useLicenseCodes } from "@/features/licensing/hooks/useLicenseCodes";
import { RequiredGroupSetupView } from "@/features/groups/components/RequiredGroupSetupView";
import { useCommunityApplications } from "@/features/landing/hooks/useCommunityApplications";
import { useNewsletter } from "@/features/newsletter/hooks/useNewsletter";
import { useOnlineStatus } from "@/features/network/hooks/useOnlineStatus";
import { useGroupBookingNotifications } from "@/features/notifications/hooks/useGroupBookingNotifications";
import { hasKeluniaPushConfig, listenKeluniaForegroundPush, registerKeluniaPushToken } from "@/lib/push-notifications";
import { useLocationResources } from "@/features/resources/hooks/useLocationResources";
import { appText } from "@/lib/i18n/app-copy-catalog";
import { AppLockModal } from "@/features/security/components/AppLockModal";
import { useCalendarSettings } from "@/features/settings/hooks/useCalendarSettings";
import { usePasswordManagement } from "@/features/settings/hooks/usePasswordManagement";
import { useManagedLocationUsers } from "@/features/users/hooks/useManagedLocationUsers";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

type CapacitorAppPlugin = {
  addListener: (
    eventName: "appStateChange",
    listener: (state: { isActive: boolean }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
};

const CapacitorApp = registerPlugin<CapacitorAppPlugin>("App");

function isInteractiveSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, option, label, [contenteditable='true'], .modal-card, .app-tabs, .segmented-control"
    )
  );
}

export default function KeluniaPage() {
  const { user, profile, role, isSuperAdmin, isOwner, loading: authLoading } = useAuth();
  const router = useRouter();
  const language = profile?.language ?? "ro";

  const [activeView, setActiveView] = useState<AppView>("calendar");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeLocationId, setActiveLocationId] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("future");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedBookingNotice, setSelectedBookingNotice] = useState("");
  const [notifyingSelectedBooking, setNotifyingSelectedBooking] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const [locationEditor, setLocationEditor] = useState<LocationEditor | null>(null);
  const [locationError, setLocationError] = useState("");

  const [personalDraft, setPersonalDraft] = useState({
    displayName: "",
    groupName: "",
    usePin: false,
    lockOnHide: false,
    useBiometrics: false,
    notifyGroupBookings: false,
    notifyFixedGroupSchedules: false,
    notifyWeekBefore: true,
    notifyDayBefore: true,
    notifyOffsets: ["1d", "7d"],
    notifyOffsetsDays: [1, 7],
    language: "ro" as AppLanguage,
  });
  const [groupSetupDraft, setGroupSetupDraft] = useState("");
  const [groupSetupError, setGroupSetupError] = useState("");
  const [groupSetupCompleted, setGroupSetupCompleted] = useState(false);
  const [spaceEditor, setSpaceEditor] = useState<SpaceEditor | null>(null);
  const [spaceError, setSpaceError] = useState("");
  const [showFixedManager, setShowFixedManager] = useState(false);
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [fixedEditingId, setFixedEditingId] = useState<string | null>(null);
  const [fixedDraft, setFixedDraft] = useState<FixedScheduleDraft>(emptyFixedDraft);
  const [fixedError, setFixedError] = useState("");
  const [pinIntent, setPinIntent] = useState<PinIntent | null>(null);
  const [pinDraft, setPinDraft] = useState({ pin: "", confirm: "" });
  const [pinError, setPinError] = useState("");
  const [pendingPinHash, setPendingPinHash] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const biometricPromptedRef = useRef("");
  const [appLocked, setAppLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [biometricWorking, setBiometricWorking] = useState(false);
  const { isOnline, setIsOnline } = useOnlineStatus();

  useEffect(() => {
    if (!authLoading && user && !user.emailVerified) {
      void signOut(auth).finally(() => router.replace("/login"));
      return;
    }

    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  const today = dateKey(new Date());
  const {
    currentLocation,
    currentLocationId,
    headerTitle,
    licenseAccess,
    locationName,
    locations,
    needsLocationSetup,
  } = useCurrentLocationContext({
    activeLocationId,
    db,
    isOwner,
    isSuperAdmin,
    profile,
    user,
  });
  const displayedView: AppView = isOwner && !currentLocationId ? "settings" : activeView;
  const permissionContext = {
    signedIn: Boolean(user),
    role,
    isOwner,
    locationMatches: Boolean(currentLocationId && profile?.locationId === currentLocationId),
    locationWritable: licenseAccess.canWrite,
  };
  const canEditCurrentLocation = can("location.manage", permissionContext);
  const canManageBookings = can("booking.create", permissionContext);
  const canManageAccessCodes = Boolean((isOwner && currentLocationId) || canEditCurrentLocation);
  const canManageMembers = canManageAccessCodes;
  const {
    applications: communityApplications,
    communityApplicationsError,
    markCommunityApplicationReviewed,
    sendCommunityApplicationReply,
    updateCommunityApplicationStatus,
  } = useCommunityApplications({
    db,
    enabled: Boolean(user && isOwner),
    user,
  });
  const {
    newsletterSubscribers,
    newsletterCampaigns,
    newsletterError,
    sendNewsletterCampaign,
  } = useNewsletter({
    db,
    enabled: Boolean(user && isOwner),
    user,
  });
  const mustChooseGroup = Boolean(user && profile && !isSuperAdmin && !profile.groupName.trim() && !groupSetupCompleted);
  const bookingsWindow = useMemo(
    () => bookingQueryWindow(currentDate, activeView, calendarMode, listFilter),
    [activeView, calendarMode, currentDate, listFilter]
  );
  const { bookings } = useBookings({
    userExists: Boolean(user),
    locationId: currentLocationId,
    startDate: bookingsWindow.start,
    endDate: bookingsWindow.end,
  });
  const {
    fixedSchedules,
    groups,
    groupsLoaded,
    groupsReadError,
    rooms,
  } = useLocationResources({
    userExists: Boolean(user),
    locationId: currentLocationId,
  });
  const hasFullRoomAccess = isOwner || role === "manager";
  const accessibleRooms = useMemo(
    () => filterRoomsByAccess(rooms, profile, hasFullRoomAccess),
    [hasFullRoomAccess, profile, rooms]
  );
  const visibleBookingsByRoomAccess = useMemo(
    () => bookings.filter((booking) => bookingMatchesRoomAccess(booking, rooms, profile, hasFullRoomAccess)),
    [bookings, hasFullRoomAccess, profile, rooms]
  );
  const visibleFixedSchedulesByRoomAccess = useMemo(() => {
    if (hasFullRoomAccess) {
      return fixedSchedules;
    }

    const allowedRoomNames = new Set(accessibleRooms.map((room) => room.name));
    return fixedSchedules.filter((schedule) => allowedRoomNames.has(schedule.room));
  }, [accessibleRooms, fixedSchedules, hasFullRoomAccess]);
  const {
    listBookings,
    listPage,
    listPageSize,
    reachedBookingsQueryLimit,
    setListPage,
    totalListPages,
    visibleListBookings,
  } = useBookingList({
    activeView,
    bookings: visibleBookingsByRoomAccess,
    currentLocationId,
    listFilter,
    sortDirection,
    today,
  });
  const {
    fixedPageEnabled,
    fixedPageEnabledDraft,
    fixedSectionDraft,
    fixedSectionTitle,
    groupsLabel,
    groupsLabelDraft,
    listViewDraft,
    listViewTitle,
    resourcesSectionDraft,
    resourcesSectionTitle,
    roomsLabel,
    roomsLabelDraft,
    setFixedPageEnabledDraft,
    setFixedSectionDraft,
    setGroupsLabelDraft,
    setListViewDraft,
    setResourcesSectionDraft,
    setRoomsLabelDraft,
  } = useCalendarSettings({
    userExists: Boolean(user),
    locationId: currentLocationId,
  });
  const { accessCodes, managedUsers } = useManagedLocationUsers({
    isManager: isSuperAdmin || isOwner,
    locationId: currentLocationId,
  });

  useGroupBookingNotifications({ bookings: visibleBookingsByRoomAccess, fixedSchedules, profile, user });
  useAccessCodeGroupSync({
    isManager: isSuperAdmin,
    isOnline,
    profile,
    setGroupSetupCompleted,
    setGroupSetupDraft,
    setPersonalDraft,
    user,
  });
  const {
    activePeriodDays,
    monthCells,
    movePeriod,
    periodTitle,
  } = useCalendar({
    calendarMode,
    currentDate,
    setCurrentDate,
  });

  function showOfflineError(target: WriteTarget) {
    if (target === "group") {
      setGroupSetupError(offlineReadOnlyMessage);
      return;
    }

    if (target === "space") {
      setSpaceError(offlineReadOnlyMessage);
      return;
    }

    if (target === "fixed") {
      setFixedError(offlineReadOnlyMessage);
      return;
    }

    if (target === "codes") {
      setCodesError(offlineReadOnlyMessage);
      return;
    }

    if (target === "location") {
      setLocationError(offlineReadOnlyMessage);
      return;
    }

    setSettingsError(offlineReadOnlyMessage);
  }

  function requireOnline(target: WriteTarget = "settings") {
    const connected = typeof navigator === "undefined" ? isOnline : navigator.onLine;

    if (connected) {
      return true;
    }

    setIsOnline(false);
    showOfflineError(target);
    return false;
  }

  function softDeletePayload() {
    return {
      deleted: true,
      deletedAt: Timestamp.now(),
      deletedBy: user?.email ?? "",
      deletedByUid: user?.uid ?? "",
      updatedBy: user?.email ?? "",
      updatedAt: Timestamp.now(),
    };
  }

  const {
    auditLogs,
    auditLoading,
    auditError,
    showAuditModal,
    setShowAuditModal,
    recordAuditLog,
    loadAuditLogs,
    openAuditHistory,
  } = useAuditLogs({
    db,
    user,
    profile,
    isOwner,
    isSuperAdmin,
    currentLocationId,
    locationName,
    isOnline,
    setIsOnline,
  });
  const {
    address: locationSetupAddress,
    addressInputRef: locationSetupAddressInputRef,
    error: locationSetupError,
    handleAddressChange: handleLocationSetupAddressChange,
    loading: locationSetupLoading,
    mapsStatus,
    name: locationSetupName,
    openLicensedLocation,
    setName: setLocationSetupName,
  } = useLocationSetup({
    apiKey: googleMapsApiKey,
    db,
    enabled: needsLocationSetup,
    isOnline,
    offlineMessage: offlineReadOnlyMessage,
    profile,
    recordAuditLog,
    setIsOnline,
    user,
  });
  useEffect(() => {
    if (!profile) {
      return;
    }

    if (isOwner || needsLocationSetup) {
      return;
    }

    setActiveLocationId((current) => current || profile.locationId || "main-location");
  }, [isOwner, needsLocationSetup, profile]);

  useEffect(() => {
    if (!profile || !needsLocationSetup) {
      return;
    }

    setLocationSetupName((current) => current || profile.locationName || "");
  }, [needsLocationSetup, profile]);

  useEffect(() => {
    if (!isOwner || !activeLocationId || locations.some((location) => location.id === activeLocationId)) {
      return;
    }

    setActiveLocationId("");
  }, [activeLocationId, isOwner, locations]);

  useEffect(() => {
    if (!fixedPageEnabled && activeView === "fixed") {
      setActiveView("calendar");
    }
  }, [activeView, fixedPageEnabled]);

  useEffect(() => {
    if (isOwner && !currentLocationId && activeView !== "settings") {
      setActiveView("settings");
    }
  }, [activeView, currentLocationId, isOwner]);

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
      notifyGroupBookings: profile.notifyGroupBookings,
      notifyFixedGroupSchedules: profile.notifyFixedGroupSchedules,
      notifyWeekBefore: profile.notifyWeekBefore,
      notifyDayBefore: profile.notifyDayBefore,
      notifyOffsets: normalizeNotificationOffsetRules(profile.notifyOffsets).length > 0
        ? normalizeNotificationOffsetRules(profile.notifyOffsets).map(notificationOffsetToKey)
        : normalizeNotificationOffsets(profile.notifyOffsetsDays).length > 0
          ? normalizeNotificationOffsets(profile.notifyOffsetsDays).map((value) => `${value}d`)
          : [
            ...(profile.notifyDayBefore ? ["1d"] : []),
            ...(profile.notifyWeekBefore ? ["7d"] : []),
          ],
      notifyOffsetsDays: normalizeNotificationOffsets(profile.notifyOffsetsDays).length > 0
        ? normalizeNotificationOffsets(profile.notifyOffsetsDays)
        : [
          ...(profile.notifyDayBefore ? [1] : []),
          ...(profile.notifyWeekBefore ? [7] : []),
        ],
      language: profile.language,
    });
    setGroupSetupDraft(profile.groupName);
  }, [profile]);

  const visibleManagedUsers = useMemo(
    () => managedUsers.filter((managedUser) => managedUser.locationId === currentLocationId),
    [currentLocationId, managedUsers]
  );
  const currentLocationSuperAdminCount = useMemo(
    () => visibleManagedUsers.filter((managedUser) => managedUser.role === "manager" && !managedUser.isOwner).length,
    [visibleManagedUsers]
  );
  const currentLocationManagerLimit = currentLocation?.planLimits?.maxManagers ?? 2;
  const currentLocationPendingManagerInviteCount = useMemo(
    () =>
      accessCodes.filter(
        (item) =>
          item.locationId === currentLocationId &&
          item.role === "manager" &&
          item.active &&
          !isAccessCodeFull(item)
      ).length,
    [accessCodes, currentLocationId]
  );
  const currentLocationManagerCapacityUsed = currentLocationSuperAdminCount + currentLocationPendingManagerInviteCount;
  const currentLocationCodeCount = useMemo(
    () => accessCodes.filter((item) => item.locationId === currentLocationId).length,
    [accessCodes, currentLocationId]
  );

  const {
    codeGenerator,
    codesError,
    codesMessage,
    codesWorking,
    copyAccessCode,
    copyInviteLink,
    generateLocationCode,
    inviteDraft,
    openCodesEditor,
    removeAccessCode,
    sendAccessInvite,
    sendInviteEmailFromModal,
    setCodeGenerator,
    setCodesError,
    setInviteDraft,
    setShowCodesModal,
    showCodesModal,
    toggleAccessCodeActive,
    updateAccessCodeDetails,
  } = useAccessCodes({
    canEditCurrentLocation: canManageAccessCodes,
    currentLocationId,
    currentLocationManagerCapacityUsed,
    currentLocationManagerLimit,
    db,
    locationName,
    locations,
    recordAuditLog,
    requireOnline,
    rooms,
    softDeletePayload,
    user,
  });

  const {
    copyLicenseCode,
    createLicenseCode,
    deleteLicenseCode,
    licenseCodes,
    licenseDraft,
    licenseEmailRequests,
    licenseError,
    licenseMessage,
    licenseWorking,
    openLicenseCodes,
    setShowLicenseModal,
    sendLicenseEmail,
    showLicenseModal,
    toggleLicenseCodeActive,
    updateLicenseCode,
    updateLicenseDraft,
  } = useLicenseCodes({
    db,
    isOwner,
    user,
  });

  async function enableOwnerNotifications() {
    const allowed = await requestKeluniaNotificationPermission();

    if (allowed) {
      setSettingsMessage("Notificările pentru mesajele noi sunt activate pe acest dispozitiv.");
      setSettingsError("");
      return;
    }

    setSettingsError("Notificările nu au fost permise pe acest dispozitiv.");
  }

  const ownerLandingNotificationPrimedRef = useRef(false);
  const ownerLandingNotificationSeenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !isOwner) {
      ownerLandingNotificationPrimedRef.current = false;
      ownerLandingNotificationSeenRef.current = new Set();
      return;
    }

    const unreadMessages = communityApplications.filter((application) => application.status === "new");

    if (!ownerLandingNotificationPrimedRef.current) {
      ownerLandingNotificationSeenRef.current = new Set(unreadMessages.map((application) => application.id));
      ownerLandingNotificationPrimedRef.current = true;
      return;
    }

    const newMessages = unreadMessages.filter(
      (application) => !ownerLandingNotificationSeenRef.current.has(application.id)
    );

    unreadMessages.forEach((application) => {
      ownerLandingNotificationSeenRef.current.add(application.id);
    });

    if (newMessages.length === 0 || typeof window === "undefined") {
      return;
    }

    const firstMessage = newMessages[0];
    const title = newMessages.length === 1 ? "Mesaj nou în Kelunia" : `${newMessages.length} mesaje noi în Kelunia`;
    const body = firstMessage.organizationName || firstMessage.email;

    if (canUseNativeNotifications()) {
      LocalNotifications.schedule({
        notifications: [
          {
            id: Math.max(1, Date.now() % 2147483647),
            title,
            body,
            schedule: { at: new Date(Date.now() + 500) },
            smallIcon: "ic_stat_icon_config_sample",
            iconColor: "#0f766e",
          },
        ],
      }).catch((error) => {
        console.warn("Notificarea pentru mesaj nou nu a putut fi programată:", error);
      });
      return;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    new Notification(title, {
      body,
      icon: "/icon-192.png",
    });
  }, [communityApplications, isOwner, user]);
  const {
    canEditBooking,
    editingId,
    formData,
    formError,
    handleBookingSubmit,
    openCreateForm,
    openEditForm,
    removeBooking,
    setFormData,
    setShowBookingModal,
    showBookingModal,
  } = useBookingEditor({
    bookings: visibleBookingsByRoomAccess,
    canManageBookings,
    currentLocationId,
    db,
    fixedSchedules: visibleFixedSchedulesByRoomAccess,
    groups,
    isOnline,
    licenseAccess,
    locationName,
    offlineMessage: offlineReadOnlyMessage,
    permissionContext,
    profile,
    recordAuditLog,
    role,
    rooms: accessibleRooms,
    setIsOnline,
    setSelectedBooking,
    setSettingsError,
    softDeletePayload,
    user,
  });
  const selectedDayBookings = useMemo(
    () => (selectedDay ? bookingsForDay(visibleBookingsByRoomAccess, selectedDay) : []),
    [selectedDay, visibleBookingsByRoomAccess]
  );

  function openDayBookings(date: string) {
    setCurrentDate(parseDateKey(date));

    const dayBookings = bookingsForDay(visibleBookingsByRoomAccess, date);

    if (dayBookings.length === 0) {
      setSelectedDay(null);
      openCreateForm(date, { defaultStartTime: "12:00" });
      return;
    }

    if (dayBookings.length === 1) {
      setSelectedDay(null);
      setSelectedBookingNotice("");
      setSelectedBooking(dayBookings[0]);
      return;
    }

    setSelectedDay(date);
  }

  function createBookingFromDayModal() {
    if (!selectedDay) {
      return;
    }

    const date = selectedDay;
    setSelectedDay(null);
    openCreateForm(date, { defaultStartTime: "12:00" });
  }

  function selectBookingFromDayModal(booking: Booking) {
    setSelectedDay(null);
    setSelectedBookingNotice("");
    setSelectedBooking(booking);
  }

  function createBookingFromSelectedBooking() {
    if (!selectedBooking) {
      return;
    }

    const date = selectedBooking.startDate;
    setSelectedBooking(null);
    openCreateForm(date, { defaultStartTime: "12:00" });
  }

  async function notifySelectedBookingNow() {
    if (!selectedBooking || notifyingSelectedBooking) {
      return;
    }

    setSelectedBookingNotice("");
    setNotifyingSelectedBooking(true);

    try {
      const notificationsAllowed = await requestKeluniaNotificationPermission();
      const pushRegistered = notificationsAllowed ? await registerKeluniaPushToken(user, profile) : false;
      const saveBooking = httpsCallable(cloudFunctions, "saveBooking");

      const result = await saveBooking({
        editingId: selectedBooking.id,
        group: selectedBooking.group,
        room: selectedBooking.room,
        roomId: selectedBooking.roomId,
        locationId: selectedBooking.locationId || currentLocationId,
        locationName: selectedBooking.locationName || locationName,
        startDate: selectedBooking.startDate,
        endDate: selectedBooking.endDate,
        startTime: selectedBooking.startTime,
        endTime: selectedBooking.endTime,
        reason: selectedBooking.reason,
        notifyGroupAudience: "all",
        notifyGroupRecipients: [],
        notifyGroupNow: true,
      });
      const pushSent = Number((result.data as { pushSent?: unknown } | undefined)?.pushSent ?? 0);

      setSelectedBookingNotice(
        !hasKeluniaPushConfig()
          ? "Reminderul a fost salvat, dar notificările push PWA trebuie configurate în Firebase."
          : pushSent > 0
            ? `Reminderul a fost trimis către ${pushSent} dispozitiv${pushSent === 1 ? "" : "e"}.`
            : pushRegistered
              ? "Reminderul a fost trimis, dar nu am găsit încă alte dispozitive active pentru grup."
              : "Reminderul a fost trimis, dar pe acest dispozitiv notificările nu sunt activate."
      );
    } catch (error) {
      console.error("Notificarea nu a putut fi trimisa:", error);
      setSelectedBookingNotice(error instanceof Error ? error.message : "Notificarea nu a putut fi trimisa.");
    } finally {
      setNotifyingSelectedBooking(false);
    }
  }

  const {
    openPasswordModal,
    passwordDraft,
    passwordError,
    passwordMessage,
    passwordModal,
    savePasswordChange,
    sendPasswordReset,
    setPasswordDraft,
    setPasswordModal,
  } = usePasswordManagement({
    currentLocationId,
    isOnline,
    locationName,
    offlineMessage: offlineReadOnlyMessage,
    profile,
    recordAuditLog,
    setIsOnline,
    user,
  });
  const lockSessionKey = user ? `kelunia-unlocked:${user.uid}` : "";
  const pinLockEnabled = Boolean(user && profile?.usePin && profile.hasPin);

  function markAppUnlocked() {
    if (lockSessionKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(lockSessionKey, "1");
    }

    setAppLocked(false);
    setUnlockPin("");
    setUnlockError("");
    biometricPromptedRef.current = "";
  }

  function markAppLocked() {
    if (!pinLockEnabled || !lockSessionKey || typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(lockSessionKey);
    setAppLocked(true);
    setUnlockPin("");
    biometricPromptedRef.current = "";
  }

  async function confirmSignOut() {
    if (typeof window !== "undefined" && !window.confirm("Vrei sa iesi din cont?")) {
      return;
    }

    if (lockSessionKey && typeof window !== "undefined") {
      window.sessionStorage.removeItem(lockSessionKey);
    }

    setAppLocked(false);
    await signOut(auth);
  }

  async function unlockWithPin() {
    if (!user) {
      return;
    }

    setUnlockError("");

    if (!/^\d{4,8}$/.test(unlockPin)) {
      setUnlockError("PIN-ul trebuie sa aiba intre 4 si 8 cifre.");
      return;
    }

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const pinHash = String(userSnap.data()?.pinHash ?? "");
      const enteredHash = await hashPin(user.uid, unlockPin);

      if (!pinHash || enteredHash !== pinHash) {
        setUnlockError("PIN incorect.");
        return;
      }

      markAppUnlocked();
    } catch (error) {
      console.error("PIN-ul nu a putut fi verificat:", error);
      setUnlockError("PIN-ul nu a putut fi verificat. Incearca din nou.");
    }
  }

  async function unlockWithBiometrics() {
    if (!user || biometricWorking) {
      return;
    }

    setBiometricWorking(true);
    setUnlockError("");

    try {
      const unlocked = await verifyBiometricCredential(user.uid);

      if (unlocked) {
        markAppUnlocked();
        return;
      }

      setUnlockError("Deblocarea biometrica nu a mers. Foloseste PIN-ul.");
    } finally {
      setBiometricWorking(false);
    }
  }

  useEffect(() => {
    if (!pinLockEnabled || !lockSessionKey || typeof window === "undefined") {
      setAppLocked(false);
      setUnlockPin("");
      setUnlockError("");
      return;
    }

    setAppLocked(window.sessionStorage.getItem(lockSessionKey) !== "1");
  }, [lockSessionKey, pinLockEnabled]);

  useEffect(() => {
    if (!pinLockEnabled || !profile?.lockOnHide || typeof document === "undefined") {
      return;
    }

    let nativeListener: { remove: () => Promise<void> } | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markAppLocked();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", markAppLocked);
    void CapacitorApp.addListener("appStateChange", (state) => {
      if (!state.isActive) {
        markAppLocked();
      }
    })
      .then((listener) => {
        nativeListener = listener;
      })
      .catch(() => {
        nativeListener = null;
      });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", markAppLocked);
      void nativeListener?.remove();
    };
  }, [lockSessionKey, pinLockEnabled, profile?.lockOnHide]);

  useEffect(() => {
    let nativeListener: { remove: () => Promise<void> } | null = null;

    void LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const bookingId = String(event.notification?.extra?.bookingId ?? "");

      if (!bookingId || bookingId.startsWith("fixed:")) {
        return;
      }

      const booking = bookings.find((item) => item.id === bookingId);

      if (booking) {
        setSelectedBookingNotice("");
        setSelectedBooking(booking);
        setActiveView("calendar");
      }
    })
      .then((listener) => {
        nativeListener = listener;
      })
      .catch(() => {
        nativeListener = null;
      });

    return () => {
      void nativeListener?.remove();
    };
  }, [bookings, setActiveView]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const bookingId = new URLSearchParams(window.location.search).get("booking");

    if (!bookingId || bookingId.startsWith("fixed:")) {
      return;
    }

    const booking = bookings.find((item) => item.id === bookingId);

    if (!booking) {
      return;
    }

    setSelectedBookingNotice("");
    setSelectedBooking(booking);
    setActiveView("calendar");
    window.history.replaceState(null, "", "/dashboard");
  }, [bookings, setActiveView]);

  useEffect(() => {
    if (!user || !profile || typeof window === "undefined") {
      return;
    }

    void registerKeluniaPushToken(user, profile);
  }, [profile, user]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void listenKeluniaForegroundPush(async (payload: { data?: Record<string, string>; notification?: { body?: string; title?: string } }) => {
      const data = payload.data ?? {};
      const title = data.title || payload.notification?.title || "Kelunia";
      const body = data.body || payload.notification?.body || "";

      if (!("serviceWorker" in navigator) || !("Notification" in window) || Notification.permission !== "granted") {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        badge: "/icon-192.png",
        data: {
          bookingId: data.bookingId || "",
          url: data.url || "/dashboard",
        },
        icon: "/icon-192.png",
        requireInteraction: true,
        tag: data.tag || data.bookingId || "kelunia-notification",
      });
    }).then((nextUnsubscribe: () => void) => {
      if (cancelled) {
        nextUnsubscribe();
        return;
      }

      unsubscribe = nextUnsubscribe;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!appLocked || !profile?.useBiometrics || !user) {
      return;
    }

    const promptKey = `${user.uid}:${lockSessionKey}`;

    if (biometricPromptedRef.current === promptKey) {
      return;
    }

    biometricPromptedRef.current = promptKey;
    const timer = window.setTimeout(() => {
      void unlockWithBiometrics();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [appLocked, lockSessionKey, profile?.useBiometrics, user]);

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

    if (user) {
      clearBiometricCredential(user.uid);
    }

    setPendingPinHash(null);
  }

  function handleBiometricsToggle(checked: boolean) {
    if (!checked) {
      setPersonalDraft((current) => ({ ...current, useBiometrics: false }));
      if (user) {
        clearBiometricCredential(user.uid);
      }
      return;
    }

    openPinSetup("biometrics");
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

    const wantsBiometrics = pinIntent === "biometrics";
    const biometricReady = wantsBiometrics
      ? await registerBiometricCredential(user.uid, user.email ?? profile?.displayName ?? "Kelunia")
      : false;
    const pinHash = await hashPin(user.uid, pinDraft.pin);

    setPendingPinHash(pinHash);
    setPersonalDraft((current) => ({
      ...current,
      usePin: true,
      useBiometrics: wantsBiometrics ? biometricReady : current.useBiometrics,
    }));
    closePinSetup();

    if (wantsBiometrics && !biometricReady) {
      setSettingsError("Biometria nu este disponibila pe acest dispozitiv. PIN-ul ramane activ ca metoda de blocare.");
    }

    await savePersonalSettings({
      pinHash,
      usePin: true,
      useBiometrics: wantsBiometrics ? biometricReady : personalDraft.useBiometrics,
    });
  }

  async function savePersonalSettings(options?: { pinHash?: string; usePin?: boolean; useBiometrics?: boolean; language?: AppLanguage }) {
    if (!user) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    if (!requireOnline("settings")) {
      return;
    }

    if (!isSuperAdmin && !personalDraft.groupName.trim()) {
      setSettingsError("Alege un grup înainte să salvezi.");
      return;
    }

    const effectiveDraft = {
      ...personalDraft,
      usePin: options?.usePin ?? personalDraft.usePin,
      useBiometrics: options?.useBiometrics ?? personalDraft.useBiometrics,
      language: options?.language ?? personalDraft.language,
    };
    const effectivePinHash = options?.pinHash ?? pendingPinHash;
    const notificationOffsets = normalizeNotificationOffsetRules(effectiveDraft.notifyOffsets);
    const notificationOffsetDays = notificationOffsets
      .filter((offset) => offset.unit === "days")
      .map((offset) => offset.value);

    if ((effectiveDraft.usePin || effectiveDraft.useBiometrics) && !profile?.hasPin && !effectivePinHash) {
      openPinSetup(effectiveDraft.useBiometrics ? "biometrics" : "pin");
      return;
    }

    if (effectiveDraft.notifyGroupBookings) {
      if (notificationOffsets.length === 0) {
        setSettingsError("Alege cel puțin un moment pentru notificări.");
        return;
      }

      const notificationsAllowed = await requestKeluniaNotificationPermission();

      if (!notificationsAllowed) {
        setSettingsError("Notificările nu au fost permise pe acest dispozitiv.");
        return;
      }

      await registerKeluniaPushToken(user, profile);
    }

    const usePin = effectiveDraft.usePin || effectiveDraft.useBiometrics;
    const savedRoomAccess = isOwner || role === "manager" ? "all" : normalizeRoomAccessMode(profile?.roomAccess);
    const savedAllowedRoomIds = savedRoomAccess === "selected" ? normalizeAllowedRoomIds(profile?.allowedRoomIds) : [];
    const payload: Record<string, unknown> = {
      uid: user.uid,
      email: user.email,
      displayName: effectiveDraft.displayName,
      groupName: isOwner ? "" : effectiveDraft.groupName,
      group: isOwner ? "" : effectiveDraft.groupName,
      role,
      isOwner,
      locationId: isOwner ? "" : profile?.locationId ?? "main-location",
      locationName: isOwner ? defaultLocationName : profile?.locationName ?? locationName,
      accessCodeId: profile?.accessCodeId ?? "",
      roomAccess: savedRoomAccess,
      allowedRoomIds: savedAllowedRoomIds,
      pendingLicenseId: profile?.pendingLicenseId ?? "",
      pendingLicenseCode: "",
      locationSetupRequired: false,
      usePin,
      lockOnHide: usePin ? effectiveDraft.lockOnHide : false,
      useBiometrics: usePin ? effectiveDraft.useBiometrics : false,
      notifyGroupBookings: effectiveDraft.notifyGroupBookings,
      notifyFixedGroupSchedules: effectiveDraft.notifyGroupBookings ? effectiveDraft.notifyFixedGroupSchedules : false,
      notifyWeekBefore: effectiveDraft.notifyGroupBookings ? notificationOffsetDays.includes(7) : false,
      notifyDayBefore: effectiveDraft.notifyGroupBookings ? notificationOffsetDays.includes(1) : false,
      notifyOffsets: effectiveDraft.notifyGroupBookings ? notificationOffsets.map(notificationOffsetToKey) : [],
      notifyOffsetsDays: effectiveDraft.notifyGroupBookings ? notificationOffsetDays : [],
      language: effectiveDraft.language,
    };

    if (effectivePinHash) {
      payload.pinHash = effectivePinHash;
      payload.pinSet = true;
    }

    try {
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
    } catch (error) {
      console.error("Setările nu au putut fi salvate:", error);
      setSettingsError("Setările nu au putut fi salvate. Verifică regulile Firebase.");
      setSettingsMessage("");
      return;
    }

    setSettingsError("");
    setSettingsMessage("Setările au fost salvate.");
    void recordAuditLog("user", "update", user.uid, profile, payload, payload.locationId as string, payload.locationName as string);

    try {
      if (usePin) {
        markAppUnlocked();
      }
      setPendingPinHash(null);
    } catch (error) {
      console.warn("Setările au fost salvate, dar starea locală nu a putut fi actualizată:", error);
    }
  }

  async function saveRequiredGroup() {
    setGroupSetupError("");

    if (!requireOnline("group")) {
      return;
    }

    if (!user || !profile) {
      return;
    }

    if (!groupSetupDraft.trim()) {
      setGroupSetupError("Alege grupul din care faci parte.");
      return;
    }

    if (!currentLocationId) {
      setGroupSetupError("Contul nu are încă o locație asociată. Verifică dacă ai folosit codul corect.");
      return;
    }

    if (!groups.some((group) => group.name === groupSetupDraft)) {
      setGroupSetupError("Alege un grup existent în locația ta.");
      return;
    }

    const requiredRoomAccess = role === "manager" ? "all" : normalizeRoomAccessMode(profile.roomAccess);
    const requiredAllowedRoomIds = requiredRoomAccess === "selected" ? normalizeAllowedRoomIds(profile.allowedRoomIds) : [];

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
          roomAccess: requiredRoomAccess,
          allowedRoomIds: requiredAllowedRoomIds,
        },
        { merge: true }
      );
      await recordAuditLog(
        "user",
        "update",
        user.uid,
        profile,
        { groupName: groupSetupDraft, group: groupSetupDraft },
        profile.locationId,
        profile.locationName || locationName
      );
      setPersonalDraft((current) => ({ ...current, groupName: groupSetupDraft }));
      setGroupSetupCompleted(true);
    } catch (error) {
      console.error("Grupul nu a putut fi salvat:", error);
      setGroupSetupError("Grupul nu a putut fi salvat. Verifică regulile Firebase.");
    }
  }

  function openSpaceEditor(kind: SpaceKind, item?: RoomItem | GroupItem) {
    if (!canEditCurrentLocation) {
      return;
    }

    setSpaceEditor({
      kind,
      id: item?.id ?? null,
      name: item?.name ?? "",
      color: kind === "group" ? normalizeGroupColor((item as GroupItem | undefined)?.color) : "",
    });
    setSpaceError("");
    setSettingsError("");
    setSettingsMessage("");
  }

  async function saveSpaceItem() {
    if (!canEditCurrentLocation || !spaceEditor) {
      return;
    }

    if (!requireOnline("space")) {
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
      const previousItem = spaceEditor.id
        ? (spaceEditor.kind === "room" ? rooms : groups).find((item) => item.id === spaceEditor.id) ?? null
        : null;
      const payload = {
        name,
        locationId: currentLocationId,
        locationName,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
        ...(spaceEditor.kind === "group" ? { color: normalizeGroupColor(spaceEditor.color) } : {}),
      };

      if (spaceEditor.id) {
        await updateDoc(doc(db, collectionName, spaceEditor.id), payload);
        await recordAuditLog(spaceEditor.kind, "update", spaceEditor.id, previousItem, payload);
      } else {
        const createdPayload = {
          ...payload,
          createdBy: user?.email ?? "",
          createdAt: Timestamp.now(),
          deleted: false,
        };
        const created = await addDoc(collection(db, collectionName), createdPayload);
        await updateLocationCounterSafely(db, currentLocationId, spaceEditor.kind === "room" ? "roomCount" : "groupCount", 1);
        await recordAuditLog(spaceEditor.kind, "create", created.id, null, createdPayload);
      }

      setSpaceEditor(null);
      setSettingsMessage(
        spaceEditor.kind === "room"
          ? `Sala a fost ${spaceEditor.id ? "actualizată" : "adăugată"}.`
          : `Grupul a fost ${spaceEditor.id ? "actualizat" : "adăugat"}.`
      );
    } catch (error) {
      console.error(`${label} nu a putut fi salvată:`, error);
      setSpaceError("Firebase nu permite încă această modificare. Actualizează regulile Firestore pentru administrator.");
    }
  }

  async function removeSpaceItem(kind: SpaceKind, itemId: string) {
    const collectionName = kind === "room" ? "rooms" : "groups";
    const label = kind === "room" ? "această sală" : "acest grup";

    if (!canEditCurrentLocation || !requireOnline("settings") || !confirm(`Ștergi ${label}?`)) {
      return;
    }

    setSettingsError("");

    try {
      const previousItem = (kind === "room" ? rooms : groups).find((item) => item.id === itemId) ?? null;
      const deletedPayload = softDeletePayload();
      await updateDoc(doc(db, collectionName, itemId), deletedPayload);
      await updateLocationCounterSafely(db, currentLocationId, kind === "room" ? "roomCount" : "groupCount", -1);
      await recordAuditLog(kind, "delete", itemId, previousItem, previousItem ? { ...previousItem, ...deletedPayload } : deletedPayload);
      setSettingsMessage(kind === "room" ? "Sala a fost ștearsă." : "Grupul a fost șters.");
    } catch (error) {
      console.error("Elementul nu a putut fi șters:", error);
      setSettingsError("Firebase nu permite încă ștergerea. Actualizează regulile Firestore pentru administrator.");
    }
  }

  function openFixedManager() {
    if (!canEditCurrentLocation) {
      return;
    }

    setFixedDraft(emptyFixedDraft);
    setFixedEditingId(null);
    setShowFixedForm(false);
    setFixedError("");
    setShowFixedManager(true);
  }

  function startFixedAdd() {
    if (!canEditCurrentLocation) {
      return;
    }

    setFixedDraft(emptyFixedDraft);
    setFixedEditingId(null);
    setFixedError("");
    setShowFixedForm(true);
  }

  function startFixedEdit(item: FixedSchedule) {
    if (!canEditCurrentLocation) {
      return;
    }

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

  function closeFixedForm() {
    setShowFixedForm(false);
    setFixedEditingId(null);
    setFixedDraft(emptyFixedDraft);
    setFixedError("");
  }

  async function saveNavigationSettings() {
    if (!canEditCurrentLocation) {
      return;
    }

    if (!requireOnline("settings")) {
      return;
    }

    const title = fixedSectionDraft.trim();
    const listTitle = listViewDraft.trim();
    const resourcesTitle = resourcesSectionDraft.trim();
    const nextRoomsLabel = roomsLabelDraft.trim();
    const nextGroupsLabel = groupsLabelDraft.trim();

    if (!title) {
      setSettingsError("Scrie numele paginii de programări fixe.");
      return;
    }

    if (!listTitle) {
      setSettingsError("Scrie numele butonului pentru listă.");
      return;
    }

    if (!resourcesTitle || !nextRoomsLabel || !nextGroupsLabel) {
      setSettingsError("Completeaza numele pentru sectiunea de sali si grupuri.");
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    try {
      const beforeSettings = {
        fixedSectionTitle,
        fixedPageEnabled,
        listViewTitle,
        resourcesSectionTitle,
        roomsLabel,
        groupsLabel,
        locationId: currentLocationId,
        locationName,
      };
      const afterSettings = {
        fixedSectionTitle: title,
        fixedPageEnabled: fixedPageEnabledDraft,
        listViewTitle: listTitle,
        resourcesSectionTitle: resourcesTitle,
        roomsLabel: nextRoomsLabel,
        groupsLabel: nextGroupsLabel,
        locationId: currentLocationId,
        locationName,
        updatedBy: user?.email ?? "",
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, "settings", `calendar_${currentLocationId}`), afterSettings);
      await recordAuditLog("settings", "update", `calendar_${currentLocationId}`, beforeSettings, afterSettings);
      setSettingsMessage("Paginile au fost salvate.");
    } catch (error) {
      console.error("Paginile nu au putut fi salvate:", error);
      setSettingsError("Paginile nu au putut fi salvate. Verifică regulile Firebase.");
    }
  }

  async function saveFixedSchedule() {
    if (!canEditCurrentLocation) {
      return;
    }

    setFixedError("");

    if (!requireOnline("fixed")) {
      return;
    }

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
      const previousSchedule = fixedEditingId ? fixedSchedules.find((item) => item.id === fixedEditingId) ?? null : null;
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
        await recordAuditLog("fixedSchedule", "update", fixedEditingId, previousSchedule, payload);
      } else {
        const createdPayload = { ...payload, createdAt: Timestamp.now(), deleted: false };
        const created = await addDoc(collection(db, "fixedSchedules"), createdPayload);
        await updateLocationCounterSafely(db, currentLocationId, "fixedScheduleCount", 1);
        await recordAuditLog("fixedSchedule", "create", created.id, null, createdPayload);
      }

      setFixedDraft(emptyFixedDraft);
      setFixedEditingId(null);
      setShowFixedForm(false);
      setFixedError("");
      setSettingsMessage(fixedEditingId ? "Programul a fost actualizat." : "Programul a fost adăugat.");
    } catch (error) {
      console.error("Programul nu a putut fi salvat:", error);
      setFixedError("Firebase nu permite încă salvarea programului. Actualizează regulile Firestore pentru administrator.");
    }
  }

  async function removeFixedSchedule(itemId: string) {
    if (!canEditCurrentLocation || !requireOnline("fixed") || !confirm("Ștergi acest program?")) {
      return;
    }

    setFixedError("");

    try {
      const previousSchedule = fixedSchedules.find((item) => item.id === itemId) ?? null;
      const deletedPayload = softDeletePayload();
      await updateDoc(doc(db, "fixedSchedules", itemId), deletedPayload);
      await updateLocationCounterSafely(db, currentLocationId, "fixedScheduleCount", -1);
      await recordAuditLog("fixedSchedule", "delete", itemId, previousSchedule, previousSchedule ? { ...previousSchedule, ...deletedPayload } : deletedPayload);
      setSettingsMessage("Programul a fost șters.");
    } catch (error) {
      console.error("Programul nu a putut fi șters:", error);
      setFixedError("Firebase nu permite încă ștergerea programului.");
    }
  }

  async function updateManagedUserRole(managedUser: ManagedUser, nextRole: UserRole) {
    if (!canManageMembers || managedUser.isOwner || managedUser.locationId !== currentLocationId) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    if (!requireOnline("settings")) {
      return;
    }

    const otherSuperAdmins = managedUsers.filter(
      (item) =>
        item.locationId === currentLocationId &&
        item.role === "manager" &&
        !item.isOwner &&
        item.id !== managedUser.id
    ).length;

    if (nextRole === "manager" && otherSuperAdmins >= currentLocationManagerLimit) {
      setSettingsError(`Aceasta locatie poate avea maximum ${currentLocationManagerLimit} administratori.`);
      return;
    }

    try {
      const roomAccess = nextRole === "manager" ? "all" : managedUser.roomAccess;
      const allowedRoomIds = nextRole === "manager" || roomAccess === "all" ? [] : managedUser.allowedRoomIds;
      const updatedUser = {
        ...managedUser,
        role: nextRole,
        groupName: managedUser.groupName,
        roomAccess,
        allowedRoomIds,
      };
      await updateDoc(doc(db, "users", managedUser.id), {
        role: nextRole,
        groupName: managedUser.groupName,
        roomAccess,
        allowedRoomIds,
      });
      await recordAuditLog("user", "update", managedUser.id, managedUser, updatedUser, managedUser.locationId, managedUser.locationName || locationName);
      setSettingsMessage("Rolul a fost actualizat.");
    } catch (error) {
      console.error("Rolul nu a putut fi actualizat:", error);
      setSettingsError("Rolul nu a putut fi actualizat. Verifica regulile Firebase.");
    }
  }

  async function updateManagedUserRoomAccess(managedUser: ManagedUser, nextRoomAccess: RoomAccessMode, nextAllowedRoomIds: string[]) {
    if (!canManageMembers || managedUser.isOwner || managedUser.locationId !== currentLocationId) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    if (!requireOnline("settings")) {
      return;
    }

    const roomAccess = managedUser.role === "manager" ? "all" : normalizeRoomAccessMode(nextRoomAccess);
    const allowedRoomIds = roomAccess === "selected" ? normalizeAllowedRoomIds(nextAllowedRoomIds) : [];

    if (roomAccess === "selected" && allowedRoomIds.length === 0) {
      setSettingsError("Alege cel putin o sala sau lasa acces la toate salile.");
      return;
    }

    const validRoomIds = new Set(rooms.map((room) => room.id));

    if (allowedRoomIds.some((roomId) => !validRoomIds.has(roomId))) {
      setSettingsError("Una dintre salile alese nu mai exista.");
      return;
    }

    try {
      const updatedUser = {
        ...managedUser,
        roomAccess,
        allowedRoomIds,
      };
      await updateDoc(doc(db, "users", managedUser.id), {
        roomAccess,
        allowedRoomIds,
      });
      await recordAuditLog("user", "update", managedUser.id, managedUser, updatedUser, managedUser.locationId, managedUser.locationName || locationName);
      setSettingsMessage("Accesul la sali a fost actualizat.");
    } catch (error) {
      console.error("Accesul la sali nu a putut fi actualizat:", error);
      setSettingsError("Accesul la sali nu a putut fi actualizat. Verifica regulile Firebase.");
    }
  }

  async function removeManagedUser(managedUser: ManagedUser) {
    if (
      !canManageMembers ||
      managedUser.isOwner ||
      managedUser.locationId !== currentLocationId ||
      !requireOnline("settings") ||
      !confirm(`Stergi contul ${managedUser.email}?`)
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", managedUser.id));
      await recordAuditLog("user", "delete", managedUser.id, managedUser, null, managedUser.locationId, managedUser.locationName || locationName);
      setSettingsMessage("Contul a fost sters.");
    } catch (error) {
      console.error("Contul nu a putut fi sters:", error);
      setSettingsError("Contul nu a putut fi sters. Verifica regulile Firebase.");
    }
  }

  function openLocationEditor(item?: LocationItem) {
    if (!isOwner && !canEditCurrentLocation) {
      return;
    }

    setLocationEditor({
      id: item?.id ?? null,
      name: item?.name ?? "",
      plan: item?.plan ?? "",
      billingStatus: item?.billingStatus ?? "",
      durationDays: "",
    });
    setLocationError("");
    setSettingsMessage("");
    setSettingsError("");
  }

  async function saveLocation() {
    if ((!isOwner && !canEditCurrentLocation) || !locationEditor) {
      return;
    }

    if (!requireOnline("location")) {
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
        const previousLocation = locations.find((item) => item.id === locationEditor.id) ?? null;
        const updatedLocation: Record<string, unknown> = {
          name,
          updatedBy: user?.email ?? "",
          updatedAt: Timestamp.now(),
        };

        if (isOwner) {
          const selectedPlan = (locationEditor.plan || previousLocation?.plan || "standard") as LocationPlan;
          const selectedStatus = locationEditor.billingStatus || (selectedPlan === "trial" ? "trialing" : "active");
          updatedLocation.plan = selectedPlan;
          updatedLocation.billingStatus = selectedStatus;

          const durationText = locationEditor.durationDays.trim();

          if (durationText) {
            const durationDays = Number.parseInt(durationText, 10);

            if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3660) {
              setLocationError("Valabilitatea trebuie sa fie intre 1 si 3660 zile.");
              return;
            }

            const expiresAt = Timestamp.fromDate(new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000));

            if (selectedStatus === "trialing") {
              updatedLocation.trialEndsAt = expiresAt;
              updatedLocation.subscriptionExpiresAt = null;
            } else {
              updatedLocation.subscriptionExpiresAt = expiresAt;
              updatedLocation.trialEndsAt = null;
            }
          }
        }

        await updateDoc(doc(db, "locations", locationEditor.id), updatedLocation);
        await recordAuditLog("location", "update", locationEditor.id, previousLocation, updatedLocation, locationEditor.id, name);
      } else {
        const createdPayload = {
          name,
          ownerEmail: user?.email ?? "",
          createdBy: user?.email ?? "",
          createdAt: Timestamp.now(),
          deleted: false,
          ...initialLocationBillingFields(),
        };
        const created = await addDoc(collection(db, "locations"), createdPayload);
        await recordAuditLog("location", "create", created.id, null, createdPayload, created.id, name);
        setActiveLocationId(created.id);
      }

      setLocationEditor(null);
      setSettingsMessage(locationEditor.id ? "Locația a fost actualizată." : "Locația a fost adăugată.");
    } catch (error) {
      console.error("Locația nu a putut fi salvată:", error);
      setLocationError("Locația nu a putut fi salvată. Verifică regulile Firebase.");
    }
  }

  const editableCodeLocations = currentLocation
    ? [currentLocation]
    : [{ id: currentLocationId, name: locationName, ownerEmail: "", address: "", placeId: "" }];
  const appLockOverlay = appLocked ? (
    <AppLockModal
      biometricEnabled={Boolean(profile?.useBiometrics)}
      biometricWorking={biometricWorking}
      error={unlockError}
      pin={unlockPin}
      onBiometricUnlock={unlockWithBiometrics}
      onPinChange={setUnlockPin}
      onSignOut={confirmSignOut}
      onUnlock={unlockWithPin}
    />
  ) : null;

  if (needsLocationSetup) {
    return (
      <>
        <LocationSetupView
          address={locationSetupAddress}
          addressInputRef={locationSetupAddressInputRef}
          displayName={profile?.displayName || user?.email || "Administrator"}
          error={locationSetupError}
          isLoading={locationSetupLoading}
          isOnline={isOnline}
          mapsStatus={mapsStatus}
          name={locationSetupName}
          offlineMessage={offlineReadOnlyMessage}
          onAddressChange={handleLocationSetupAddressChange}
          onNameChange={setLocationSetupName}
          onSignOut={confirmSignOut}
          onSubmit={openLicensedLocation}
        />
        {appLockOverlay}
      </>
    );
  }
  if (mustChooseGroup) {
    return (
      <>
        <RequiredGroupSetupView
          error={groupSetupError}
          groups={groups}
          groupsLoaded={groupsLoaded}
          groupsReadError={groupsReadError}
          isOnline={isOnline}
          locationName={locationName || defaultLocationName}
          offlineMessage={offlineReadOnlyMessage}
          onGroupChange={setGroupSetupDraft}
          onSave={saveRequiredGroup}
          onSignOut={confirmSignOut}
          selectedGroup={groupSetupDraft}
          userLabel={`${profile?.displayName || user?.email} - ${appRoleLabel(profile, role, language)}`}
        />
        {appLockOverlay}
      </>
    );
  }

  const navigationItems: Array<[AppView, string]> = [
    ...(currentLocationId && fixedPageEnabled ? [["fixed", fixedSectionTitle] as [AppView, string]] : []),
    ...(currentLocationId ? [
      ["calendar", appText(language, "nav.calendar")] as [AppView, string],
      ["list", listViewTitle] as [AppView, string],
    ] : []),
    ["settings", appText(language, "nav.settings")],
  ];

  const swipeViews = navigationItems.map(([view]) => view);

  function navigateBySwipe(delta: -1 | 1) {
    const currentIndex = swipeViews.indexOf(displayedView);

    if (currentIndex === -1) {
      return;
    }

    const nextView = swipeViews[currentIndex + delta];

    if (nextView) {
      setActiveView(nextView);
    }
  }

  function handleSwipeStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || isInteractiveSwipeTarget(event.target)) {
      swipeStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleSwipeEnd(event: TouchEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start || event.changedTouches.length !== 1) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 64 || absX < absY * 1.35) {
      return;
    }

    event.preventDefault();
    navigateBySwipe(deltaX < 0 ? 1 : -1);
  }

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <img src="/icon-192.png" alt="Kelunia" />
        </div>
        <h1>Kelunia</h1>
        <p>{appText(language, "loading.generic")}</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="kelunia-shell">
      <KeluniaShellChrome
        displayedView={displayedView}
        headerTitle={headerTitle}
        isOnline={isOnline}
        isSignedIn={Boolean(user)}
        licenseMessage={licenseAccess.message}
        language={language}
        navigationItems={navigationItems}
        offlineMessage={offlineReadOnlyMessage}
        showLicenseWarning={Boolean(user && currentLocationId && licenseAccess.isReadOnly)}
        userLabel={profile ? `${profile.displayName} · ${appRoleLabel(profile, role, language)}` : undefined}
        onNavigate={setActiveView}
        onSignOut={confirmSignOut}
      />

      <div
        className="swipe-page-region"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
        onTouchCancel={() => {
          swipeStartRef.current = null;
        }}
      >
      {displayedView === "fixed" && (
        <FixedSchedulesView
          fixedSectionTitle={fixedSectionTitle}
          fixedSchedules={visibleFixedSchedulesByRoomAccess}
          groups={groups}
          dayLabels={dayLabels}
          canEditCurrentLocation={canEditCurrentLocation}
          profileGroupName={profile?.groupName}
          onOpenFixedManager={openFixedManager}
        />
      )}

      {displayedView === "calendar" && (
        <section className="workspace-panel calendar-panel">
          <CalendarToolbar
              periodTitle={periodTitle}
              calendarMode={calendarMode}
              canManageBookings={canManageBookings}
              isOnline={isOnline}
              language={language}
              onCreateBooking={() => openCreateForm(dateKey(currentDate))}
              onMovePeriod={movePeriod}
              onToday={() => setCurrentDate(new Date())}
              onCalendarModeChange={setCalendarMode}
            />

          {calendarMode === "month" ? (
            <MonthView
              shortDayLabels={shortDayLabels}
              monthCells={monthCells}
              today={today}
              bookings={visibleBookingsByRoomAccess}
              groups={groups}
              canManageBookings={canManageBookings}
              isOnline={isOnline}
              profileGroupName={profile?.groupName}
              onDateSelect={openDayBookings}
              onCreateBooking={openCreateForm}
              onSelectBooking={setSelectedBooking}
            />
          ) :
            calendarMode === "week" ? (
            <WeekView
              activePeriodDays={activePeriodDays}
              bookings={visibleBookingsByRoomAccess}
              groups={groups}
              canManageBookings={canManageBookings}
              isOnline={isOnline}
              profileGroupName={profile?.groupName}
              onCreateBooking={openCreateForm}
              onDateSelect={openDayBookings}
              onSelectBooking={setSelectedBooking}
            />
          ) : (
            <DayView
              activePeriodDays={activePeriodDays}
              bookings={visibleBookingsByRoomAccess}
              groups={groups}
              canManageBookings={canManageBookings}
              isOnline={isOnline}
              profileGroupName={profile?.groupName}
              onCreateBooking={openCreateForm}
              onDateSelect={openDayBookings}
              onSelectBooking={setSelectedBooking}
            />
          )}
        </section>
      )}

      {displayedView === "list" && (
      <ListView
        listViewTitle={listViewTitle}
        listBookings={listBookings}
        visibleListBookings={visibleListBookings}
        groups={groups}
        reachedBookingsQueryLimit={reachedBookingsQueryLimit}
        listPageSize={listPageSize}
        listPage={listPage}
        totalListPages={totalListPages}
        listFilter={listFilter}
        sortDirection={sortDirection}
        isOwner={isOwner}
        isSuperAdmin={isSuperAdmin}
        currentLocationId={currentLocationId}
        profileGroupName={profile?.groupName}
        language={language}
        onListFilterChange={setListFilter}
        onSortDirectionChange={setSortDirection}
        onOpenAuditHistory={openAuditHistory}
        onSelectBooking={setSelectedBooking}
        onEditBooking={openEditForm}
        onRemoveBooking={removeBooking}
        canEditBooking={canEditBooking}
        onPageChange={setListPage}
        />
      )}

      {displayedView === "settings" && (
      <SettingsView
        settingsError={settingsError}
        settingsMessage={settingsMessage}
        userExists={Boolean(user)}
        isOwner={isOwner}
        isSuperAdmin={isSuperAdmin}
        canEditCurrentLocation={canEditCurrentLocation}
        canManageAccessCodes={canManageAccessCodes}
        canManageMembers={canManageMembers}
        currentLocationId={currentLocationId}
        personalDraft={personalDraft}
        setPersonalDraft={setPersonalDraft}
        groups={groups}
        fixedPageEnabledDraft={fixedPageEnabledDraft}
        setFixedPageEnabledDraft={setFixedPageEnabledDraft}
        fixedSectionDraft={fixedSectionDraft}
        setFixedSectionDraft={setFixedSectionDraft}
        defaultFixedSectionTitle={defaultFixedSectionTitle}
        listViewDraft={listViewDraft}
        setListViewDraft={setListViewDraft}
        resourcesSectionDraft={resourcesSectionDraft}
        setResourcesSectionDraft={setResourcesSectionDraft}
        defaultResourcesSectionTitle={defaultResourcesSectionTitle}
        roomsLabelDraft={roomsLabelDraft}
        setRoomsLabelDraft={setRoomsLabelDraft}
        defaultRoomsLabel={defaultRoomsLabel}
        groupsLabelDraft={groupsLabelDraft}
        setGroupsLabelDraft={setGroupsLabelDraft}
        defaultGroupsLabel={defaultGroupsLabel}
        licenseAccess={licenseAccess}
        currentLocationCodeCount={currentLocationCodeCount}
        licenseCodeCount={licenseCodes.length}
        currentLocationManagerAccountCount={currentLocationSuperAdminCount}
        currentLocationManagerLimit={currentLocationManagerLimit}
        communityApplications={communityApplications}
        communityApplicationsError={communityApplicationsError}
        newsletterSubscribers={newsletterSubscribers}
        newsletterCampaigns={newsletterCampaigns}
        newsletterError={newsletterError}
        locations={locations}
        rooms={rooms}
        visibleManagedUsers={visibleManagedUsers}
        onSavePersonalSettings={savePersonalSettings}
        onOpenPasswordModal={openPasswordModal}
        onHandlePinToggle={handlePinToggle}
        onHandleBiometricsToggle={handleBiometricsToggle}
        onSaveNavigationSettings={saveNavigationSettings}
        onSelectLocation={(locationId) => setActiveLocationId(locationId)}
        onOpenLocationEditor={openLocationEditor}
        onOpenCodesEditor={openCodesEditor}
        onOpenLicenseCodes={openLicenseCodes}
        onOpenSpaceEditor={openSpaceEditor}
        onRemoveSpaceItem={removeSpaceItem}
        onUpdateManagedUserRole={updateManagedUserRole}
        onUpdateManagedUserRoomAccess={updateManagedUserRoomAccess}
        onRemoveManagedUser={removeManagedUser}
        onMarkCommunityApplicationReviewed={markCommunityApplicationReviewed}
        onSendCommunityApplicationReply={sendCommunityApplicationReply}
        onUpdateCommunityApplicationStatus={updateCommunityApplicationStatus}
        onSendNewsletterCampaign={sendNewsletterCampaign}
        onEnableOwnerNotifications={enableOwnerNotifications}
        />
      )}
      </div>

      <AuditHistoryModal
        open={showAuditModal}
        auditLogs={auditLogs}
        auditLoading={auditLoading}
        auditError={auditError}
        onClose={() => setShowAuditModal(false)}
        onReload={loadAuditLogs}
      />

      <PasswordModal
        open={passwordModal}
        passwordDraft={passwordDraft}
        passwordError={passwordError}
        passwordMessage={passwordMessage}
        onClose={() => setPasswordModal(false)}
        onChange={setPasswordDraft}
        onSave={savePasswordChange}
        onReset={sendPasswordReset}
      />

      <AccessCodesModal
        open={showCodesModal}
        codeGenerator={codeGenerator}
        groups={groups}
        rooms={rooms}
        editableCodeLocations={editableCodeLocations}
        accessCodes={accessCodes}
        codesWorking={codesWorking}
        codesError={codesError}
        codesMessage={codesMessage}
        inviteDraft={inviteDraft}
        onClose={() => setShowCodesModal(false)}
        onCodeGeneratorChange={setCodeGenerator}
        onInviteDraftChange={setInviteDraft}
        onGenerate={generateLocationCode}
        onUpdateDetails={updateAccessCodeDetails}
        onCopy={copyAccessCode}
        onToggleActive={toggleAccessCodeActive}
        onRemove={removeAccessCode}
        accessCodeUsageLabel={accessCodeUsageLabel}
        isAccessCodeFull={isAccessCodeFull}
        onCopyInviteLink={copyInviteLink}
        onSendInvite={sendAccessInvite}
        onSendInviteEmail={sendInviteEmailFromModal}
      />

      <LicenseCodesModal
        open={showLicenseModal}
        draft={licenseDraft}
        licenseCodes={licenseCodes}
        licenseEmailRequests={licenseEmailRequests}
        locations={locations}
        error={licenseError}
        message={licenseMessage}
        working={licenseWorking}
        onChange={updateLicenseDraft}
        onClose={() => setShowLicenseModal(false)}
        onCopy={copyLicenseCode}
        onGenerate={createLicenseCode}
        onSendEmail={sendLicenseEmail}
        onToggleActive={toggleLicenseCodeActive}
        onUpdate={updateLicenseCode}
        onRemove={deleteLicenseCode}
      />

      <LocationEditorModal
        isOwner={isOwner}
        locationEditor={locationEditor}
        locationError={locationError}
        onClose={() => setLocationEditor(null)}
        onChange={setLocationEditor}
        onSave={saveLocation}
      />

      <PinSetupModal
        pinIntent={pinIntent}
        pinDraft={pinDraft}
        pinError={pinError}
        onClose={closePinSetup}
        onChange={setPinDraft}
        onSave={confirmPinSetup}
      />

      <SpaceEditorModal
        spaceEditor={spaceEditor}
        spaceError={spaceError}
        groupLabel={groupsLabel}
        roomLabel={roomsLabel}
        onClose={() => setSpaceEditor(null)}
        onChange={setSpaceEditor}
        onSave={saveSpaceItem}
      />

      <FixedSchedulesManagerModal
        open={showFixedManager}
        fixedSectionTitle={fixedSectionTitle}
        fixedSchedules={fixedSchedules}
        groups={groups}
        fixedError={showFixedForm ? "" : fixedError}
        profileGroupName={profile?.groupName}
        language={language}
        onClose={() => setShowFixedManager(false)}
        onAdd={startFixedAdd}
        onEdit={startFixedEdit}
        onRemove={removeFixedSchedule}
      />

      <FixedScheduleModal
        open={showFixedForm}
        editingId={fixedEditingId}
        draft={fixedDraft}
        dayLabels={dayLabels}
        groups={groups}
        rooms={rooms}
        groupsLabel={groupsLabel}
        roomsLabel={roomsLabel}
        language={language}
        error={fixedError}
        onChange={setFixedDraft}
        onClose={closeFixedForm}
        onSave={saveFixedSchedule}
      />

      <BookingModal
        open={showBookingModal}
        editingId={editingId}
        formData={formData}
        groups={groups}
        managedUsers={visibleManagedUsers}
        rooms={accessibleRooms}
        groupsLabel={groupsLabel}
        roomsLabel={roomsLabel}
        language={language}
        error={formError}
        onChange={setFormData}
        onClose={() => setShowBookingModal(false)}
        onSubmit={handleBookingSubmit}
      />

      <DayBookingsModal
        date={selectedDay}
        bookings={selectedDayBookings}
        groups={groups}
        canCreate={canManageBookings && isOnline}
        profileGroupName={profile?.groupName}
        language={language}
        onAdd={createBookingFromDayModal}
        onClose={() => setSelectedDay(null)}
        onSelectBooking={selectBookingFromDayModal}
      />

      <BookingDetailsModal
        booking={selectedBooking}
        groups={groups}
        profileGroupName={profile?.groupName}
        language={language}
        canEdit={selectedBooking ? canEditBooking(selectedBooking) : false}
        canCreate={canManageBookings && isOnline}
        onAdd={createBookingFromSelectedBooking}
        notificationBusy={notifyingSelectedBooking}
        notificationMessage={selectedBookingNotice}
        onClose={() => {
          setSelectedBooking(null);
          setSelectedBookingNotice("");
        }}
        onEdit={() => {
          if (selectedBooking) {
            setSelectedBookingNotice("");
            openEditForm(selectedBooking);
          }
        }}
        onDelete={() => {
          if (selectedBooking) {
            removeBooking(selectedBooking);
          }
        }}
        onNotify={notifySelectedBookingNow}
      />
      {appLockOverlay}
    </main>
  );
}
