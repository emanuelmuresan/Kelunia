"use client";

// Lista rezervărilor pentru pagina „Listă”: filtrare viitoare/trecute/toate, sortare și paginare.
import { useEffect, useMemo, useState } from "react";

import { listPageSize } from "@/lib/config/app";
import { bookingsQueryLimit } from "@/lib/queries/bookings";
import type { AppView, Booking, ListFilter, SortDirection } from "@/lib/types/domain";

// Parametrii: vederea activă, rezervările, filtrul, sortarea și ziua curentă.
type UseBookingListParams = {
  activeView: AppView;
  bookings: Booking[];
  currentLocationId: string;
  listFilter: ListFilter;
  sortDirection: SortDirection;
  today: string;
};

// Hook-ul listei.
export function useBookingList({
  activeView,
  bookings,
  currentLocationId,
  listFilter,
  sortDirection,
  today,
}: UseBookingListParams) {
  // Pagina curentă a listei (începe de la 1).
  const [listPage, setListPage] = useState(1);

  // Filtrează după sfârșitul rezervării față de azi și sortează după dată și oră.
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

  // Numărul de pagini și rezervările paginii curente.
  const totalListPages = Math.max(1, Math.ceil(listBookings.length / listPageSize));
  const visibleListBookings = useMemo(
    () => listBookings.slice((listPage - 1) * listPageSize, listPage * listPageSize),
    [listBookings, listPage]
  );
  // Dacă s-a atins limita interogării, lista poate fi incompletă și utilizatorul este avertizat.
  const reachedBookingsQueryLimit = bookings.length >= bookingsQueryLimit;

  // La schimbarea filtrului, sortării, locației sau vederii se revine la prima pagină.
  useEffect(() => {
    setListPage(1);
  }, [activeView, currentLocationId, listFilter, sortDirection]);

  // Dacă pagina curentă depășește numărul de pagini (ex. după ștergeri), se revine la ultima.
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
