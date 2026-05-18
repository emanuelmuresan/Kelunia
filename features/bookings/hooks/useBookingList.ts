"use client";

import { useEffect, useMemo, useState } from "react";

import { listPageSize } from "@/lib/config/app";
import { bookingsQueryLimit } from "@/lib/queries/bookings";
import type { AppView, Booking, ListFilter, SortDirection } from "@/lib/types/domain";

type UseBookingListParams = {
  activeView: AppView;
  bookings: Booking[];
  currentLocationId: string;
  listFilter: ListFilter;
  sortDirection: SortDirection;
  today: string;
};

export function useBookingList({
  activeView,
  bookings,
  currentLocationId,
  listFilter,
  sortDirection,
  today,
}: UseBookingListParams) {
  const [listPage, setListPage] = useState(1);

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

  const totalListPages = Math.max(1, Math.ceil(listBookings.length / listPageSize));
  const visibleListBookings = useMemo(
    () => listBookings.slice((listPage - 1) * listPageSize, listPage * listPageSize),
    [listBookings, listPage]
  );
  const reachedBookingsQueryLimit = bookings.length >= bookingsQueryLimit;

  useEffect(() => {
    setListPage(1);
  }, [activeView, currentLocationId, listFilter, sortDirection]);

  useEffect(() => {
    if (listPage > totalListPages) {
      setListPage(totalListPages);
    }
  }, [listPage, totalListPages]);

  return {
    listBookings,
    listPage,
    listPageSize,
    reachedBookingsQueryLimit,
    setListPage,
    totalListPages,
    visibleListBookings,
  };
}
