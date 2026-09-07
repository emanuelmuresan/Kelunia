"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth, type AppLanguage, type UserRole } from "@/context/AuthContext";
import { DeleteAccountModal } from "@/features/settings/components/DeleteAccountModal";
import { NewsletterModal } from "@/features/settings/components/NewsletterModal";
import { LandingInboxModal } from "@/features/settings/components/LandingInboxModal";
import { ResourcesManagerModal } from "@/features/settings/components/ResourcesManagerModal";
import { UsersManagerModal } from "@/features/settings/components/UsersManagerModal";
import { ProfileEditorModal } from "@/features/settings/components/ProfileEditorModal";
import { appText, localeLabel, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";
import { billingStatusLabel, dateFromFirestoreValue, planLabel } from "@/lib/licensing";
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
  pinResetRequired: boolean;
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
  pinResetRequired,
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
  const { user, profile } = useAuth();
  const language = personalDraft.language;
  const t = (key: UiCopyKey) => appText(language, key);
  const showLocationSettings = !isOwner || Boolean(currentLocationId);
  const [newsletterPanelOpen, setNewsletterPanelOpen] = useState(false);
  const [pagesEditing, setPagesEditing] = useState(false);
  const [resourcesManagerOpen, setResourcesManagerOpen] = useState(false);
  const [usersManagerOpen, setUsersManagerOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [ownerNotificationPermission, setOwnerNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const accountEmail = user?.email ?? profile?.email ?? "";
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

  useEffect(() => {
    refreshOwnerNotificationPermission();
  }, []);

  function refreshOwnerNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setOwnerNotificationPermission("unsupported");
      return;
    }

    setOwnerNotificationPermission(Notification.permission);
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

  return (
    <>
    <section className="settings-grid">
      {pinResetRequired && (
        <p className="error-line settings-alert">
          Din motive de securitate, PIN-ul de blocare a fost resetat. Activează din nou „Blocare cu PIN”
          și alege un cod nou.
        </p>
      )}
      {settingsError && <p className="error-line settings-alert">{settingsError}</p>}
      {settingsMessage && <p className="success-line settings-alert">{settingsMessage}</p>}

      <article className="settings-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("settings.profile")}</span>
            <h2>{t("settings.personal")}</h2>
          </div>
        </div>

        {userExists ? (
          <>
          <div className="settings-summary-list profile-summary-list">
            <div>
              <span>{t("settings.name")}</span>
              <strong>{personalDraft.displayName || t("settings.notSet")}</strong>
            </div>
            <div>
              <span>{t("settings.role")}</span>
              <strong>{isOwner ? t("role.owner") : isSuperAdmin ? t("role.administrator") : t("role.collaborator")}</strong>
            </div>
            <div>
              <span>{appText(personalDraft.language, "common.language")}</span>
              <strong>{localeLabel(personalDraft.language)}</strong>
            </div>
            {!isOwner && (
              <div>
                <span>{groupsLabelDraft.trim() || defaultGroupsLabel}</span>
                <strong>{personalDraft.groupName || t("settings.notChosen")}</strong>
              </div>
            )}
            <div>
              <span>{t("settings.security")}</span>
              <strong>
                {personalDraft.useBiometrics
                  ? t("settings.lockPinBiometric")
                  : personalDraft.usePin
                    ? t("settings.lockPin")
                    : t("settings.lockNone")}
              </strong>
            </div>
            <div>
              <span>{t("settings.blockOnExit")}</span>
              <strong>{personalDraft.lockOnHide ? t("settings.active") : t("settings.inactive")}</strong>
            </div>
            {!isOwner && (
              <div>
                <span>{t("settings.notifications")}</span>
                <strong>
                  {personalDraft.notifyGroupBookings
                    ? `${personalDraft.notifyOffsets.length} active`
                    : t("settings.inactive")}
                </strong>
              </div>
            )}
          </div>

          <div className="settings-card-actions">
            <button className="primary-button compact" onClick={() => setProfileEditorOpen(true)} type="button">
              {t("settings.editSettings")}
            </button>
            <button className="secondary-button compact" onClick={onOpenPasswordModal} type="button">
              {t("settings.password")}
            </button>
            <button className="danger-button compact" onClick={() => setDeleteAccountOpen(true)} type="button">
              Șterge contul
            </button>
          </div>

          </>
        ) : (
          <div className="empty-state">
            <p>{t("auth.signIn")}</p>
            <Link className="primary-link" href="/login">
              {t("auth.signIn")}
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
                <span className="eyebrow">{t("settings.navigation")}</span>
                <h2>{t("settings.pages")}</h2>
              </div>
              {canEditCurrentLocation && !pagesEditing && (
                <button className="secondary-button compact" onClick={() => setPagesEditing(true)} type="button">
                  {t("settings.edit")}
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
                {t("nav.fixed")}
                <input
                  value={fixedSectionDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  onChange={(event) => setFixedSectionDraft(event.target.value)}
                />
              </label>

              <label>
                {t("nav.list")}
                <input
                  value={listViewDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  onChange={(event) => setListViewDraft(event.target.value)}
                />
              </label>

              <label>
                {t("settings.organization")}
                <input
                  value={resourcesSectionDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  placeholder={defaultResourcesSectionTitle}
                  onChange={(event) => setResourcesSectionDraft(event.target.value)}
                />
              </label>

              <label>
                {defaultRoomsLabel}
                <input
                  value={roomsLabelDraft}
                  disabled={!canEditCurrentLocation || !pagesEditing}
                  placeholder={defaultRoomsLabel}
                  onChange={(event) => setRoomsLabelDraft(event.target.value)}
                />
              </label>

              <label>
                {defaultGroupsLabel}
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
                    {t("action.cancel")}
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      onSaveNavigationSettings();
                      setPagesEditing(false);
                    }}
                    type="button"
                  >
                    {t("action.save")}
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
                <span className="eyebrow">{t("settings.access")}</span>
                <h2>{t("settings.codes")}</h2>
              </div>

              {canManageAccessCodes && (
                <button className="secondary-button compact" onClick={onOpenCodesEditor} type="button">
                  {t("settings.edit")}
                </button>
              )}
            </div>

            <div className="settings-summary-list">
              <div>
                <span>{t("settings.plan")}</span>
                <strong>{licenseAccess.planLabel}</strong>
              </div>
              <div>
                <span>{t("settings.licenseStatus")}</span>
                <strong>{licenseAccess.statusLabel}</strong>
              </div>

              <div>
                <span>{t("settings.validity")}</span>
                <strong>{licenseRemainingLabel(licenseAccess)}</strong>
              </div>

              <div>
                <span>{t("settings.currentLocation")}</span>
                <strong>{currentLocationCodeCount} coduri</strong>
              </div>

              <div>
                <span>{t("settings.administrators")}</span>
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
                  <span className="eyebrow">{t("role.owner")}</span>
                  <h2>{t("settings.locations")}</h2>
                </div>
              </div>

              <p className="muted-note">{locations.length} locatii in workspace.</p>

              <div className="mini-list">
                {locations.length === 0 ? (
                  <p className="empty-line">{t("settings.noItems")}</p>
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
                  <span className="eyebrow">{t("settings.organization")}</span>
                <h2>{resourcesSectionDraft.trim() || defaultResourcesSectionTitle}</h2>
              </div>
            </div>

            <div className="owner-tool-grid">
              <div className="owner-tool-card">
                <div>
                  <span className="eyebrow">{roomsLabelDraft.trim() || defaultRoomsLabel}</span>
                  <h3>{rooms.length} {rooms.length === 1 ? "element" : "elemente"}</h3>
                  <p>{rooms.length > 0 ? rooms.slice(0, 3).map((room) => room.name).join(", ") : t("settings.noItems")}</p>
                </div>
              </div>

              <div className="owner-tool-card">
                <div>
                  <span className="eyebrow">{groupsLabelDraft.trim() || defaultGroupsLabel}</span>
                  <h3>{groups.length} {groups.length === 1 ? "element" : "elemente"}</h3>
                  <p>{groups.length > 0 ? groups.slice(0, 3).map((group) => group.name).join(", ") : t("settings.noItems")}</p>
                </div>
              </div>
            </div>

            <div className="modal-actions inline-actions">
              <button className="primary-button compact" onClick={() => setResourcesManagerOpen(true)} type="button">
                {t("settings.resourcesOpen")}
              </button>
            </div>
          </article>
          )}

          {showLocationSettings && (
          <article className="settings-panel wide">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t("settings.users")}</span>
                <h2>{visibleManagedUsers.length} conturi</h2>
              </div>
            </div>

            <div className="owner-tool-card">
              <div>
                <span className="eyebrow">{t("settings.access")}</span>
                <h3>{visibleManagedUsers.length} {visibleManagedUsers.length === 1 ? "utilizator" : "utilizatori"}</h3>
                <p>
                  {visibleManagedUsers.filter((item) => item.role === "manager").length} administratori ·{" "}
                  {visibleManagedUsers.filter((item) => item.role !== "manager").length} colaboratori si oaspeti
                </p>
              </div>
              <div className="owner-tool-actions">
                <button className="primary-button compact" onClick={() => setUsersManagerOpen(true)} type="button">
                  {t("settings.users")}
                </button>
              </div>
            </div>
          </article>
          )}
        </>
      )}
    </section>

    {resourcesManagerOpen && (
      <ResourcesManagerModal
        language={language}
        title={resourcesSectionDraft.trim() || defaultResourcesSectionTitle}
        roomsLabel={roomsLabelDraft.trim() || defaultRoomsLabel}
        groupsLabel={groupsLabelDraft.trim() || defaultGroupsLabel}
        rooms={rooms}
        groups={groups}
        canEditCurrentLocation={canEditCurrentLocation}
        onClose={() => setResourcesManagerOpen(false)}
        onOpenSpaceEditor={onOpenSpaceEditor}
        onRemoveSpaceItem={onRemoveSpaceItem}
      />
    )}

    {usersManagerOpen && (
      <UsersManagerModal
        language={language}
        managedUsers={visibleManagedUsers}
        rooms={rooms}
        canManageMembers={canManageMembers}
        currentLocationId={currentLocationId}
        onClose={() => setUsersManagerOpen(false)}
        onUpdateManagedUserRole={onUpdateManagedUserRole}
        onUpdateManagedUserRoomAccess={onUpdateManagedUserRoomAccess}
        onRemoveManagedUser={onRemoveManagedUser}
      />
    )}

    {profileEditorOpen && (
      <ProfileEditorModal
        isOwner={isOwner}
        groups={groups}
        groupsLabel={groupsLabelDraft.trim() || defaultGroupsLabel}
        personalDraft={personalDraft}
        setPersonalDraft={setPersonalDraft}
        onClose={() => setProfileEditorOpen(false)}
        onSave={onSavePersonalSettings}
        onHandlePinToggle={onHandlePinToggle}
        onHandleBiometricsToggle={onHandleBiometricsToggle}
      />
    )}

    {deleteAccountOpen && (
      <DeleteAccountModal
        accountEmail={accountEmail}
        language={language}
        onClose={() => setDeleteAccountOpen(false)}
      />
    )}

    {newsletterPanelOpen && (
      <NewsletterModal
        subscriberRows={newsletterSubscriberRows}
        campaigns={newsletterCampaigns}
        newsletterError={newsletterError}
        onClose={() => setNewsletterPanelOpen(false)}
        onSendNewsletterCampaign={onSendNewsletterCampaign}
      />
    )}

    {inboxOpen && (
      <LandingInboxModal
        applications={communityApplications}
        applicationsError={communityApplicationsError}
        unreadCount={unreadLandingMessageCount}
        onClose={() => setInboxOpen(false)}
        onMarkReviewed={onMarkCommunityApplicationReviewed}
        onSendReply={onSendCommunityApplicationReply}
        onUpdateStatus={onUpdateCommunityApplicationStatus}
        onOpenLicenseCodes={onOpenLicenseCodes}
      />
    )}

    </>
  );
}
