"use client";

// Citește în timp real rezervările unei locații dintr-un interval de date (colecția events), fără cele șterse logic.
import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { demoBookings } from "@/lib/config/app";
import { buildBookingsQuery } from "@/lib/queries/bookings";
import { normalizeBooking } from "@/lib/scheduling";
import { isSoftDeleted } from "@/lib/soft-delete";
import type { Booking } from "@/lib/types/domain";

// Parametrii: dacă există utilizator, locația și intervalul de date.
type UseBookingsParams = {
  userExists: boolean;
  locationId: string;
  startDate: string;
  endDate: string;
};

// Hook-ul rezervărilor; returnează lista ordonată după data de început.
export function useBookings({
  userExists,
  locationId,
  startDate,
  endDate,
}: UseBookingsParams) {
  // Fără utilizator se arată lista demonstrativă (goală); fără locație nu există rezervări.
  const [bookings, setBookings] = useState<Booking[]>(demoBookings);

  // Abonarea la modificări (onSnapshot); la schimbarea intervalului sau a locației abonarea se reface.
  useEffect(() => {
    if (!userExists) {
      setBookings(demoBookings);
      return;
    }

    if (!locationId) {
      setBookings([]);
      return;
    }

    const bookingsQuery = buildBookingsQuery(db, locationId, startDate, endDate);

    return onSnapshot(
      bookingsQuery,
      (snapshot) => {
        setBookings(
          snapshot.docs
            .filter((item) => !isSoftDeleted(item.data()))
            .map((item) => normalizeBooking(item.id, item.data()))
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
        );
      },
      // La eroare de citire lista rămâne goală și eroarea se scrie în consolă.
      (error) => {
        console.error("Programările nu au putut fi citite:", error);
        setBookings([]);
      }
    );
  }, [userExists, locationId, startDate, endDate]);

  return { bookings, setBookings };
}
