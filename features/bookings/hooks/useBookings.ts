"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { demoBookings } from "@/lib/config/app";
import { buildBookingsQuery } from "@/lib/queries/bookings";
import { normalizeBooking } from "@/lib/scheduling";
import { isSoftDeleted } from "@/lib/soft-delete";
import type { Booking } from "@/lib/types/domain";

type UseBookingsParams = {
  userExists: boolean;
  locationId: string;
  startDate: string;
  endDate: string;
};

export function useBookings({
  userExists,
  locationId,
  startDate,
  endDate,
}: UseBookingsParams) {
  const [bookings, setBookings] = useState<Booking[]>(demoBookings);

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
      (error) => {
        console.error("Programările nu au putut fi citite:", error);
        setBookings([]);
      }
    );
  }, [userExists, locationId, startDate, endDate]);

  return { bookings, setBookings };
}
