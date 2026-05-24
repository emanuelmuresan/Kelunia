"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppLanguage, UserRole } from "@/context/AuthContext";
import { useCommunityApplicationMessages } from "@/features/landing/hooks/useCommunityApplications";
import { db } from "@/lib/firebase";
import { billingStatusLabel, dateFromFirestoreValue, planLabel } from "@/lib/licensing";
import { roomAccessLabel } from "@/lib/room-access";
import type {
  CommunityApplication,
  CommunityApplicationStatus,
  GroupItem,
  LocationItem,
  ManagedUser,
  NewsletterCampaign,
  NewsletterSubscriber,
  RoomAccessMode,
  RoomItem,
  SpaceKind,
} from "@/lib/types/domain";

type PersonalDraft = {
  displayName: string;
  groupName: string;
  usePin: boolean;
  lockOnHide: boolean;
  useBiometrics: boolean;
  notifyGroupBookings: boolean;
  notifyFixedGroupSchedules: boolean;
  notifyWeekBefore: boolean;
  notifyDayBefore: boolean;
  notifyOffsets: string[];
  notifyOffsetsDays: number[];
  language: AppLanguage;
};

type LicenseAccess = {
  planLabel: string;
  statusLabel: string;
  status: string;
  daysRemaining: number | null;
};

type ManagedUserDraft = {
  role: UserRole;
  roomAccess: RoomAccessMode;
  allowedRoomIds: string[];
};

function licenseRemainingLabel(licenseAccess: LicenseAccess) {
  if (licenseAccess.status === "expired") {
    return "Expirata";
  }

  if (licenseAccess.daysRemaining === null) {
    return licenseAccess.status === "active" ? "Fara data de expirare" : "Nespecificat";
  }

  const days = Math.max(0, licenseAccess.daysRemaining);

  if (days === 0) {
    return "Expira azi";
  }

  if (days === 1) {
    return "Expira maine";
  }

  return `Expira in ${days} zile`;
}

type SettingsViewProps = {
  settingsError: string;
  settingsMessage: string;
  userExists: boolean;
  isOwner: boolean;
  isSuperAdmin: boolean;
  canEditCurrentLocation: boolean;
  canManageAccessCodes: boolean;
  canManageMembers: boolean;
  currentLocationId: string;

  personalDraft: PersonalDraft;
  setPersonalDraft: (value: PersonalDraft) => void;
  groups: GroupItem[];

  fixedPageEnabledDraft: boolean;
  setFixedPageEnabledDraft: (value: boolean) => void;
  fixedSectionDraft: string;
  setFixedSectionDraft: (value: string) => void;
  defaultFixedSectionTitle: string;
  listViewDraft: string;
  setListViewDraft: (value: string) => void;
  resourcesSectionDraft: string;
  setResourcesSectionDraft: (value: string) => void;
  defaultResourcesSectionTitle: string;
  roomsLabelDraft: string;
  setRoomsLabelDraft: (value: string) => void;
  defaultRoomsLabel: string;
  groupsLabelDraft: string;
  setGroupsLabelDraft: (value: string) => void;
  defaultGroupsLabel: string;

  licenseAccess: LicenseAccess;
  currentLocationCodeCount: number;
  licenseCodeCount: number;
  currentLocationManagerAccountCount: number;
  currentLocationManagerLimit: number;
  communityApplications: CommunityApplication[];
  communityApplicationsError: string;
  newsletterSubscribers: NewsletterSubscriber[];
  newsletterCampaigns: NewsletterCampaign[];
  newsletterError: string;

  locations: LocationItem[];
  rooms: RoomItem[];
  visibleManagedUsers: ManagedUser[];

  onSavePersonalSettings: () => void;
  onOpenPasswordModal: () => void;
  onHandlePinToggle: (checked: boolean) => void;
  onHandleBiometricsToggle: (checked: boolean) => void;
  onSaveNavigationSettings: () => void;
  onSelectLocation: (locationId: string) => void;
  onOpenLocationEditor: (location?: LocationItem) => void;
  onOpenCodesEditor: () => void;
  onOpenLicenseCodes: () => void;
  onOpenSpaceEditor: (kind: SpaceKind, item?: RoomItem | GroupItem) => void;
  onRemoveSpaceItem: (kind: SpaceKind, itemId: string) => void;
  onUpdateManagedUserRole: (managedUser: ManagedUser, role: UserRole) => void | Promise<void>;
  onUpdateManagedUserRoomAccess: (managedUser: ManagedUser, roomAccess: RoomAccessMode, allowedRoomIds: string[]) => void | Promise<void>;
  onRemoveManagedUser: (managedUser: ManagedUser) => void;
  onMarkCommunityApplicationReviewed: (applicationId: string) => void;
  onSendCommunityApplicationReply: (application: CommunityApplication, body: string) => Promise<void>;
  onUpdateCommunityApplicationStatus: (applicationId: string, status: CommunityApplicationStatus) => Promise<void>;
  onSendNewsletterCampaign: (subject: string, body: string, recipientEmail?: string) => Promise<void>;
  onEnableOwnerNotifications: () => Promise<void>;
};

