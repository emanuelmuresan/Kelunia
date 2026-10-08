"use client";

// Pagina principală după autentificare: orchestrează toate hook-urile din features/ și alege ce ecran se vede
// (calendar, listă, program fix, setări), plus ferestrele modale și blocarea aplicației.
// Logica propriu-zisă stă în hook-uri; aici doar se leagă între ele și se pasează către vederi.
import { useAppText } from "@/features/shell/hooks/useAppText";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, cloudFunctions, db } from "@/lib/firebase";
import { useAuth, type AppLanguage } from "@/context/AuthContext";
import { AccessCodesModal } from "@/features/access-codes/components/AccessCodesModal";
import { useAccessCodeGroupSync } from "@/features/access-codes/hooks/useAccessCodeGroupSync";
import { useAccessCodes } from "@/features/access-codes/hooks/useAccessCodes";
import { BookingModal } from "@/features/bookings/components/BookingModal";
import { DayBookingsModal } from "@/features/bookings/components/DayBookingsModal";
import { FixedScheduleModal } from "@/features/fixed-schedules/components/FixedScheduleModal";
import { KeluniaShellChrome } from "@/features/shell/components/KeluniaShellChrome";
import { ErrorBoundary } from "@/features/shell/components/ErrorBoundary";
import { ToastStack } from "@/features/shell/components/ToastStack";
import { useToasts } from "@/features/shell/hooks/useToasts";
import {
  accessCodeExpiryLabel,
  accessCodeUsageLabel,
  isAccessCodeExpired,
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
  shortDayLabels,
} from "@/lib/config/app";
import { addDays, dateKey, parseDateKey } from "@/lib/dates";
import {
  normalizeNotificationOffsetRules,
  normalizeNotificationOffsets,
  notificationOffsetToKey,
  requestKeluniaNotificationPermission,
} from "@/lib/notifications";
import { can } from "@/lib/permissions/capabilities";
import { bookingQueryWindow } from "@/lib/queries/bookings";
import { bookingMatchesRoomAccess, filterRoomsByAccess } from "@/lib/room-access";
import { bookingsForDay } from "@/lib/scheduling";
import { registerBiometricCredential } from "@/lib/security";
import type {
  AppView,
  Booking,
  CalendarMode,
  ListFilter,
  SortDirection,
  WriteTarget,
} from "@/lib/types/domain";
import { MonthView } from "@/features/calendar/views/MonthView";
import { WeekView } from "@/features/calendar/views/WeekView";
import { YearView } from "@/features/calendar/views/YearView";
import { UpcomingTicker } from "@/features/calendar/components/UpcomingTicker";
import { useUpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";
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
import { hasKeluniaPushConfig, registerKeluniaPushToken } from "@/lib/push-notifications";
import { useLocationResources } from "@/features/resources/hooks/useLocationResources";
import { useSpaceEditor } from "@/features/resources/hooks/useSpaceEditor";
import { useFixedScheduleEditor } from "@/features/fixed-schedules/hooks/useFixedScheduleEditor";
import { useCalendarSwipe } from "@/features/calendar/hooks/useCalendarSwipe";
import { useManagedUserActions } from "@/features/users/hooks/useManagedUserActions";
import { useLocationEditor } from "@/features/locations/hooks/useLocationEditor";
import { useAppLock } from "@/features/security/hooks/useAppLock";
import { dateLocales } from "@/lib/date-locales";
import { appText } from "@/lib/i18n/app-copy-catalog";
import { AppLockModal } from "@/features/security/components/AppLockModal";
import { useCalendarSettings } from "@/features/settings/hooks/useCalendarSettings";
import { usePasswordManagement } from "@/features/settings/hooks/usePasswordManagement";
import { useManagedLocationUsers } from "@/features/users/hooks/useManagedLocationUsers";
import { useErrorReports } from "@/features/settings/hooks/useErrorReports";
import { useOwnerLandingNotifications } from "@/features/notifications/hooks/useOwnerLandingNotifications";
import { useKeluniaPushBridge } from "@/features/notifications/hooks/useKeluniaPushBridge";
import { useBookingDeepLink } from "@/features/bookings/hooks/useBookingDeepLink";
import { useRequiredGroupSetup } from "@/features/groups/hooks/useRequiredGroupSetup";
import { useDashboardViewSync } from "@/features/dashboard/hooks/useDashboardViewSync";

// Cheia Google Maps (pentru căutarea adresei la configurarea locației).
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Componenta paginii dashboard.
export default function KeluniaPage() {
  // Utilizatorul curent, profilul lui din Firestore și rolurile derivate (manager, proprietar, super-admin).
  const { user, profile, role, isSuperAdmin, isOwner, loading: authLoading, updateProfile, profileError, reloadProfile } = useAuth();
  const router = useRouter();
  const language = profile?.language ?? "ro";

  // Starea de navigare: ecranul activ, modul calendarului, data curentă, locația aleasă, filtrul și sortarea listei.
  const [activeView, setActiveView] = useState<AppView>("calendar");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeLocationId, setActiveLocationId] = useState("");
  // Locația nou creată de proprietar, pentru care se deschide imediat invitația administratorului.
  const [pendingInviteLocationId, setPendingInviteLocationId] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("future");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Selecții și erori pentru ferestrele deschise (rezervare, zi, setări).
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [notifyingSelectedBooking, setNotifyingSelectedBooking] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState("");


  // Ciorna setărilor personale; se resetează din profil și se salvează cu „Salvează”.
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
  // Starea rețelei, setările benzii de evenimente viitoare, toast-urile și textele traduse.
  const [groupSetupError, setGroupSetupError] = useState("");
  const { isOnline, setIsOnline } = useOnlineStatus();
  const { tickerSettings, updateTickerSettings } = useUpcomingTickerSettings();
  const { toasts, pushToast, dismissToast } = useToasts();
  const msg = useAppText();
  const offlineReadOnlyMessage = msg("msg.offline");
  // Notificările mici (toast) pentru confirmări; erorile rămân afișate în fereastra respectivă.
  const setSelectedBookingNotice = useCallback(
    (value: string) => {
      if (value) {
        pushToast({ message: value });
      }
    },
    [pushToast]
  );
  // Success confirmations are transient toasts everywhere; errors stay inline.
  const setSettingsMessage = useCallback(
    (value: string) => {
      if (value) {
        pushToast({ message: value });
      }
    },
    [pushToast]
  );

  // Utilizatorii neverificați sau deconectați sunt trimiși la pagina de login.
  useEffect(() => {
    if (!authLoading && user && !user.emailVerified) {
      void signOut(auth).finally(() => router.replace("/login"));
      return;
    }

    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  // Locația curentă și accesul la licență, în funcție de rol.
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
  // Proprietarul fără locație aleasă vede doar setările.
  const displayedView: AppView = isOwner && !currentLocationId ? "settings" : activeView;
  // Contextul de permisiuni; din el rezultă ce are voie să facă utilizatorul în locația curentă.
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
  // Cererile din comunitate și newsletter-ul: doar pentru proprietar.
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
  // Rezervările din fereastra vizibilă (lună/săptămână/listă) și resursele locației: grupuri, camere, programe fixe.
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
    selectableGroups,
    selectableRooms,
  } = useLocationResources({
    userExists: Boolean(user),
    locationId: currentLocationId,
  });
  // Filtrare după accesul la camere: managerul și proprietarul văd tot, ceilalți doar camerele permise.
  const hasFullRoomAccess = isOwner || role === "manager";
  const accessibleRooms = useMemo(
    () => filterRoomsByAccess(rooms, profile, hasFullRoomAccess),
    [hasFullRoomAccess, profile, rooms]
  );
  const selectableAccessibleRooms = useMemo(
    () => filterRoomsByAccess(selectableRooms, profile, hasFullRoomAccess),
    [hasFullRoomAccess, profile, selectableRooms]
  );
  const visibleBookingsByRoomAccess = useMemo(
    () => bookings.filter((booking) => bookingMatchesRoomAccess(booking, rooms, profile, hasFullRoomAccess)),
    [bookings, hasFullRoomAccess, profile, rooms]
  );
  // Banda de evenimente privește înainte de azi, indiferent de luna afișată, deci are propria fereastră de rezervări.
  // The band looks ahead from today regardless of which month/week the calendar
  // is showing, so it needs its own bookings window.
  const tickerEndDate = dateKey(addDays(new Date(), tickerSettings.leadDays));
  const { bookings: tickerWindowBookings } = useBookings({
    userExists: Boolean(user) && tickerSettings.enabled,
    locationId: currentLocationId,
    startDate: today,
    endDate: tickerEndDate,
  });
  const tickerBookings = useMemo(
    () => tickerWindowBookings.filter((booking) => bookingMatchesRoomAccess(booking, rooms, profile, hasFullRoomAccess)),
    [hasFullRoomAccess, profile, rooms, tickerWindowBookings]
  );
  const tickerActive = tickerSettings.enabled;
  // Programele fixe vizibile după accesul la camere.
  const visibleFixedSchedulesByRoomAccess = useMemo(() => {
    if (hasFullRoomAccess) {
      return fixedSchedules;
    }

    const allowedRoomNames = new Set(accessibleRooms.map((room) => room.name));
    return fixedSchedules.filter((schedule) => allowedRoomNames.has(schedule.room));
  }, [accessibleRooms, fixedSchedules, hasFullRoomAccess]);
  // Lista de rezervări: filtrare, sortare și paginare.
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
  // Jurnalul de audit și acțiunea de a înregistra modificări.
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
  // Setările de navigare ale locației: numele paginilor, vizibilitatea listei și a programului fix, etichetele.
  const {
    fixedPageEnabled,
    fixedPageEnabledDraft,
    listPageEnabled,
    listPageEnabledDraft,
    setListPageEnabledDraft,
    fixedSectionDraft,
    fixedSectionTitle,
    groupsLabel,
    groupsLabelDraft,
    listViewDraft,
    listViewTitle,
    resourcesSectionDraft,
    roomsLabel,
    roomsLabelDraft,
    setFixedPageEnabledDraft,
    setFixedSectionDraft,
    setGroupsLabelDraft,
    setListViewDraft,
    setResourcesSectionDraft,
    setRoomsLabelDraft,
    saveNavigationSettings,
  } = useCalendarSettings({
    userExists: Boolean(user),
    locationId: currentLocationId,
    locationName,
    user,
    canEditCurrentLocation,
    requireOnline,
    recordAuditLog,
    setSettingsError,
    setSettingsMessage,
  });
  // Utilizatorii și codurile de acces ale locației (doar pentru manageri) și rapoartele de erori (doar proprietar).
  const { accessCodes, managedUsers } = useManagedLocationUsers({
    isManager: isSuperAdmin || isOwner,
    locationId: currentLocationId,
  });
  const { errorReports, errorReportsError, resolveReport } = useErrorReports({
    db,
    user,
    enabled: Boolean(user && isOwner),
  });

  // Notificări locale pentru rezervările grupului.
  useGroupBookingNotifications({ bookings: visibleBookingsByRoomAccess, fixedSchedules, profile, user });
  // Calendarul: celulele lunii, lunile anului, schimbarea perioadei și titlul ei.
  const {
    activePeriodDays,
    monthCells,
    yearMonths,
    movePeriod,
    periodTitle,
  } = useCalendar({
    calendarMode,
    currentDate,
    setCurrentDate,
  });

  // Afișează mesajul „offline” în fereastra potrivită scrierii încercate.
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

  // Blochează scrierile când nu există conexiune și afișează mesajul potrivit.
  function requireOnline(target: WriteTarget = "settings") {
    const connected = typeof navigator === "undefined" ? isOnline : navigator.onLine;

    if (connected) {
      return true;
    }

    setIsOnline(false);
    showOfflineError(target);
    return false;
  }

  // Câmpurile comune pentru ștergerea logică (soft-delete): nu se șterg date, doar se marchează ca șterse.
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

  // Alegerea obligatorie a grupului pentru utilizatorii care nu au unul.
  const {
    groupSetupDraft,
    setGroupSetupDraft,
    setGroupSetupCompleted,
    mustChooseGroup,
    saveRequiredGroup,
  } = useRequiredGroupSetup({
    db,
    user,
    profile,
    role,
    isSuperAdmin,
    groups: selectableGroups,
    currentLocationId,
    locationName,
    requireOnline,
    recordAuditLog,
    setPersonalDraft,
    setGroupSetupError,
  });

  // Sincronizează grupul din codul de acces cu profilul utilizatorului.
  useAccessCodeGroupSync({
    isManager: isSuperAdmin,
    isOnline,
    profile,
    setGroupSetupCompleted,
    setGroupSetupDraft,
    setPersonalDraft,
    user,
  });

  // Configurarea primei locații (nume, adresă, hartă) pentru conturile noi de manager.
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

  // Editorul de camere/grupuri (spații).
  const {
    spaceEditor,
    spaceError,
    setSpaceEditor,
    setSpaceError,
    openSpaceEditor,
    saveSpaceItem,
    removeSpaceItem,
  } = useSpaceEditor({
    pushToast,
    db,
    user,
    rooms,
    groups,
    currentLocationId,
    locationName,
    canEditCurrentLocation,
    requireOnline,
    softDeletePayload,
    recordAuditLog,
    setSettingsError,
    setSettingsMessage,
  });

  // Editorul programelor fixe.
  const {
    showFixedManager,
    showFixedForm,
    fixedEditingId,
    fixedDraft,
    fixedError,
    setShowFixedManager,
    setFixedDraft,
    setFixedError,
    openFixedManager,
    startFixedAdd,
    startFixedEdit,
    closeFixedForm,
    saveFixedSchedule,
    removeFixedSchedule,
  } = useFixedScheduleEditor({
    pushToast,
    db,
    user,
    fixedSchedules,
    currentLocationId,
    locationName,
    canEditCurrentLocation,
    requireOnline,
    softDeletePayload,
    recordAuditLog,
    setSettingsMessage,
  });

  // Elementele de navigare; calendarul rămâne mereu, lista și programul fix pot fi ascunse.
  const navigationItems: Array<[AppView, string]> = [
    ...(currentLocationId && fixedPageEnabled ? [["fixed", fixedSectionTitle] as [AppView, string]] : []),
    ...(currentLocationId ? [["calendar", appText(language, "nav.calendar")] as [AppView, string]] : []),
    ...(currentLocationId && listPageEnabled ? [["list", listViewTitle] as [AppView, string]] : []),
    ["settings", appText(language, "nav.settings")],
  ];
  // Glisarea laterală între pagini pe telefon.
  const swipeViews = navigationItems.map(([view]) => view);
  const { handleSwipeStart, handleSwipeEnd, clearSwipe } = useCalendarSwipe({
    swipeViews,
    displayedView,
    setActiveView,
  });

  // Menține sincronizate ecranul activ, locația aleasă și configurarea locației.
  useDashboardViewSync({
    profile,
    isOwner,
    needsLocationSetup,
    activeLocationId,
    setActiveLocationId,
    locations,
    setLocationSetupName,
    activeView,
    setActiveView,
    fixedPageEnabled,
    listPageEnabled,
    currentLocationId,
  });

  // Când se schimbă profilul, ciorna setărilor personale se reconstruiește din el (inclusiv momentele de notificare).
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
  }, [profile, setGroupSetupDraft]);

  // Utilizatorii gestionați din locația curentă și limita de manageri a planului.
  const visibleManagedUsers = useMemo(
    () => managedUsers.filter((managedUser) => managedUser.locationId === currentLocationId),
    [currentLocationId, managedUsers]
  );
  const currentLocationSuperAdminCount = useMemo(
    () => visibleManagedUsers.filter((managedUser) => managedUser.role === "manager" && !managedUser.isOwner).length,
    [visibleManagedUsers]
  );
  const currentLocationManagerLimit = currentLocation?.planLimits?.maxManagers ?? 2;

  // Acțiuni asupra utilizatorilor: schimbarea rolului, accesul la camere, eliminarea.
  const { updateManagedUserRole, updateManagedUserRoomAccess, removeManagedUser } = useManagedUserActions({
    db,
    managedUsers,
    rooms,
    currentLocationId,
    locationName,
    canManageMembers,
    currentLocationManagerLimit,
    requireOnline,
    recordAuditLog,
    setSettingsError,
    setSettingsMessage,
  });

  // Editorul locației (nume, adresă).
  const {
    locationEditor,
    locationError,
    setLocationEditor,
    setLocationError,
    openLocationEditor,
    saveLocation,
  } = useLocationEditor({
    db,
    user,
    isOwner,
    canEditCurrentLocation,
    locations,
    requireOnline,
    recordAuditLog,
    setActiveLocationId,
    onLocationCreated: setPendingInviteLocationId,
    setSettingsError,
    setSettingsMessage,
  });

  // Invitațiile de manager încă active ocupă din limita planului de manageri.
  const currentLocationPendingManagerInviteCount = useMemo(
    () =>
      accessCodes.filter(
        (item) =>
          item.locationId === currentLocationId &&
          item.role === "manager" &&
          item.active &&
          !isAccessCodeFull(item) &&
          !isAccessCodeExpired(item)
      ).length,
    [accessCodes, currentLocationId]
  );
  const currentLocationManagerCapacityUsed = currentLocationSuperAdminCount + currentLocationPendingManagerInviteCount;
  const currentLocationCodeCount = useMemo(
    () => accessCodes.filter((item) => item.locationId === currentLocationId).length,
    [accessCodes, currentLocationId]
  );

  // Codurile de acces și invitațiile: generare, copiere, trimitere pe email, prelungire, oprire.
  const {
    changeInviteLanguage,
    codeGenerator,
    codesError,
    codesWorking,
    copyAccessCode,
    copyInviteLink,
    extendAccessCodeExpiry,
    generateLocationCode,
    inviteDraft,
    inviteLanguage,
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
    pushToast,
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
    language,
  });

  // După ce proprietarul creează o locație, se deschide fereastra codurilor cu rolul Administrator ales, gata de trimis.
  useEffect(() => {
    if (!pendingInviteLocationId || currentLocationId !== pendingInviteLocationId) {
      return;
    }

    if (!locations.some((item) => item.id === pendingInviteLocationId)) {
      return;
    }

    openCodesEditor();
    setCodeGenerator({
      role: "manager",
      groupName: "",
      locationId: pendingInviteLocationId,
      roomAccess: "all",
      allowedRoomIds: [],
      inviteEmail: "",
    });
    setPendingInviteLocationId("");
  }, [currentLocationId, locations, openCodesEditor, pendingInviteLocationId, setCodeGenerator]);

  // Codurile de licență (doar proprietar).
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
    language,
  });

  // Activează notificările proprietarului (cere permisiunea browserului).
  async function enableOwnerNotifications() {
    const allowed = await requestKeluniaNotificationPermission();

    if (allowed) {
      setSettingsMessage(msg("msg.ownerNotifOn"));
      setSettingsError("");
      return;
    }

    setSettingsError(msg("msg.notifDenied"));
  }

  // Notificări pentru proprietar când sosesc cereri noi din pagina publică.
  useOwnerLandingNotifications({ user, isOwner, communityApplications });

  // Rezervările: formular, creare, editare, duplicare, ștergere.
  const {
    canEditBooking,
    duplicateBooking,
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
    groups: selectableGroups,
    isOnline,
    licenseAccess,
    locationName,
    offlineMessage: offlineReadOnlyMessage,
    permissionContext,
    profile,
    recordAuditLog,
    role,
    rooms: selectableAccessibleRooms,
    setIsOnline,
    setSelectedBooking,
    setSettingsError,
    softDeletePayload,
    user,
    pushToast,
  });
  // Rezervările zilei selectate.
  const selectedDayBookings = useMemo(
    () => (selectedDay ? bookingsForDay(visibleBookingsByRoomAccess, selectedDay) : []),
    [selectedDay, visibleBookingsByRoomAccess]
  );

  // Deschide lista zilei; de acolo se alege o rezervare sau se adaugă una nouă.
  function openDayBookings(date: string) {
    setCurrentDate(parseDateKey(date));
    // Always open the day list — pick a booking there, or use its "add" button
    // when the day is empty. (Previously 0 bookings jumped straight to the create
    // form and 1 booking straight to its details.)
    setSelectedBookingNotice("");
    setSelectedDay(date);
  }

  // Din fereastra zilei se trece la formularul de rezervare nouă.
  function createBookingFromDayModal() {
    if (!selectedDay) {
      return;
    }

    const date = selectedDay;
    setSelectedDay(null);
    openCreateForm(date, { defaultStartTime: "12:00" });
  }

  // Din fereastra zilei se deschid detaliile unei rezervări.
  function selectBookingFromDayModal(booking: Booking) {
    setSelectedDay(null);
    setSelectedBookingNotice("");
    setSelectedBooking(booking);
  }

  // Din detalii se creează o rezervare nouă în aceeași dată.
  function createBookingFromSelectedBooking() {
    if (!selectedBooking) {
      return;
    }

    const date = selectedBooking.startDate;
    setSelectedBooking(null);
    openCreateForm(date, { defaultStartTime: "12:00" });
  }

  // Trimite acum o notificare pentru rezervarea selectată (grupului sau întregii locații) prin funcția cloud.
  async function notifySelectedBookingNow(scope: "group" | "location" = "group") {
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
        notifyNowScope: scope,
      });
      const pushSent = Number((result.data as { pushSent?: unknown } | undefined)?.pushSent ?? 0);

      setSelectedBookingNotice(
        !hasKeluniaPushConfig()
          ? msg("msg.reminderNoPushConfig")
          : pushSent > 0
            ? pushSent === 1
              ? msg("msg.reminderSentOne")
              : msg("msg.reminderSentMany", { count: pushSent })
            : pushRegistered
              ? msg("msg.reminderNoDevices")
              : msg("msg.reminderThisDeviceOff")
      );
    } catch (error) {
      console.error("Notificarea nu a putut fi trimisa:", error);
      pushToast({ message: error instanceof Error ? error.message : msg("msg.notifySendFailed"), tone: "error" });
    } finally {
      setNotifyingSelectedBooking(false);
    }
  }

  // Schimbarea parolei și trimiterea emailului de resetare.
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
  // Blocarea aplicației cu PIN sau biometrie.
  const {
    appLocked,
    unlockPin,
    setUnlockPin,
    unlockError,
    biometricWorking,
    pinIntent,
    pinDraft,
    setPinDraft,
    pinError,
    setPinError,
    pinConfiguredLocally,
    setPinConfiguredLocally,
    markAppUnlocked,
    confirmSignOut,
    unlockWithPin,
    unlockWithBiometrics,
    openPinSetup,
    closePinSetup,
    handlePinToggle,
    handleBiometricsToggle,
  } = useAppLock({ db, user, profile, setPersonalDraft, setSettingsError });

  // Deschide o rezervare dintr-un link/notificare și o selectează.
  useBookingDeepLink({
    db,
    bookings,
    setActiveView,
    setSelectedBooking,
    setSelectedBookingNotice,
  });

  // Leagă notificările push primite de aplicație.
  useKeluniaPushBridge({ user, profile });

  // Salvează PIN-ul: validează formatul, îl trimite la funcția cloud (se stochează hash, nu textul) și apoi salvează setările.
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

    try {
      const biometricReady = wantsBiometrics
        ? await registerBiometricCredential(user.uid, user.email ?? profile?.displayName ?? "Kelunia")
        : false;

      // scrypt + salt, stored Admin-only under users/{uid}/private/security.
      await httpsCallable<{ pin: string }, { ok: boolean }>(cloudFunctions, "setPin")({ pin: pinDraft.pin });
      setPinConfiguredLocally(true);

      setPersonalDraft((current) => ({
        ...current,
        usePin: true,
        useBiometrics: wantsBiometrics ? biometricReady : current.useBiometrics,
      }));
      closePinSetup();

      if (wantsBiometrics && !biometricReady) {
        setSettingsError(msg("msg.biometricsUnavailable"));
      }

      await savePersonalSettings({
        usePin: true,
        useBiometrics: wantsBiometrics ? biometricReady : personalDraft.useBiometrics,
      });
    } catch (error) {
      console.error("PIN-ul nu a putut fi salvat:", error);
      setPinError((error as { message?: string })?.message || "PIN-ul nu a putut fi salvat. Incearca din nou.");
    }
  }

  // Salvează setările personale, cu validări (online, grup, PIN, notificări) și apoi scrie în Firestore.
  async function savePersonalSettings(options?: { usePin?: boolean; useBiometrics?: boolean; language?: AppLanguage }) {
    if (!user) {
      return;
    }

    setSettingsError("");
    setSettingsMessage("");

    if (!requireOnline("settings")) {
      return;
    }

    if (!isSuperAdmin && !personalDraft.groupName.trim()) {
      setSettingsError(msg("msg.chooseGroupBeforeSave"));
      return;
    }

    const effectiveDraft = {
      ...personalDraft,
      usePin: options?.usePin ?? personalDraft.usePin,
      useBiometrics: options?.useBiometrics ?? personalDraft.useBiometrics,
      language: options?.language ?? personalDraft.language,
    };
    // Normalizează momentele de notificare și deduce zilele pentru câmpurile vechi.
    const notificationOffsets = normalizeNotificationOffsetRules(effectiveDraft.notifyOffsets);
    const notificationOffsetDays = notificationOffsets
      .filter((offset) => offset.unit === "days")
      .map((offset) => offset.value);

    // Activarea PIN-ului/biometriei fără PIN configurat deschide mai întâi configurarea PIN-ului.
    if (
      (effectiveDraft.usePin || effectiveDraft.useBiometrics) &&
      !profile?.hasPin &&
      !pinConfiguredLocally
    ) {
      openPinSetup(effectiveDraft.useBiometrics ? "biometrics" : "pin");
      return;
    }

    // Notificările pentru grup cer cel puțin un moment și permisiunea de notificare.
    if (effectiveDraft.notifyGroupBookings) {
      if (notificationOffsets.length === 0) {
        setSettingsError(msg("msg.chooseNotifMoment"));
        return;
      }

      const notificationsAllowed = await requestKeluniaNotificationPermission();

      if (!notificationsAllowed) {
        setSettingsError(msg("msg.notifDenied"));
        return;
      }

      // Best-effort: never block saving the settings on push token registration.
      void registerKeluniaPushToken(user, profile).catch((error) => {
        console.warn("Tokenul pentru notificări push nu a putut fi înregistrat:", error);
      });
    }

    const usePin = effectiveDraft.usePin || effectiveDraft.useBiometrics;
    // Only the personal-settings fields. Sending identity/location fields (uid, role,
    // isOwner, locationId, accessCodeId, ...) pushed this write out of the cheap
    // `validOwnUserUpdate` rule path into a branch that re-evaluates validUserDataShape
    // several times and blew past Firestore's 1000-expression limit (permission-denied).
    const payload: Record<string, unknown> = {
      displayName: effectiveDraft.displayName,
      groupName: isOwner ? "" : effectiveDraft.groupName,
      group: isOwner ? "" : effectiveDraft.groupName,
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

    try {
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
    } catch (error) {
      console.error("Setările nu au putut fi salvate:", error);
      setSettingsError(msg("msg.settingsSaveFailed"));
      setSettingsMessage("");
      return;
    }

    setSettingsError("");
    // Mirror what was just saved so the language, name and group apply at once
    // (the profile is only read at sign-in).
    updateProfile({
      displayName: effectiveDraft.displayName,
      groupName: isOwner ? "" : effectiveDraft.groupName,
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
    });
    setSettingsMessage(appText(effectiveDraft.language, "msg.settingsSaved"));
    void recordAuditLog(
      "user",
      "update",
      user.uid,
      profile,
      payload,
      isOwner ? "" : profile?.locationId ?? "main-location",
      isOwner ? defaultLocationName : profile?.locationName ?? locationName
    );

    try {
      if (usePin) {
        markAppUnlocked();
      }
    } catch (error) {
      console.warn("Setările au fost salvate, dar starea locală nu a putut fi actualizată:", error);
    }
  }

  // Banner pentru o locație programată la închidere.
  const closureDate = (currentLocation?.closureScheduledFor as { toDate?: () => Date } | null | undefined)?.toDate?.();
  const closureBanner = closureDate
    ? msg("closure.banner", { date: closureDate.toLocaleDateString(dateLocales[language], { day: "2-digit", month: "long", year: "numeric" }) })
    : "";
  // Locațiile pentru care se pot edita codurile de acces.
  const editableCodeLocations = currentLocation
    ? [currentLocation]
    : [{ id: currentLocationId, name: locationName, ownerEmail: "", address: "", placeId: "" }];
  // Ecranul de blocare, afișat peste orice vedere când aplicația este blocată.
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

  // Profilul nu a putut fi citit: ecran de recuperare, în loc de un profil provizoriu de oaspete.
  if (user && profileError) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <img src="/icon-192.png" alt="Kelunia" />
        </div>
        <h1>Kelunia</h1>
        <p>{appText(language, "auth.profileLoadFailed")}</p>
        <p className="muted-note">{profileError}</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={confirmSignOut} type="button">
            {appText(language, "action.signOut")}
          </button>
          <button className="primary-button" onClick={reloadProfile} type="button">
            {appText(language, "auth.profileRetry")}
          </button>
        </div>
      </div>
    );
  }

  // Cont de manager nou: mai întâi se configurează locația.
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
  // Utilizatorul trebuie să-și aleagă grupul înainte de a folosi aplicația.
  if (mustChooseGroup) {
    return (
      <>
        <RequiredGroupSetupView
          error={groupSetupError}
          groups={selectableGroups}
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

  // Cât se încarcă sesiunea se arată ecranul de încărcare.
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

  // Fără utilizator nu se afișează nimic (urmează redirecționarea spre login).
  if (!user) {
    return null;
  }

  // Aplicația propriu-zisă: antetul, banda, vederea activă și ferestrele modale.
  return (
    <main className="kelunia-shell" data-ticker={tickerActive ? "on" : undefined}>
      {/* Antetul și navigarea. */}
      <KeluniaShellChrome
        displayedView={displayedView}
        headerTitle={headerTitle}
        isOnline={isOnline}
        isSignedIn={Boolean(user)}
        licenseMessage={closureBanner || licenseAccess.message}
        language={language}
        navigationItems={navigationItems}
        offlineMessage={offlineReadOnlyMessage}
        showLicenseWarning={Boolean(user && currentLocationId && licenseAccess.isReadOnly)}
        userLabel={profile ? `${profile.displayName} · ${appRoleLabel(profile, role, language)}` : undefined}
        onNavigate={setActiveView}
        onSignOut={confirmSignOut}
      />

      {/* Banda cu evenimentele următoare. */}
      <UpcomingTicker
        bookings={tickerBookings}
        today={today}
        settings={tickerSettings}
        language={language}
        onSelectBooking={setSelectedBooking}
      />

      {/* Zona cu vederile; permite glisarea între pagini. */}
      <div
        className="swipe-page-region"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
        onTouchCancel={clearSwipe}
      >
      {/* Eroarea unei vederi nu strică restul aplicației. */}
      <ErrorBoundary region="dashboard-view">
      {/* Programul fix. */}
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

      {/* Calendarul: bara de unelte și vederea an/lună/săptămână/zi. */}
      {displayedView === "calendar" && (
        <section className="workspace-panel calendar-panel">
          <CalendarToolbar
              periodTitle={periodTitle}
              calendarMode={calendarMode}
              language={language}
              onMovePeriod={movePeriod}
              onToday={() => setCurrentDate(new Date())}
              onCalendarModeChange={setCalendarMode}
            />

          {calendarMode === "year" ? (
            <YearView
              yearMonths={yearMonths}
              bookings={visibleBookingsByRoomAccess}
              today={today}
              onDateSelect={openDayBookings}
              onOpenMonth={(firstDateKey) => {
                setCurrentDate(parseDateKey(firstDateKey));
                setCalendarMode("month");
              }}
            />
          ) : calendarMode === "month" ? (
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

      {/* Lista de rezervări. */}
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

      {/* Setările. */}
      {displayedView === "settings" && (
      <SettingsView
        settingsError={settingsError}
        onSettingsMessage={setSettingsMessage}
        pinResetRequired={Boolean(profile?.pinResetRequired) && !pinConfiguredLocally}
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
        listPageEnabledDraft={listPageEnabledDraft}
        setListPageEnabledDraft={setListPageEnabledDraft}
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
        onApplyDevicePush={async () => {
          if (user && profile) {
            await registerKeluniaPushToken(user, profile);
          }
        }}
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
        tickerSettings={tickerSettings}
        onTickerSettingsChange={(patch) => {
          updateTickerSettings(patch);
          setSettingsMessage(appText(language, "settings.tickerSaved"));
        }}
        errorReports={errorReports}
        errorReportsError={errorReportsError}
        onResolveErrorReport={resolveReport}
        />
      )}
      </ErrorBoundary>
      </div>

      {/* Butonul plutitor „+” pentru rezervare nouă. */}
      {canManageBookings && (displayedView === "calendar" || displayedView === "list") && (
        <button
          className="fab-add"
          type="button"
          disabled={!isOnline}
          aria-label={appText(language, "booking.newShort")}
          onClick={() => openCreateForm(dateKey(currentDate))}
        >
          +
        </button>
      )}

      {/* Ferestrele modale: audit, parolă, coduri de acces, licențe, locație, PIN, spații, programe fixe, rezervări. */}
      <AuditHistoryModal
        open={showAuditModal}
        auditLogs={auditLogs}
        auditLoading={auditLoading}
        auditError={auditError}
        language={language}
        onClose={() => setShowAuditModal(false)}
        onReload={loadAuditLogs}
      />

      <PasswordModal
        open={passwordModal}
        passwordDraft={passwordDraft}
        passwordError={passwordError}
        passwordMessage={passwordMessage}
        language={language}
        onClose={() => setPasswordModal(false)}
        onChange={setPasswordDraft}
        onSave={savePasswordChange}
        onReset={sendPasswordReset}
      />

      <AccessCodesModal
        open={showCodesModal}
        codeGenerator={codeGenerator}
        groups={selectableGroups}
        rooms={selectableRooms}
        editableCodeLocations={editableCodeLocations}
        accessCodes={accessCodes}
        codesWorking={codesWorking}
        codesError={codesError}
        inviteDraft={inviteDraft}
        inviteLanguage={inviteLanguage}
        onInviteLanguageChange={changeInviteLanguage}
        onClose={() => setShowCodesModal(false)}
        onCodeGeneratorChange={setCodeGenerator}
        onInviteDraftChange={setInviteDraft}
        onGenerate={generateLocationCode}
        onUpdateDetails={updateAccessCodeDetails}
        onCopy={copyAccessCode}
        onToggleActive={toggleAccessCodeActive}
        onRemove={removeAccessCode}
        onExtendExpiry={extendAccessCodeExpiry}
        accessCodeUsageLabel={accessCodeUsageLabel}
        isAccessCodeFull={isAccessCodeFull}
        isAccessCodeExpired={isAccessCodeExpired}
        accessCodeExpiryLabel={accessCodeExpiryLabel}
        onCopyInviteLink={copyInviteLink}
        onSendInvite={sendAccessInvite}
        onSendInviteEmail={sendInviteEmailFromModal}
        language={language}
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
        language={language}
      />

      <LocationEditorModal
        isOwner={isOwner}
        locationEditor={locationEditor}
        locationError={locationError}
        language={language}
        onClose={() => setLocationEditor(null)}
        onChange={setLocationEditor}
        onSave={saveLocation}
      />

      <PinSetupModal
        pinIntent={pinIntent}
        pinDraft={pinDraft}
        pinError={pinError}
        language={language}
        onClose={closePinSetup}
        onChange={setPinDraft}
        onSave={confirmPinSetup}
      />

      <SpaceEditorModal
        spaceEditor={spaceEditor}
        spaceError={spaceError}
        groupLabel={groupsLabel}
        roomLabel={roomsLabel}
        language={language}
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
        groups={selectableGroups}
        rooms={selectableRooms}
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
        groups={selectableGroups}
        managedUsers={visibleManagedUsers}
        rooms={selectableAccessibleRooms}
        bookings={visibleBookingsByRoomAccess}
        canNotifyWholeLocation={hasFullRoomAccess}
        fixedSchedules={visibleFixedSchedulesByRoomAccess}
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
        canNotifyWholeLocation={hasFullRoomAccess}
        groupsLabel={groupsLabel}
        canCreate={canManageBookings && isOnline}
        onAdd={createBookingFromSelectedBooking}
        onDuplicate={() => {
          if (selectedBooking) {
            setSelectedBookingNotice("");
            duplicateBooking(selectedBooking);
          }
        }}
        notificationBusy={notifyingSelectedBooking}
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
      {/* Notificările mici și ecranul de blocare. */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {appLockOverlay}
    </main>
  );
}
