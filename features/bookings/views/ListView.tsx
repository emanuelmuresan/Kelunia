"use client";

import type {
  Booking,
  ListFilter,
  SortDirection,
} from "@/lib/types/domain";
import { BookingRow } from "../components/BookingRow";

type ListViewProps = {
  listViewTitle: string;
  listBookings: Booking[];
  visibleListBookings: Booking[];
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
          <h2>{listBookings.length} rezultate</h2>
        </div>

        <div className="toolbar-actions">
          <select
            value={listFilter}
            onChange={(event) =>
              onListFilterChange(event.target.value as ListFilter)
            }
          >
            <option value="future">Viitoare</option>
            <option value="past">Trecute</option>
            <option value="all">Toate</option>
          </select>

          <select
            value={sortDirection}
            onChange={(event) =>
              onSortDirectionChange(event.target.value as SortDirection)
            }
          >
            <option value="asc">Crescător</option>
            <option value="desc">Descrescător</option>
          </select>

          {(isOwner || isSuperAdmin) && currentLocationId && (
            <button
              className="secondary-button compact history-button"
              onClick={onOpenAuditHistory}
              type="button"
            >
              Istoric
            </button>
          )}
        </div>
      </div>

      {reachedBookingsQueryLimit && (
        <p className="muted-note">
          Sunt multe programări în intervalul afișat. Pentru rezultate complete,
          restrânge perioada sau folosește filtre mai specifice.
        </p>
      )}

      <div className="booking-list">
        {listBookings.length === 0 ? (
          <p className="empty-line">Nu există programări de afișat.</p>
        ) : (
          visibleListBookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              profileGroupName={profileGroupName}
              canEdit={canEditBooking(booking)}
              onOpen={() => onSelectBooking(booking)}
              onEdit={() => onEditBooking(booking)}
              onDelete={() => onRemoveBooking(booking)}
            />
          ))
        )}
      </div>

      {listBookings.length > listPageSize && (
        <div className="list-pagination" aria-label="Paginare listă programări">
          <button
            className="secondary-button compact"
            disabled={listPage === 1}
            onClick={() => onPageChange(Math.max(1, listPage - 1))}
            type="button"
          >
            Înapoi
          </button>

          <span>
            Pagina {listPage} din {totalListPages}
          </span>

          <button
            className="secondary-button compact"
            disabled={listPage === totalListPages}
            onClick={() => onPageChange(Math.min(totalListPages, listPage + 1))}
            type="button"
          >
            Înainte
          </button>
        </div>
      )}
    </section>
  );
}