export function SettingsView({
  settingsError,
  settingsMessage,
  userExists,
  isOwner,
  isSuperAdmin,
  canEditCurrentLocation,
  canManageAccessCodes,
  canManageMembers,
  currentLocationId,
  personalDraft,
  setPersonalDraft,
  groups,
  fixedPageEnabledDraft,
  setFixedPageEnabledDraft,
  fixedSectionDraft,
  setFixedSectionDraft,
  defaultFixedSectionTitle,
  listViewDraft,
  setListViewDraft,
  resourcesSectionDraft,
  setResourcesSectionDraft,
  defaultResourcesSectionTitle,
  roomsLabelDraft,
  setRoomsLabelDraft,
  defaultRoomsLabel,
  groupsLabelDraft,
  setGroupsLabelDraft,
  defaultGroupsLabel,
  licenseAccess,
  currentLocationCodeCount,
  licenseCodeCount,
  currentLocationManagerAccountCount,
  currentLocationManagerLimit,
  communityApplications,
  communityApplicationsError,
  newsletterSubscribers,
  newsletterCampaigns,
  newsletterError,
  locations,
  rooms,
  visibleManagedUsers,
  onSavePersonalSettings,
  onOpenPasswordModal,
  onHandlePinToggle,
  onHandleBiometricsToggle,
  onSaveNavigationSettings,
  onSelectLocation,
  onOpenLocationEditor,
  onOpenCodesEditor,
  onOpenLicenseCodes,
  onOpenSpaceEditor,
  onRemoveSpaceItem,
  onUpdateManagedUserRole,
  onUpdateManagedUserRoomAccess,
  onRemoveManagedUser,
  onMarkCommunityApplicationReviewed,
  onSendCommunityApplicationReply,
  onUpdateCommunityApplicationStatus,
  onSendNewsletterCampaign,
  onEnableOwnerNotifications,
}: SettingsViewProps) {
  const showLocationSettings = !isOwner || Boolean(currentLocationId);
  const [selectedCommunityApplication, setSelectedCommunityApplication] = useState<CommunityApplication | null>(null);
  const [communityReplyDraft, setCommunityReplyDraft] = useState("");
  const [communityReplyError, setCommunityReplyError] = useState("");
  const [communityReplyMessage, setCommunityReplyMessage] = useState("");
  const [communityReplyWorking, setCommunityReplyWorking] = useState(false);
  const [newsletterDraft, setNewsletterDraft] = useState({ subject: "", body: "" });
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterLocalError, setNewsletterLocalError] = useState("");
  const [newsletterWorking, setNewsletterWorking] = useState(false);
  const [newsletterPanelOpen, setNewsletterPanelOpen] = useState(false);
  const [newsletterComposerOpen, setNewsletterComposerOpen] = useState(false);
  const [newsletterTargetEmail, setNewsletterTargetEmail] = useState("");
  const [pagesEditing, setPagesEditing] = useState(false);
  const [managedUserEditing, setManagedUserEditing] = useState<Record<string, boolean>>({});
  const [managedUserDrafts, setManagedUserDrafts] = useState<Record<string, ManagedUserDraft>>({});
  const [resourcesManagerOpen, setResourcesManagerOpen] = useState(false);
  const [usersManagerOpen, setUsersManagerOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileBaseline, setProfileBaseline] = useState<PersonalDraft | null>(null);
  const [ownerNotificationPermission, setOwnerNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const activeCommunityApplication = selectedCommunityApplication
    ? communityApplications.find((application) => application.id === selectedCommunityApplication.id) ?? selectedCommunityApplication
    : null;
  const activeNewsletterSubscribers = newsletterSubscribers.filter(
    (subscriber) => subscriber.status === "active" && !subscriber.unsubscribed
  );
  const newsletterSubscriberRows = (() => {
    const rows = new Map<string, { id: string; email: string; createdAt?: unknown }>();

    activeNewsletterSubscribers.forEach((subscriber) => {
      rows.set(subscriber.email, {
        id: subscriber.id,
        email: subscriber.email,
        createdAt: subscriber.createdAt,
      });
    });

    communityApplications
      .filter((application) => application.source === "landing-newsletter")
      .forEach((application) => {
        const email = application.email.trim().toLowerCase();

        if (email && !rows.has(email)) {
          rows.set(email, {
            id: `legacy-${application.id}`,
            email,
            createdAt: application.createdAt,
          });
        }
      });

    return [...rows.values()];
  })();
  const unreadLandingMessageCount = communityApplications.filter((application) => application.status === "new").length;
  const ownerNotificationsEnabled = ownerNotificationPermission === "granted";
  const profileDirty = profileBaseline ? !samePersonalDraft(personalDraft, profileBaseline) : false;
  const {
    messages: communityMessages,
    communityMessagesError,
  } = useCommunityApplicationMessages({
    db,
    applicationId: activeCommunityApplication?.id ?? "",
    enabled: Boolean(activeCommunityApplication),
  });

  useEffect(() => {
    refreshOwnerNotificationPermission();
  }, []);

  function managedUserDraftFor(managedUser: ManagedUser): ManagedUserDraft {
    return managedUserDrafts[managedUser.id] ?? {
      role: managedUser.role,
      roomAccess: managedUser.role === "manager" ? "all" : managedUser.roomAccess,
      allowedRoomIds: managedUser.role === "manager" ? [] : managedUser.allowedRoomIds,
    };
  }

  function openManagedUserEditor(managedUser: ManagedUser) {
    setManagedUserDrafts((current) => ({
      ...current,
      [managedUser.id]: {
        role: managedUser.role,
        roomAccess: managedUser.role === "manager" ? "all" : managedUser.roomAccess,
        allowedRoomIds: managedUser.role === "manager" ? [] : managedUser.allowedRoomIds,
      },
    }));
    setManagedUserEditing((current) => ({ ...current, [managedUser.id]: true }));
  }

  function closeManagedUserEditor(userId: string) {
    setManagedUserEditing((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
    setManagedUserDrafts((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
  }

  function setManagedUserDraft(managedUser: ManagedUser, nextDraft: ManagedUserDraft) {
    setManagedUserDrafts((current) => ({ ...current, [managedUser.id]: nextDraft }));
  }

  function sameRoomIds(first: string[], second: string[]) {
    if (first.length !== second.length) {
      return false;
    }

    const firstSet = new Set(first);
    return second.every((item) => firstSet.has(item));
  }

  async function saveManagedUserEditor(managedUser: ManagedUser) {
    const draft = managedUserDraftFor(managedUser);
    const nextRoomAccess = draft.role === "manager" ? "all" : draft.roomAccess;
    const nextAllowedRoomIds = nextRoomAccess === "selected" ? draft.allowedRoomIds : [];

    if (draft.role !== managedUser.role) {
      await onUpdateManagedUserRole(managedUser, draft.role);
    }

    if (
      draft.role === managedUser.role &&
      (nextRoomAccess !== managedUser.roomAccess || !sameRoomIds(nextAllowedRoomIds, managedUser.allowedRoomIds))
    ) {
      await onUpdateManagedUserRoomAccess(managedUser, nextRoomAccess, nextAllowedRoomIds);
    }

    if (draft.role !== managedUser.role && draft.role !== "manager") {
      await onUpdateManagedUserRoomAccess(
        { ...managedUser, role: draft.role },
        nextRoomAccess,
        nextAllowedRoomIds
      );
    }

    closeManagedUserEditor(managedUser.id);
  }

  function samePersonalDraft(first: PersonalDraft, second: PersonalDraft) {
    return first.displayName === second.displayName
      && first.groupName === second.groupName
      && first.usePin === second.usePin
      && first.lockOnHide === second.lockOnHide
      && first.useBiometrics === second.useBiometrics
      && first.notifyGroupBookings === second.notifyGroupBookings
      && first.notifyFixedGroupSchedules === second.notifyFixedGroupSchedules
      && first.notifyWeekBefore === second.notifyWeekBefore
      && first.notifyDayBefore === second.notifyDayBefore
      && first.notifyOffsets.join("|") === second.notifyOffsets.join("|")
      && first.notifyOffsetsDays.join("|") === second.notifyOffsetsDays.join("|")
      && first.language === second.language;
  }

  function copyPersonalDraft(draft: PersonalDraft): PersonalDraft {
    return { ...draft, notifyOffsets: [...draft.notifyOffsets], notifyOffsetsDays: [...draft.notifyOffsetsDays] };
  }

  function syncLegacyNotificationFlags(nextOffsets: string[]) {
    return {
      notifyWeekBefore: nextOffsets.includes("7d"),
      notifyDayBefore: nextOffsets.includes("1d"),
      notifyOffsetsDays: nextOffsets
        .filter((offset) => offset.endsWith("d"))
        .map((offset) => Number(offset.slice(0, -1)))
        .filter((offset) => Number.isInteger(offset) && offset >= 1 && offset <= 30),
    };
  }

  function updateNotificationOffset(index: number, value: string) {
    const current = personalDraft.notifyOffsets[index] ?? "1d";
    const unit = current.endsWith("h") ? "h" : "d";
    const max = unit === "h" ? 48 : 30;
    const nextValue = Math.max(1, Math.min(max, Number(value) || 1));
    const nextOffsets = personalDraft.notifyOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${nextValue}${unit}` : offset
    );

    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function updateNotificationOffsetUnit(index: number, unit: "h" | "d") {
    const current = personalDraft.notifyOffsets[index] ?? "1d";
    const currentValue = Math.max(1, Number(current.slice(0, -1)) || 1);
    const nextValue = unit === "h" ? Math.min(currentValue, 48) : Math.min(currentValue, 30);
    const nextOffsets = personalDraft.notifyOffsets.map((offset, offsetIndex) =>
      offsetIndex === index ? `${nextValue}${unit}` : offset
    );

    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function addNotificationOffset() {
    const nextOffsets = [...personalDraft.notifyOffsets, "1h"].slice(0, 5);

    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function removeNotificationOffset(index: number) {
    const nextOffsets = personalDraft.notifyOffsets.filter((_, offsetIndex) => offsetIndex !== index);

    setPersonalDraft({
      ...personalDraft,
      notifyOffsets: nextOffsets,
      ...syncLegacyNotificationFlags(nextOffsets),
    });
  }

  function refreshOwnerNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setOwnerNotificationPermission("unsupported");
      return;
    }

    setOwnerNotificationPermission(Notification.permission);
  }

  function openProfileEditor() {
    setProfileBaseline(copyPersonalDraft(personalDraft));
    setProfileEditorOpen(true);
  }

  function closeProfileEditor() {
    if (profileBaseline) {
      setPersonalDraft(copyPersonalDraft(profileBaseline));
    }

    setProfileEditorOpen(false);
    setProfileBaseline(null);
  }

  async function saveProfileEditor() {
    if (!profileDirty) {
      return;
    }

    await onSavePersonalSettings();
    setProfileBaseline(copyPersonalDraft(personalDraft));
    setProfileEditorOpen(false);
  }

  async function enableOwnerNotificationsFromCard() {
    await onEnableOwnerNotifications();
    refreshOwnerNotificationPermission();
  }

  function locationExpiryLabel(location: LocationItem) {
    const trialEnd = dateFromFirestoreValue(location.trialEndsAt);
    const subscriptionEnd = dateFromFirestoreValue(location.subscriptionExpiresAt);
    const endDate = location.billingStatus === "trialing" ? trialEnd : subscriptionEnd ?? trialEnd;

    if (!endDate) {
      return "fara data";
    }

    const days = Math.ceil((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    if (days < 0) {
      return `expirata de ${Math.abs(days)} zile`;
    }

    if (days === 0) {
      return "expira azi";
    }

    if (days === 1) {
      return "mai are 1 zi";
    }

    return `mai are ${days} zile`;
  }

  function communityDateLabel(value: unknown) {
    const date = dateFromFirestoreValue(value);

    if (!date) {
      return "data nespecificata";
    }

    return date.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function communityStatusLabel(status: CommunityApplicationStatus) {
    if (status === "reviewed") {
      return "citită";
    }

    if (status === "replied") {
      return "răspuns salvat";
    }

    if (status === "approved") {
      return "aprobată";
    }

    if (status === "declined") {
      return "respinsă";
    }

    return "nouă";
  }

  function communitySourceLabel(source: string) {
    if (source === "landing-newsletter") {
      return "Actualizări";
    }

    if (source === "landing-contact") {
      return "Contact";
    }

    return "Community";
  }

  function newsletterCampaignStatusLabel(status: NewsletterCampaign["status"]) {
    if (status === "sending") {
      return "se trimite";
    }

    if (status === "sent") {
      return "trimis";
    }

    if (status === "partial") {
      return "trimis parțial";
    }

    if (status === "failed") {
      return "eroare";
    }

    return "în așteptare";
  }

  async function copyNewsletterEmails() {
    const emails = newsletterSubscriberRows.map((subscriber) => subscriber.email).join(", ");

    setNewsletterMessage("");
    setNewsletterLocalError("");

    if (!emails) {
      setNewsletterLocalError("Nu există emailuri active de copiat.");
      return;
    }

    try {
      await navigator.clipboard.writeText(emails);
      setNewsletterMessage("Emailurile au fost copiate.");
    } catch (error) {
      console.error("Emailurile nu au putut fi copiate:", error);
      setNewsletterLocalError("Emailurile nu au putut fi copiate automat.");
    }
  }

  function openNewsletterComposer(recipientEmail = "") {
    setNewsletterTargetEmail(recipientEmail);
    setNewsletterDraft({ subject: "", body: "" });
    setNewsletterMessage("");
    setNewsletterLocalError("");
    setNewsletterComposerOpen(true);
  }

  async function sendNewsletter() {
    const subject = newsletterDraft.subject.trim();
    const body = newsletterDraft.body.trim();

    setNewsletterMessage("");
    setNewsletterLocalError("");

    if (!newsletterTargetEmail && newsletterSubscriberRows.length === 0) {
      setNewsletterLocalError("Nu există abonați activi.");
      return;
    }

    if (subject.length < 4) {
      setNewsletterLocalError("Scrie un subiect pentru email.");
      return;
    }

    if (body.length < 20) {
      setNewsletterLocalError("Scrie un mesaj puțin mai complet pentru newsletter.");
      return;
    }

    setNewsletterWorking(true);

    try {
      await onSendNewsletterCampaign(subject, body, newsletterTargetEmail || undefined);
      setNewsletterDraft({ subject: "", body: "" });
      setNewsletterMessage(
        newsletterTargetEmail
          ? `Emailul a fost pornit pentru ${newsletterTargetEmail}.`
          : "Campania a fost pornită. Resend o trimite către abonați."
      );
      setNewsletterComposerOpen(false);
      setNewsletterTargetEmail("");
    } catch (error) {
      console.error("Newsletterul nu a putut fi trimis:", error);
      setNewsletterLocalError("Newsletterul nu a putut fi pornit.");
    } finally {
      setNewsletterWorking(false);
    }
  }

  function openCommunityApplication(application: CommunityApplication) {
    setSelectedCommunityApplication(application);
    setInboxOpen(false);
    setCommunityReplyDraft("");
    setCommunityReplyError("");
    setCommunityReplyMessage("");

    if (application.status === "new") {
      onMarkCommunityApplicationReviewed(application.id);
    }
  }

  function closeCommunityApplication() {
    setSelectedCommunityApplication(null);
    setCommunityReplyDraft("");
    setCommunityReplyError("");
    setCommunityReplyMessage("");
  }

  async function saveCommunityReply() {
    if (!activeCommunityApplication) {
      return;
    }

    const cleanBody = communityReplyDraft.trim();

    if (cleanBody.length < 5) {
      setCommunityReplyError("Scrie un răspuns înainte de salvare.");
      return;
    }

    setCommunityReplyWorking(true);
    setCommunityReplyError("");
    setCommunityReplyMessage("");

    try {
      await onSendCommunityApplicationReply(activeCommunityApplication, cleanBody);
      setCommunityReplyDraft("");
      setCommunityReplyMessage("Răspunsul a fost salvat și se trimite prin email.");
    } catch (error) {
      console.error("Răspunsul Community nu a putut fi salvat:", error);
      setCommunityReplyError("Răspunsul nu a putut fi salvat.");
    } finally {
      setCommunityReplyWorking(false);
    }
  }

  async function updateCommunityStatus(status: CommunityApplicationStatus) {
    if (!activeCommunityApplication) {
      return;
    }

    setCommunityReplyWorking(true);
    setCommunityReplyError("");
    setCommunityReplyMessage("");

    try {
      await onUpdateCommunityApplicationStatus(activeCommunityApplication.id, status);
      setCommunityReplyMessage("Statusul cererii a fost actualizat.");

      if (status === "approved") {
        closeCommunityApplication();
        onOpenLicenseCodes();
      }
    } catch (error) {
      console.error("Statusul Community nu a putut fi actualizat:", error);
      setCommunityReplyError("Statusul nu a putut fi actualizat.");
    } finally {
      setCommunityReplyWorking(false);
    }
  }

  return (
    <>
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

        {userExists ? (
          <>
          <div className="settings-summary-list profile-summary-list">
            <div>
              <span>Nume</span>
              <strong>{personalDraft.displayName || "Nesetat"}</strong>
            </div>
            <div>
              <span>Rol</span>
              <strong>{isOwner ? "Proprietar" : isSuperAdmin ? "Manager" : "Membru"}</strong>
            </div>
            <div>
              <span>Limba</span>
              <strong>{personalDraft.language === "ro" ? "Romana" : "Limba selectata"}</strong>
            </div>
            {!isOwner && (
              <div>
                <span>{groupsLabelDraft.trim() || defaultGroupsLabel}</span>
                <strong>{personalDraft.groupName || "Neales"}</strong>
              </div>
            )}
            <div>
              <span>Securitate</span>
              <strong>
                {personalDraft.useBiometrics
                  ? "PIN + biometrie"
                  : personalDraft.usePin
                    ? "PIN activ"
                    : "Fara blocare"}
              </strong>
            </div>
            <div>
              <span>Blocare la iesire</span>
              <strong>{personalDraft.lockOnHide ? "Activa" : "Inactiva"}</strong>
            </div>
            {!isOwner && (
              <div>
                <span>Notificari</span>
                <strong>
                  {personalDraft.notifyGroupBookings
                    ? `${personalDraft.notifyOffsets.length} active`
                    : "Inactive"}
                </strong>
              </div>
            )}
          </div>

          <div className="settings-card-actions">
            <button className="primary-button compact" onClick={openProfileEditor} type="button">
              Editeaza setarile
            </button>
            <button className="secondary-button compact" onClick={onOpenPasswordModal} type="button">
              Schimba parola
            </button>
          </div>

          </>
        ) : (
          <div className="empty-state">
            <p>Intră în cont pentru setări.</p>
            <Link className="primary-link" href="/login">
              Autentificare
            </Link>
          </div>
        )}
      </article>

      {(isSuperAdmin || isOwner) && (
        <>
          {showLocationSettings && (
          <article className="settings-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Navigare</span>
                <h2>Pagini</h2>
              </div>
              {canEditCurrentLocation && !pagesEditing && (
                <button className="secondary-button compact" onClick={() => setPagesEditing(true)} type="button">
                  Editeaza
                </button>
              )}
            </div>

            <div className="settings-form">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={fixedPageEnabledDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  onChange={(event) => setFixedPageEnabledDraft(event.target.checked)}
                />
                Afișează pagina {fixedSectionDraft.trim() || defaultFixedSectionTitle}
              </label>

              <label>
                Nume programări fixe
                <input
                  value={fixedSectionDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  onChange={(event) => setFixedSectionDraft(event.target.value)}
                />
              </label>

              <label>
                Nume listă programări
                <input
                  value={listViewDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  onChange={(event) => setListViewDraft(event.target.value)}
                />
              </label>

              <label>
                Nume sectiune spatii
                <input
                  value={resourcesSectionDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  placeholder={defaultResourcesSectionTitle}
                  onChange={(event) => setResourcesSectionDraft(event.target.value)}
                />
              </label>

              <label>
                Nume sali
                <input
                  value={roomsLabelDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  placeholder={defaultRoomsLabel}
                  onChange={(event) => setRoomsLabelDraft(event.target.value)}
                />
              </label>

              <label>
                Nume grupuri
                <input
                  value={groupsLabelDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  placeholder={defaultGroupsLabel}
                  onChange={(event) => setGroupsLabelDraft(event.target.value)}
                />
              </label>

              {canEditCurrentLocation && pagesEditing && (
                <div className="modal-actions inline-actions">
                  <button className="secondary-button" onClick={() => setPagesEditing(false)} type="button">
                    Renunta
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      onSaveNavigationSettings();
                      setPagesEditing(false);
                    }}
                    type="button"
                  >
                    Salvează paginile
                  </button>
                </div>
              )}
            </div>
          </article>
          )}

          {showLocationSettings && (
          <article className="settings-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Acces</span>
                <h2>Coduri</h2>
              </div>

              {canManageAccessCodes && (
                <button className="secondary-button compact" onClick={onOpenCodesEditor} type="button">
                  Gestionează
                </button>
              )}
            </div>

            <div className="settings-summary-list">
              <div>
                <span>Plan</span>
                <strong>{licenseAccess.planLabel}</strong>
              </div>
              <div>
                <span>Status licenta</span>
                <strong>{licenseAccess.statusLabel}</strong>
              </div>

              <div>
                <span>Valabilitate</span>
                <strong>{licenseRemainingLabel(licenseAccess)}</strong>
              </div>

              <div>
                <span>Locatia curenta</span>
                <strong>{currentLocationCodeCount} coduri</strong>
              </div>

              <div>
                <span>Manageri</span>
                <strong>
                  {currentLocationManagerAccountCount}/{currentLocationManagerLimit}
                </strong>
              </div>
            </div>
          </article>
          )}

          {isOwner && (
            <article className="settings-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Proprietar</span>
                  <h2>Locații</h2>
                </div>
              </div>

              <p className="muted-note">{locations.length} locatii in workspace.</p>

              <div className="mini-list">
                {locations.length === 0 ? (
                  <p className="empty-line">Nu există locații adăugate.</p>
                ) : (
                  locations.map((location) => (
                    <div className="mini-row" key={location.id}>
                      <div className="mini-row-main">
                        <span>{location.name}</span>
                        {location.address && <small>{location.address}</small>}
                        <small>
                          {planLabel(location.plan ?? "standard")} · {billingStatusLabel(location.billingStatus ?? "trialing")} · {locationExpiryLabel(location)}
                        </small>
                      </div>
                      <div className="row-actions">
                        <button
                          className="secondary-button compact location-open-button"
                          onClick={() => onSelectLocation(location.id)}
                          type="button"
                        >
                          {location.id === currentLocationId ? "Deschisa" : "Deschide"}
                        </button>
                        <button
                          className="secondary-button compact"
                          onClick={() => onOpenLocationEditor(location)}
                          type="button"
                        >
                          Licenta
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="owner-tool-grid">
                <div className="owner-tool-card">
                  <div>
                    <span className="eyebrow">Licente</span>
                    <h3>Control licente</h3>
                    <p>{licenseCodeCount} coduri generate.</p>
                  </div>

                  <div className="owner-tool-actions">
                    <button className="primary-button compact" onClick={onOpenLicenseCodes} type="button">
                      Deschide
                    </button>
                  </div>
                </div>

                <div className="owner-tool-card">
                  <div>
                    <span className="eyebrow">Newsletter</span>
                    <h3>Actualizări</h3>
                    <p>{newsletterSubscriberRows.length} abonați activi.</p>
                  </div>

                  <div className="owner-tool-actions">
                    <button className="primary-button compact" onClick={() => setNewsletterPanelOpen(true)} type="button">
                      Deschide
                    </button>
                  </div>
                </div>

                <div className="owner-tool-card">
                  <div>
                    <span className="eyebrow">Inbox</span>
                    <h3>Mesaje Landing</h3>
                    <p>
                      {communityApplications.length} mesaje primite
                      {unreadLandingMessageCount > 0 ? ` · ${unreadLandingMessageCount} necitite` : ""}
                    </p>
                  </div>

                  {communityApplicationsError && (
                    <p className="error-line">{communityApplicationsError}</p>
                  )}

                  <div className="owner-tool-actions">
                    {unreadLandingMessageCount > 0 && <span className="badge-pill">{unreadLandingMessageCount}</span>}
                    {ownerNotificationsEnabled ? (
                      <span className="badge-pill success">Notificari active</span>
                    ) : (
                      <button className="secondary-button compact" onClick={enableOwnerNotificationsFromCard} type="button">
                        Activeaza notificari
                      </button>
                    )}
                    <button className="primary-button compact" onClick={() => setInboxOpen(true)} type="button">
                      Deschide inbox
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )}

          {showLocationSettings && (
          <article className="settings-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Organizare</span>
                <h2>{resourcesSectionDraft.trim() || defaultResourcesSectionTitle}</h2>
              </div>
            </div>

            <div className="owner-tool-grid">
              <div className="owner-tool-card">
                <div>
                  <span className="eyebrow">{roomsLabelDraft.trim() || defaultRoomsLabel}</span>
                  <h3>{rooms.length} {rooms.length === 1 ? "element" : "elemente"}</h3>
                  <p>{rooms.length > 0 ? rooms.slice(0, 3).map((room) => room.name).join(", ") : "Nu exista elemente adaugate."}</p>
                </div>
              </div>

              <div className="owner-tool-card">
                <div>
                  <span className="eyebrow">{groupsLabelDraft.trim() || defaultGroupsLabel}</span>
                  <h3>{groups.length} {groups.length === 1 ? "element" : "elemente"}</h3>
                  <p>{groups.length > 0 ? groups.slice(0, 3).map((group) => group.name).join(", ") : "Nu exista elemente adaugate."}</p>
                </div>
              </div>
            </div>

            <div className="modal-actions inline-actions">
              <button className="primary-button compact" onClick={() => setResourcesManagerOpen(true)} type="button">
                Deschide organizarea
              </button>
            </div>
          </article>
          )}

          {showLocationSettings && (
          <article className="settings-panel wide">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Utilizatori</span>
                <h2>{visibleManagedUsers.length} conturi</h2>
              </div>
            </div>

            <div className="owner-tool-card">
              <div>
                <span className="eyebrow">Acces</span>
                <h3>{visibleManagedUsers.length} {visibleManagedUsers.length === 1 ? "utilizator" : "utilizatori"}</h3>
                <p>
                  {visibleManagedUsers.filter((item) => item.role === "manager").length} manageri ·{" "}
                  {visibleManagedUsers.filter((item) => item.role !== "manager").length} membri si oaspeti
                </p>
              </div>
              <div className="owner-tool-actions">
                <button className="primary-button compact" onClick={() => setUsersManagerOpen(true)} type="button">
                  Deschide utilizatorii
                </button>
              </div>
            </div>
          </article>
          )}
        </>
      )}
    </section>

    {resourcesManagerOpen && (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setResourcesManagerOpen(false)}>
        <section
          className="modal-card manager-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resources-manager-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="modal-head">
            <div>
              <span className="eyebrow">Organizare</span>
              <h2 id="resources-manager-title">{resourcesSectionDraft.trim() || defaultResourcesSectionTitle}</h2>
            </div>
          </div>

          <div className="split-list">
            <div className="mini-column">
              <div className="mini-section-head">
                <h3>{roomsLabelDraft.trim() || defaultRoomsLabel}</h3>
                {canEditCurrentLocation && (
                  <button className="secondary-button compact" onClick={() => onOpenSpaceEditor("room")} type="button">
                    + {roomsLabelDraft.trim() || defaultRoomsLabel}
                  </button>
                )}
              </div>

              <div className="mini-list">
                {rooms.length === 0 ? (
                  <p className="empty-line">Nu exista elemente adaugate.</p>
                ) : (
                  rooms.map((room) => (
                    <div className="mini-row" key={room.id}>
                      <span>{room.name}</span>
                      {canEditCurrentLocation && (
                        <div className="row-actions">
                          <button onClick={() => onOpenSpaceEditor("room", room)} type="button" aria-label="Editează sala">
                            ✎
                          </button>
                          <button className="secondary-button compact danger-button" onClick={() => onRemoveSpaceItem("room", room.id)} type="button">
                            Sterge
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mini-column">
              <div className="mini-section-head">
                <h3>{groupsLabelDraft.trim() || defaultGroupsLabel}</h3>
                {canEditCurrentLocation && (
                  <button className="secondary-button compact" onClick={() => onOpenSpaceEditor("group")} type="button">
                    + {groupsLabelDraft.trim() || defaultGroupsLabel}
                  </button>
                )}
              </div>

              <div className="mini-list">
                {groups.length === 0 ? (
                  <p className="empty-line">Nu exista elemente adaugate.</p>
                ) : (
                  groups.map((group) => (
                    <div className="mini-row" key={group.id}>
                      <span className="group-name-with-swatch">
                        {group.color && <i aria-hidden="true" style={{ backgroundColor: group.color }} />}
                        {group.name}
                      </span>
                      {canEditCurrentLocation && (
                        <div className="row-actions">
                          <button onClick={() => onOpenSpaceEditor("group", group)} type="button" aria-label="Editează grupul">
                            ✎
                          </button>
                          <button className="secondary-button compact danger-button" onClick={() => onRemoveSpaceItem("group", group.id)} type="button">
                            Sterge
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="primary-button" onClick={() => setResourcesManagerOpen(false)} type="button">
              Gata
            </button>
          </div>
        </section>
      </div>
    )}

    {usersManagerOpen && (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setUsersManagerOpen(false)}>
        <section
          className="modal-card manager-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="users-manager-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="modal-head">
            <div>
              <span className="eyebrow">Utilizatori</span>
              <h2 id="users-manager-title">{visibleManagedUsers.length} conturi</h2>
            </div>
          </div>

          <div className="users-table">
              {visibleManagedUsers.map((managedUser) => {
                const userDraft = managedUserDraftFor(managedUser);
                const isEditingUser = Boolean(managedUserEditing[managedUser.id]);
                const draftRole = isEditingUser ? userDraft.role : managedUser.role;
                const draftRoomAccess = draftRole === "manager" ? "all" : userDraft.roomAccess;
                const draftAllowedRoomIds = draftRoomAccess === "selected" ? userDraft.allowedRoomIds : [];
                const userDraftChanged =
                  draftRole !== managedUser.role ||
                  draftRoomAccess !== managedUser.roomAccess ||
                  !sameRoomIds(draftAllowedRoomIds, managedUser.allowedRoomIds);
                const accessDisabled =
                  !isEditingUser ||
                  managedUser.isOwner ||
                  draftRole === "manager" ||
                  !canManageMembers ||
                  managedUser.locationId !== currentLocationId;
                const canEditManagedUser =
                  !managedUser.isOwner &&
                  canManageMembers &&
                  managedUser.locationId === currentLocationId;

                return (
                <div className="user-row" key={managedUser.id}>
                  <div>
                    <strong>{managedUser.displayName || managedUser.email}</strong>
                    <span>
                      {managedUser.email} · {managedUser.locationName || "fără locație"} · {managedUser.groupName || "fără grup"}
                    </span>
                  </div>

                  <select
                    value={draftRole}
                    onChange={(event) => {
                      const nextRole = event.target.value as UserRole;
                      setManagedUserDraft(managedUser, {
                        role: nextRole,
                        roomAccess: nextRole === "manager" ? "all" : managedUser.roomAccess,
                        allowedRoomIds: nextRole === "manager" || managedUser.roomAccess === "all" ? [] : managedUser.allowedRoomIds,
                      });
                    }}
                    disabled={
                      !isEditingUser ||
                      managedUser.isOwner ||
                      !canManageMembers ||
                      managedUser.locationId !== currentLocationId
                    }
                  >
                    <option value="guest">Oaspete</option>
                    <option value="member">Membru</option>
                    <option value="manager">Manager</option>
                  </select>

                  <div className="user-room-access">
                    <select
                      value={draftRoomAccess}
                      onChange={(event) => {
                        const nextRoomAccess = event.target.value as RoomAccessMode;

                        if (nextRoomAccess === "all") {
                          setManagedUserDraft(managedUser, {
                            ...userDraft,
                            roomAccess: "all",
                            allowedRoomIds: [],
                          });
                          return;
                        }

                        setManagedUserDraft(managedUser, {
                          ...userDraft,
                          roomAccess: "selected",
                          allowedRoomIds: managedUser.allowedRoomIds,
                        });
                      }}
                      disabled={accessDisabled}
                    >
                      <option value="all">Toate salile</option>
                      <option value="selected">Sali alese</option>
                    </select>

                    {draftRole !== "manager" && draftRoomAccess === "selected" && (
                      <div className="room-check-grid user-room-check-grid">
                        {rooms.length === 0 ? (
                          <p className="empty-line">Adauga intai sali pentru aceasta locatie.</p>
                        ) : (
                          rooms.map((room) => (
                            <label className="toggle-row compact-toggle" key={room.id}>
                              <input
                                type="checkbox"
                                checked={draftAllowedRoomIds.includes(room.id)}
                                disabled={accessDisabled}
                                onChange={(event) => {
                                  const allowedRoomIds = event.target.checked
                                    ? [...draftAllowedRoomIds, room.id]
                                    : draftAllowedRoomIds.filter((roomId) => roomId !== room.id);
                                  setManagedUserDraft(managedUser, { ...userDraft, roomAccess: "selected", allowedRoomIds });
                                }}
                              />
                              {room.name}
                            </label>
                          ))
                        )}
                      </div>
                    )}

                    <small>{roomAccessLabel({ ...managedUser, roomAccess: draftRoomAccess, allowedRoomIds: draftAllowedRoomIds }, rooms)}</small>
                  </div>

                  <div className="row-actions">
                    {isEditingUser ? (
                      <>
                        <button className="secondary-button compact" onClick={() => closeManagedUserEditor(managedUser.id)} type="button">
                          Renunta
                        </button>
                        <button
                          className="primary-button compact"
                          disabled={!userDraftChanged || (draftRoomAccess === "selected" && draftAllowedRoomIds.length === 0)}
                          onClick={() => saveManagedUserEditor(managedUser)}
                          type="button"
                        >
                          Salveaza
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="secondary-button compact" disabled={!canEditManagedUser} onClick={() => openManagedUserEditor(managedUser)} type="button">
                          Editeaza
                        </button>
                        <button
                          className="secondary-button compact danger-button"
                          disabled={!canEditManagedUser}
                          onClick={() => onRemoveManagedUser(managedUser)}
                          type="button"
                        >
                          Sterge
                        </button>
                      </>
                    )}
                  </div>
                </div>
                );
              })}
          </div>

          <div className="modal-actions">
            <button className="primary-button" onClick={() => setUsersManagerOpen(false)} type="button">
              Gata
            </button>
          </div>
        </section>
      </div>
    )}

    {profileEditorOpen && (
      <div className="modal-backdrop" role="presentation" onMouseDown={closeProfileEditor}>
        <section
          className="modal-card small-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-settings-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Profil</span>
              <h2 id="profile-settings-title">Setari personale</h2>
            </div>
          </div>

          <div className="settings-form">
            <label>
              Limba
              <select
                value={personalDraft.language}
                onChange={(event) =>
                  setPersonalDraft({
                    ...personalDraft,
                    language: event.target.value as AppLanguage,
                  })
                }
              >
                <option value="ro">Romana</option>
              </select>
            </label>

            <label>
              Nume
              <input
                value={personalDraft.displayName}
                onChange={(event) =>
                  setPersonalDraft({
                    ...personalDraft,
                    displayName: event.target.value,
                  })
                }
              />
            </label>

            {!isOwner && (
              <label>
                {groupsLabelDraft.trim() || defaultGroupsLabel}
                <select
                  value={personalDraft.groupName}
                  onChange={(event) =>
                    setPersonalDraft({
                      ...personalDraft,
                      groupName: event.target.value,
                    })
                  }
                >
                  <option value="">Alege {(groupsLabelDraft.trim() || defaultGroupsLabel).toLowerCase()}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="settings-toggle-stack">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={personalDraft.usePin}
                  onChange={(event) => onHandlePinToggle(event.target.checked)}
                />
                Blocare cu PIN
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={personalDraft.useBiometrics}
                  onChange={(event) => onHandleBiometricsToggle(event.target.checked)}
                />
                Biometrie
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={personalDraft.lockOnHide}
                  onChange={(event) =>
                    setPersonalDraft({
                      ...personalDraft,
                      lockOnHide: event.target.checked,
                    })
                  }
                />
                Blocheaza cand iesi din aplicatie
              </label>
            </div>

            {!isOwner && (
              <div className="settings-toggle-stack">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={personalDraft.notifyGroupBookings}
                    onChange={(event) =>
                      setPersonalDraft({
                        ...personalDraft,
                        notifyGroupBookings: event.target.checked,
                      })
                    }
                  />
                  Notificari pentru programarile grupului meu
                </label>

                {personalDraft.notifyGroupBookings && (
                  <div className="notification-options">
                    <label className="toggle-row compact-toggle">
                      <input
                        type="checkbox"
                        checked={personalDraft.notifyFixedGroupSchedules}
                        onChange={(event) =>
                          setPersonalDraft({
                            ...personalDraft,
                            notifyFixedGroupSchedules: event.target.checked,
                          })
                        }
                      />
                      Include si programarile recurente ale grupului meu
                    </label>
                    {personalDraft.notifyOffsets.map((offset, index) => {
                      const unit = offset.endsWith("h") ? "h" : "d";
                      const amount = Math.max(1, Number(offset.slice(0, -1)) || 1);

                      return (
                      <label key={`${offset}-${index}`}>
                        Cu cat timp inainte
                        <div className="inline-add">
                          <input
                            min={1}
                            max={unit === "h" ? 48 : 30}
                            type="number"
                            value={amount}
                            onChange={(event) => updateNotificationOffset(index, event.target.value)}
                          />
                          <select value={unit} onChange={(event) => updateNotificationOffsetUnit(index, event.target.value as "h" | "d")}>
                            <option value="h">ore</option>
                            <option value="d">zile</option>
                          </select>
                          <button className="secondary-button compact" onClick={() => removeNotificationOffset(index)} type="button">
                            Sterge
                          </button>
                        </div>
                      </label>
                      );
                    })}
                    {personalDraft.notifyOffsets.length < 5 && (
                      <button className="secondary-button compact" onClick={addNotificationOffset} type="button">
                        Adauga notificare
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button className="secondary-button" onClick={closeProfileEditor} type="button">
                Renunta
              </button>
              <button className="primary-button" disabled={!profileDirty} onClick={saveProfileEditor} type="button">
                Salveaza modificarile
              </button>
            </div>
          </div>
        </section>
      </div>
    )}

    {newsletterPanelOpen && (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setNewsletterPanelOpen(false)}>
        <section
          className="modal-card community-message-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-panel-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Newsletter</span>
              <h2 id="newsletter-panel-title">Actualizari</h2>
            </div>
            <button className="icon-button" onClick={() => setNewsletterPanelOpen(false)} type="button" aria-label="Inchide">
              x
            </button>
          </div>

          <div className="settings-summary-list compact-summary-list">
            <div>
              <span>Abonati activi</span>
              <strong>{newsletterSubscriberRows.length}</strong>
            </div>
            <div>
              <span>Campanii trimise</span>
              <strong>{newsletterCampaigns.length}</strong>
            </div>
          </div>

          {(newsletterError || newsletterLocalError) && (
            <p className="error-line">{newsletterError || newsletterLocalError}</p>
          )}
          {newsletterMessage && <p className="success-line">{newsletterMessage}</p>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={copyNewsletterEmails} type="button">
              Copiaza emailurile
            </button>
            <button className="primary-button" onClick={() => openNewsletterComposer()} type="button">
              Trimite update tuturor
            </button>
          </div>

          <div className="mini-list newsletter-list">
            {newsletterSubscriberRows.length === 0 ? (
              <p className="empty-line">Nu exista abonati activi.</p>
            ) : (
              newsletterSubscriberRows.map((subscriber) => (
                <div className="mini-row" key={subscriber.id}>
                  <div className="mini-row-main">
                    <span>{subscriber.email}</span>
                    <small>Inscris: {communityDateLabel(subscriber.createdAt)}</small>
                  </div>
                  <button
                    className="secondary-button compact"
                    onClick={() => openNewsletterComposer(subscriber.email)}
                    type="button"
                  >
                    Trimite
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="newsletter-campaign-list">
            {newsletterCampaigns.slice(0, 5).map((campaign) => (
              <div className="mini-row" key={campaign.id}>
                <div className="mini-row-main">
                  <span>{campaign.subject}</span>
                  <small>
                    {campaign.recipientEmail ? `catre ${campaign.recipientEmail} · ` : ""}
                    {newsletterCampaignStatusLabel(campaign.status)} · {campaign.sentCount}/{campaign.recipientCount} trimise
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    )}

    {newsletterComposerOpen && (
      <div
        className="modal-backdrop"
        role="presentation"
        onMouseDown={() => {
          setNewsletterComposerOpen(false);
          setNewsletterTargetEmail("");
        }}
      >
        <section
          className="modal-card small-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Newsletter</span>
              <h2 id="newsletter-title">Trimite update</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                setNewsletterComposerOpen(false);
                setNewsletterTargetEmail("");
              }}
              type="button"
              aria-label="Închide"
            >
              ×
            </button>
          </div>

          <p className="muted-note">
            {newsletterTargetEmail
              ? `Emailul va fi trimis prin Resend catre ${newsletterTargetEmail}.`
              : `Emailul va fi trimis prin Resend catre ${newsletterSubscriberRows.length} abonati activi.`}
          </p>

          <div className="settings-form newsletter-compose">
            <label>
              Subiect
              <input
                value={newsletterDraft.subject}
                onChange={(event) => setNewsletterDraft((current) => ({ ...current, subject: event.target.value }))}
                placeholder="ex. Noutăți Kelunia pentru luna aceasta"
              />
            </label>

            <label>
              Mesaj
              <textarea
                value={newsletterDraft.body}
                onChange={(event) => setNewsletterDraft((current) => ({ ...current, body: event.target.value }))}
                placeholder="Scrie update-ul pe care vrei să îl primească abonații."
              />
            </label>

            {(newsletterError || newsletterLocalError) && (
              <p className="error-line">{newsletterError || newsletterLocalError}</p>
            )}
            {newsletterMessage && <p className="success-line">{newsletterMessage}</p>}

            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setNewsletterComposerOpen(false);
                  setNewsletterTargetEmail("");
                }}
                disabled={newsletterWorking}
                type="button"
              >
                Renunță
              </button>
              <button className="primary-button" disabled={newsletterWorking} onClick={sendNewsletter} type="button">
                {newsletterWorking ? "Se pornește..." : "Trimite către toți"}
              </button>
            </div>
          </div>
        </section>
      </div>
    )}

    {inboxOpen && (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setInboxOpen(false)}>
        <section
          className="modal-card community-message-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-inbox-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Inbox</span>
              <h2 id="landing-inbox-title">Mesaje Landing</h2>
            </div>
            <button className="icon-button" onClick={() => setInboxOpen(false)} type="button" aria-label="Închide">
              ×
            </button>
          </div>

          <p className="muted-note">
            {communityApplications.length} mesaje primite
            {unreadLandingMessageCount > 0 ? ` · ${unreadLandingMessageCount} necitite` : ""}
          </p>

          {communityApplicationsError && <p className="error-line">{communityApplicationsError}</p>}

          <div className="mini-list message-inbox-list">
            {communityApplications.length === 0 ? (
              <p className="empty-line">Nu există mesaje de pe landing page.</p>
            ) : (
              communityApplications.map((application) => (
                <div
                  className={`mini-row community-application-row ${application.status === "new" ? "unread" : ""}`}
                  key={application.id}
                  onClick={() => openCommunityApplication(application)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCommunityApplication(application);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mini-row-main">
                    <span>{application.organizationName}</span>
                    <small>
                      {communitySourceLabel(application.source)} · {application.email} · {communityDateLabel(application.createdAt)}
                    </small>
                    <small>{application.details}</small>
                    <small>Status: {communityStatusLabel(application.status)}</small>
                  </div>

                  {application.status === "new" && (
                    <div className="row-actions">
                      <span className="badge-pill">nou</span>
                      <button
                        className="secondary-button compact"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMarkCommunityApplicationReviewed(application.id);
                        }}
                        type="button"
                      >
                        Marchează citită
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    )}

    {activeCommunityApplication && (
      <div
        className="modal-backdrop"
        role="presentation"
        onMouseDown={closeCommunityApplication}
      >
        <section
          className="modal-card community-message-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="community-message-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">{communitySourceLabel(activeCommunityApplication.source)}</span>
              <h2 id="community-message-title">{activeCommunityApplication.organizationName}</h2>
            </div>
            <button
              className="icon-button"
              onClick={closeCommunityApplication}
              type="button"
              aria-label="Închide"
            >
              ×
            </button>
          </div>

          <div className="message-detail">
            <div className="message-meta">
              <span>De la</span>
              <strong>{activeCommunityApplication.email}</strong>
            </div>
            <div className="message-meta">
              <span>Primită</span>
              <strong>{communityDateLabel(activeCommunityApplication.createdAt)}</strong>
            </div>
            <div className="message-meta">
              <span>Status</span>
              <strong>{communityStatusLabel(activeCommunityApplication.status)}</strong>
            </div>

            <div className="message-thread">
              <article className="message-bubble inbound">
                <small>Cererea inițială</small>
                <p>{activeCommunityApplication.details}</p>
              </article>

              {communityMessagesError && <p className="error-line">{communityMessagesError}</p>}

              {communityMessages.map((message) => (
                <article className="message-bubble outbound" key={message.id}>
                  <small>
                    Răspuns · {communityDateLabel(message.createdAt)} · {message.deliveryStatus === "sent" ? "trimis" : message.deliveryStatus === "failed" ? "eroare trimitere" : "în curs de trimitere"}
                  </small>
                  <p>{message.body}</p>
                  {message.errorMessage && <small>{message.errorMessage}</small>}
                </article>
              ))}
            </div>

            <label className="reply-composer">
              Răspuns
              <textarea
                value={communityReplyDraft}
                onChange={(event) => setCommunityReplyDraft(event.target.value)}
                placeholder="Scrie răspunsul pentru această organizație..."
              />
            </label>

            {communityReplyError && <p className="error-line">{communityReplyError}</p>}
            {communityReplyMessage && <p className="success-line">{communityReplyMessage}</p>}
          </div>

          <div className="modal-actions community-actions">
            <button
              className="primary-button"
              disabled={communityReplyWorking}
              onClick={saveCommunityReply}
              type="button"
            >
              Trimite răspunsul
            </button>
            <button
              className="secondary-button"
              disabled={communityReplyWorking}
              onClick={() => updateCommunityStatus("approved")}
              type="button"
            >
              Aprobată
            </button>
            <button
              className="secondary-button danger-button"
              disabled={communityReplyWorking}
              onClick={() => updateCommunityStatus("declined")}
              type="button"
            >
              Respinsă
            </button>
            <button className="primary-button" onClick={closeCommunityApplication} type="button">
              Închide
            </button>
          </div>
        </section>
      </div>
    )}
    </>
  );
}
