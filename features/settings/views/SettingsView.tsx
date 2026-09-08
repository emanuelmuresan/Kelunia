"use client";

import { useState } from "react";
import { useAuth, type AppLanguage, type UserRole } from "@/context/AuthContext";
import { DeleteAccountModal } from "@/features/settings/components/DeleteAccountModal";
import { NewsletterModal } from "@/features/settings/components/NewsletterModal";
import { LandingInboxModal } from "@/features/settings/components/LandingInboxModal";
import { ResourcesManagerModal } from "@/features/settings/components/ResourcesManagerModal";
import { UsersManagerModal } from "@/features/settings/components/UsersManagerModal";
import { ProfileEditorModal } from "@/features/settings/components/ProfileEditorModal";
import { ProfileSummaryCard } from "@/features/settings/components/ProfileSummaryCard";
import { TickerSettingsCard } from "@/features/settings/components/TickerSettingsCard";
import type { UpcomingTickerSettings } from "@/features/calendar/hooks/useUpcomingTickerSettings";
import { PagesSettingsCard } from "@/features/settings/components/PagesSettingsCard";
import { LicenseSummaryCard, type LicenseAccess } from "@/features/settings/components/LicenseSummaryCard";
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
  tickerSettings: UpcomingTickerSettings;
  onTickerSettingsChange: (patch: Partial<UpcomingTickerSettings>) => void;
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
  tickerSettings,
  onTickerSettingsChange,
}: SettingsViewProps) {
  const { user, profile } = useAuth();
  const language: AppLanguage = personalDraft.language;
  const showLocationSettings = !isOwner || Boolean(currentLocationId);
  const resourcesTitle = resourcesSectionDraft.trim() || defaultResourcesSectionTitle;
  const roomsLabel = roomsLabelDraft.trim() || defaultRoomsLabel;
  const groupsLabel = groupsLabelDraft.trim() || defaultGroupsLabel;

  const [newsletterPanelOpen, setNewsletterPanelOpen] = useState(false);
  const [resourcesManagerOpen, setResourcesManagerOpen] = useState(false);
  const [usersManagerOpen, setUsersManagerOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

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

      <ProfileSummaryCard
        userExists={userExists}
        isOwner={isOwner}
        isSuperAdmin={isSuperAdmin}
        personalDraft={personalDraft}
        groupsLabel={groupsLabel}
        onEditProfile={() => setProfileEditorOpen(true)}
        onOpenPasswordModal={onOpenPasswordModal}
        onDeleteAccount={() => setDeleteAccountOpen(true)}
      />

      {userExists && (
        <TickerSettingsCard
          language={language}
          settings={tickerSettings}
          onChange={onTickerSettingsChange}
        />
      )}

      {(isSuperAdmin || isOwner) && (
        <>
          {showLocationSettings && (
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

          {showLocationSettings && (
            <LicenseSummaryCard
              language={language}
              licenseAccess={licenseAccess}
              currentLocationCodeCount={currentLocationCodeCount}
              currentLocationManagerAccountCount={currentLocationManagerAccountCount}
              currentLocationManagerLimit={currentLocationManagerLimit}
              canManageAccessCodes={canManageAccessCodes}
              onOpenCodesEditor={onOpenCodesEditor}
            />
          )}

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

          {showLocationSettings && (
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

          {showLocationSettings && (
            <UsersSummaryCard
              language={language}
              managedUsers={visibleManagedUsers}
              onOpenUsersManager={() => setUsersManagerOpen(true)}
            />
          )}
        </>
      )}
    </section>

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
        groupsLabel={groupsLabel}
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
