"use client";

import { useState } from "react";
import { useAuth, type AppLanguage, type UserRole } from "@/context/AuthContext";
import { DeleteAccountModal } from "@/features/settings/components/DeleteAccountModal";
import { NewsletterModal } from "@/features/settings/components/NewsletterModal";
import { LandingInboxModal } from "@/features/settings/components/LandingInboxModal";
import { ResourcesManagerModal } from "@/features/settings/components/ResourcesManagerModal";
import { UsersManagerModal } from "@/features/settings/components/UsersManagerModal";
import { LocationClosureCard } from "@/features/locations/components/LocationClosureCard";
import { ProfileEditorModal, type ProfileSection } from "@/features/settings/components/ProfileEditorModal";
import { ProfileSettingsModal } from "@/features/settings/components/ProfileSettingsModal";
import Link from "next/link";

import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { SettingsSectionCard, SettingsSectionModal } from "@/features/settings/components/SettingsSection";
import { ReportProblemModal } from "@/features/shell/components/ReportProblemModal";
import { ErrorReportsModal } from "@/features/settings/components/ErrorReportsModal";
import type { ErrorReport } from "@/features/settings/hooks/useErrorReports";
import { TickerSettingsCard } from "@/features/settings/components/TickerSettingsCard";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";
import { PagesSettingsCard } from "@/features/settings/components/PagesSettingsCard";
import { LicenseSummaryCard, type LicenseAccess } from "@/features/settings/components/LicenseSummaryCard";
import { appText } from "@/lib/i18n/app-copy-catalog";
import { OwnerLocationsCard } from "@/features/settings/components/OwnerLocationsCard";
import { ResourcesSummaryCard } from "@/features/settings/components/ResourcesSummaryCard";
import { UsersSummaryCard } from "@/features/settings/components/UsersSummaryCard";
import type {
  CommunityApplication,
  CommunityApplicationStatus,
  GroupItem,
  LocationItem,
  ManagedUser,
  NewsletterCampaign,
  NewsletterSubscriber,
  PersonalDraft,
  RoomAccessMode,
  RoomItem,
  SpaceKind,
} from "@/lib/types/domain";

type SettingsViewProps = {
  settingsError: string;
  onSettingsMessage: (text: string) => void;
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
  onApplyDevicePush: () => void | Promise<void>;
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
  tickerSettings: UpcomingTickerSettings;
  onTickerSettingsChange: (patch: Partial<UpcomingTickerSettings>) => void;
  errorReports: ErrorReport[];
  errorReportsError: string;
  onResolveErrorReport: (reportId: string) => Promise<void>;
};

