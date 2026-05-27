"use client";

import type {
  Booking,
  GroupItem,
  ListFilter,
  SortDirection,
} from "@/lib/types/domain";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";
import { BookingRow } from "../components/BookingRow";

type ListViewProps = {
  listViewTitle: string;
  listBookings: Booking[];
  visibleListBookings: Booking[];
  groups: GroupItem[];
  reachedBookingsQueryLimit: boolean;
  listPageSize: number;
  listPage: number;
  totalListPages: number;
  listFilter: ListFilter;
  sortDirection: SortDirection;
  isOwner: boolean;
  isSuperAdmin: boolean;
  currentLocationId: string;
  profileGroupName?: string;
  language?: SupportedLocale;
  onListFilterChange: (filter: ListFilter) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onOpenAuditHistory: () => void;
  onSelectBooking: (booking: Booking) => void;
  onEditBooking: (booking: Booking) => void;
  onRemoveBooking: (booking: Booking) => void;
  canEditBooking: (booking: Booking) => boolean;
  onPageChange: (page: number) => void;
};

export function ListView({
  listViewTitle,
  listBookings,
  visibleListBookings,
  groups,
  reachedBookingsQueryLimit,
  listPageSize,
  listPage,
  totalListPages,
  listFilter,
  sortDirection,
  isOwner,
  isSuperAdmin,
  currentLocationId,
  profileGroupName,
  language = "ro",
  onListFilterChange,
  onSortDirectionChange,
  onOpenAuditHistory,
  onSelectBooking,
  onEditBooking,
  onRemoveBooking,
  canEditBooking,
  onPageChange,
}: ListViewProps) {
  return (
    <section className="workspace-panel">
      <div className="section-heading list-heading">
        <div>
          <span className="eyebrow">{listViewTitle}</span>
          <h2>{appText(language, "list.results").replace("{{count}}", String(listBookings.length))}</h2>
        </div>

        <div className="toolbar-actions">
          <select
            value={listFilter}
            onChange={(event) =>
              onListFilterChange(event.target.value as ListFilter)
            }
          >
            <option value="future">{appText(language, "list.future")}</option>
            <option value="past">{appText(language, "list.past")}</option>
            <option value="all">{appText(language, "list.all")}</option>
          </select>

          <select
            value={sortDirection}
            onChange={(event) =>
              onSortDirectionChange(event.target.value as SortDirection)
            }
          >
            <option value="asc">{appText(language, "list.ascending")}</option>
            <option value="desc">{appText(language, "list.descending")}</option>
          </select>

          {(isOwner || isSuperAdmin) && currentLocationId && (
            <button
              className="secondary-button compact history-button"
              onClick={onOpenAuditHistory}
              type="button"
            >
              {appText(language, "list.history")}
            </button>
          )}
        </div>
      </div>

      {reachedBookingsQueryLimit && (
        <p className="muted-note">
          {appText(language, "list.limitWarning")}
        </p>
      )}

      <div className="booking-list">
        {listBookings.length === 0 ? (
          <p className="empty-line">{appText(language, "list.emptyBookings")}</p>
        ) : (
          visibleListBookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              groups={groups}
              profileGroupName={profileGroupName}
              language={language}
              canEdit={canEditBooking(booking)}
              onOpen={() => onSelectBooking(booking)}
              onEdit={() => onEditBooking(booking)}
              onDelete={() => onRemoveBooking(booking)}
            />
          ))
        )}
      </div>

      {listBookings.length > listPageSize && (
        <div className="list-pagination" aria-label={appText(language, "list.pagination")}>
          <button
            className="secondary-button compact"
            disabled={listPage === 1}
            onClick={() => onPageChange(Math.max(1, listPage - 1))}
            type="button"
          >
            {appText(language, "list.previous")}
          </button>

          <span>
            {appText(language, "list.page").replace("{{page}}", String(listPage)).replace("{{total}}", String(totalListPages))}
          </span>

          <button
            className="secondary-button compact"
            disabled={listPage === totalListPages}
            onClick={() => onPageChange(Math.min(totalListPages, listPage + 1))}
            type="button"
          >
            {appText(language, "list.next")}
          </button>
        </div>
      )}
    </section>
  );
}
