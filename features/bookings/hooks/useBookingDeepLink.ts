"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { doc, getDoc, type Firestore } from "firebase/firestore";

import { LocalNotifications } from "@/lib/notifications";
import { normalizeBooking } from "@/lib/scheduling";
import { isSoftDeleted } from "@/lib/soft-delete";
import type { AppView, Booking } from "@/lib/types/domain";

type UseBookingDeepLinkParams = {
  db: Firestore;
  bookings: Booking[];
  setActiveView: Dispatch<SetStateAction<AppView>>;
  setSelectedBooking: Dispatch<SetStateAction<Booking | null>>;
  setSelectedBookingNotice: Dispatch<SetStateAction<string>>;
};

/**
 * Opens a booking straight from a tapped native notification or a `?booking=<id>`
 * deep link, switching to the calendar view. Falls back to a direct document read
 * when the booking is outside the currently loaded query window. Fixed-schedule
 * ids (`fixed:*`) are ignored.
 */
export function useBookingDeepLink({
  db,
  bookings,
  setActiveView,
  setSelectedBooking,
  setSelectedBookingNotice,
}: UseBookingDeepLinkParams) {
  const openBookingById = useCallback(
    async (bookingId: string): Promise<boolean> => {
      if (!bookingId || bookingId.startsWith("fixed:")) {
        return false;
      }

      let booking = bookings.find((item) => item.id === bookingId) ?? null;

      if (!booking) {
        try {
          const snapshot = await getDoc(doc(db, "bookings", bookingId));

          if (snapshot.exists() && !isSoftDeleted(snapshot.data())) {
            booking = normalizeBooking(snapshot.id, snapshot.data());
          }
        } catch (error) {
          console.warn("Programarea din link nu a putut fi citită:", error);
        }
      }

      if (!booking) {
        return false;
      }

      setSelectedBookingNotice("");
      setSelectedBooking(booking);
      setActiveView("calendar");
      return true;
    },
    [bookings, db, setActiveView, setSelectedBooking, setSelectedBookingNotice]
  );

  useEffect(() => {
    let nativeListener: { remove: () => Promise<void> } | null = null;

    void LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      void openBookingById(String(event.notification?.extra?.bookingId ?? ""));
    })
      .then((listener) => {
        nativeListener = listener;
      })
      .catch(() => {
        nativeListener = null;
      });

    return () => {
      void nativeListener?.remove();
    };
  }, [openBookingById]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const bookingId = new URLSearchParams(window.location.search).get("booking");

    if (!bookingId) {
      return;
    }

    void openBookingById(bookingId).then((opened) => {
      if (opened) {
        window.history.replaceState(null, "", "/dashboard");
      }
    });
  }, [openBookingById]);
}