export function SettingsView({
  settingsError,
  onSettingsMessage,
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
  onApplyDevicePush,
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
  tickerSettings,
  onTickerSettingsChange,
  errorReports,
  errorReportsError,
  onResolveErrorReport,
}: SettingsViewProps) {
  const { user, profile } = useAuth();
  const language: AppLanguage = personalDraft.language;
  const showLocationSettings = !isOwner || Boolean(currentLocationId);
  const hasAdminSections = isSuperAdmin || isOwner;
  const resourcesTitle = resourcesSectionDraft.trim() || defaultResourcesSectionTitle;
  const roomsLabel = roomsLabelDraft.trim() || defaultRoomsLabel;
  const groupsLabel = groupsLabelDraft.trim() || defaultGroupsLabel;

  const [newsletterPanelOpen, setNewsletterPanelOpen] = useState(false);
  const [resourcesManagerOpen, setResourcesManagerOpen] = useState(false);
  const [usersManagerOpen, setUsersManagerOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [openSection, setOpenSection] = useState<"config" | "access" | "support" | null>(null);
  const [profileEditorSection, setProfileEditorSection] = useState<ProfileSection | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  const [errorReportsOpen, setErrorReportsOpen] = useState(false);

  const accountEmail = user?.email ?? profile?.email ?? "";
  // The last administrator of a location cannot delete their account: nobody
  // would be left to manage it (deleteMyAccount enforces this server-side too).
  const currentLocation = locations.find((item) => item.id === currentLocationId);
  const locationClosing = Boolean(currentLocation?.closureScheduledFor);
  const isSoleAdmin =
    !isOwner &&
    isSuperAdmin &&
    !locationClosing &&
    !visibleManagedUsers.some((item) => item.role === "manager" && !item.isOwner && item.id !== user?.uid);
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

      {!userExists && (
        <article className="settings-panel">
          <div className="empty-state">
            <p>{appText(language, "auth.signIn")}</p>
            <Link className="primary-link" href="/login">
              {appText(language, "auth.signIn")}
            </Link>
          </div>
        </article>
      )}

      {userExists && (
        <>
          <SettingsSectionCard
            language={language}
            title={appText(language, "settings.sectionProfile")}
            description={appText(language, "settings.sectionProfileDesc")}
            onOpen={() => setProfileViewOpen(true)}
          />

          <SettingsSectionCard
            language={language}
            title={appText(language, "settings.sectionConfig")}
            description={appText(language, "settings.sectionConfigDesc")}
            onOpen={() => setOpenSection("config")}
          />

          {hasAdminSections && (
            <SettingsSectionCard
              language={language}
              title={appText(language, "settings.sectionAccess")}
              description={appText(language, "settings.sectionAccessDesc")}
              onOpen={() => setOpenSection("access")}
            />
          )}

          <SettingsSectionCard
            language={language}
            title={appText(language, "settings.support")}
            description={appText(language, isOwner ? "settings.sectionSupportOwnerDesc" : "settings.sectionSupportDesc")}
            onOpen={() => setOpenSection("support")}
          />

          {isOwner && (
            <OwnerLocationsCard
              language={language}
              locations={locations}
              currentLocationId={currentLocationId}
              licenseCodeCount={licenseCodeCount}
              newsletterSubscriberCount={newsletterSubscriberRows.length}
              communityApplicationsCount={communityApplications.length}
              communityApplicationsError={communityApplicationsError}
              unreadLandingMessageCount={unreadLandingMessageCount}
              onSelectLocation={onSelectLocation}
              onOpenLocationEditor={onOpenLocationEditor}
              onOpenLicenseCodes={onOpenLicenseCodes}
              onOpenNewsletter={() => setNewsletterPanelOpen(true)}
              onOpenInbox={() => setInboxOpen(true)}
              onEnableOwnerNotifications={onEnableOwnerNotifications}
            />
          )}
        </>
      )}
    </section>

    {openSection === "config" && (
      <SettingsSectionModal
        language={language}
        title={appText(language, "settings.sectionConfig")}
        description={appText(language, "settings.sectionConfigDesc")}
        onClose={() => setOpenSection(null)}
      >
        {hasAdminSections && showLocationSettings && (
          <PagesSettingsCard
            language={language}
            canEditCurrentLocation={canEditCurrentLocation}
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
            onSaveNavigationSettings={onSaveNavigationSettings}
          />
        )}

        <TickerSettingsCard language={language} settings={tickerSettings} onChange={onTickerSettingsChange} />

        {hasAdminSections && showLocationSettings && (
          <ResourcesSummaryCard
            language={language}
            title={resourcesTitle}
            roomsLabel={roomsLabel}
            groupsLabel={groupsLabel}
            rooms={rooms}
            groups={groups}
            onOpenResourcesManager={() => setResourcesManagerOpen(true)}
          />
        )}
      </SettingsSectionModal>
    )}

    {openSection === "access" && hasAdminSections && (
      <SettingsSectionModal
        language={language}
        title={appText(language, "settings.sectionAccess")}
        description={appText(language, "settings.sectionAccessDesc")}
        onClose={() => setOpenSection(null)}
      >
        {showLocationSettings && (
          <>
            <LicenseSummaryCard
              language={language}
              licenseAccess={licenseAccess}
              currentLocationCodeCount={currentLocationCodeCount}
              currentLocationManagerAccountCount={currentLocationManagerAccountCount}
              currentLocationManagerLimit={currentLocationManagerLimit}
              canManageAccessCodes={canManageAccessCodes}
              onOpenCodesEditor={onOpenCodesEditor}
            />

            <UsersSummaryCard
              language={language}
              managedUsers={visibleManagedUsers}
              onOpenUsersManager={() => setUsersManagerOpen(true)}
            />

            {currentLocationId && (
              <LocationClosureCard
                language={language}
                locationId={currentLocationId}
                locationName={currentLocation?.name ?? ""}
                closureScheduledFor={currentLocation?.closureScheduledFor}
                onMessage={onSettingsMessage}
              />
            )}
          </>
        )}
      </SettingsSectionModal>
    )}

    {openSection === "support" && (
      <SettingsSectionModal
        language={language}
        title={appText(language, "settings.support")}
        description={appText(language, isOwner ? "settings.sectionSupportOwnerDesc" : "settings.sectionSupportDesc")}
        onClose={() => setOpenSection(null)}
      >
        <SettingsBlock
          title={appText(language, "settings.reportProblem")}
          hint={appText(language, "settings.reportProblemHint")}
          action={
            <button className="secondary-button compact" onClick={() => setReportProblemOpen(true)} type="button">
              {appText(language, "settings.reportProblem")}
            </button>
          }
        >
          {null}
        </SettingsBlock>

        {isOwner && (
          <SettingsBlock
            title={appText(language, "settings.errorReportsTitle")}
            action={
              <button className="secondary-button compact" onClick={() => setErrorReportsOpen(true)} type="button">
                {appText(language, "settings.openAction")}
              </button>
            }
          >
            <div className="settings-summary-list">
              <div>
                <span>{appText(language, "settings.errorReportsTotal")}</span>
                <strong>{errorReports.length}</strong>
              </div>
              <div>
                <span>{appText(language, "settings.errorReportsUnresolved")}</span>
                <strong>{errorReports.filter((report) => report.status === "new").length}</strong>
              </div>
            </div>
          </SettingsBlock>
        )}
      </SettingsSectionModal>
    )}

    {resourcesManagerOpen && (
      <ResourcesManagerModal
        language={language}
        title={resourcesTitle}
        roomsLabel={roomsLabel}
        groupsLabel={groupsLabel}
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
        currentUserId={user?.uid ?? ""}
        rooms={rooms}
        canManageMembers={canManageMembers}
        currentLocationId={currentLocationId}
        onClose={() => setUsersManagerOpen(false)}
        onUpdateManagedUserRole={onUpdateManagedUserRole}
        onUpdateManagedUserRoomAccess={onUpdateManagedUserRoomAccess}
        onRemoveManagedUser={onRemoveManagedUser}
      />
    )}

    {profileViewOpen && (
      <ProfileSettingsModal
        isOwner={isOwner}
        isSuperAdmin={isSuperAdmin}
        groupsLabel={groupsLabel}
        personalDraft={personalDraft}
        onEditSection={setProfileEditorSection}
        onOpenPasswordModal={onOpenPasswordModal}
        onDeleteAccount={() => setDeleteAccountOpen(true)}
        onClose={() => setProfileViewOpen(false)}
      />
    )}

    {profileEditorSection && (
      <ProfileEditorModal
        section={profileEditorSection}
        isOwner={isOwner}
        groups={groups}
        groupsLabel={groupsLabel}
        personalDraft={personalDraft}
        setPersonalDraft={setPersonalDraft}
        onClose={() => setProfileEditorSection(null)}
        onSave={onSavePersonalSettings}
        onHandlePinToggle={onHandlePinToggle}
        onHandleBiometricsToggle={onHandleBiometricsToggle}
        onApplyDevicePush={onApplyDevicePush}
      />
    )}

    {deleteAccountOpen && (
      <DeleteAccountModal
        accountEmail={accountEmail}
        isSoleAdmin={isSoleAdmin}
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

    <ReportProblemModal open={reportProblemOpen} onClose={() => setReportProblemOpen(false)} />

    {errorReportsOpen && (
      <ErrorReportsModal
        reports={errorReports}
        reportsError={errorReportsError}
        onClose={() => setErrorReportsOpen(false)}
        onResolve={onResolveErrorReport}
      />
    )}

    </>
  );
}
