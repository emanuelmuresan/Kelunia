"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

import { LocalNotifications } from "@/lib/notifications";
import type { AppView, Booking } from "@/lib/types/domain";

type UseBookingDeepLinkParams = {
  bookings: Booking[];
  setActiveView: Dispatch<SetStateAction<AppView>>;
  setSelectedBooking: Dispatch<SetStateAction<Booking | null>>;
  setSelectedBookingNotice: Dispatch<SetStateAction<string>>;
};

/**
 * Opens a booking straight from a tapped native notification or a `?booking=<id>`
 * deep link, switching to the calendar view. Fixed-schedule ids (`fixed:*`) are ignored.
 */
export function useBookingDeepLink({
  bookings,
  setActiveView,
  setSelectedBooking,
  setSelectedBookingNotice,
}: UseBookingDeepLinkParams) {
  useEffect(() => {
    let nativeListener: { remove: () => Promise<void> } | null = null;

    void LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const bookingId = String(event.notification?.extra?.bookingId ?? "");

      if (!bookingId || bookingId.startsWith("fixed:")) {
        return;
      }

      const booking = bookings.find((item) => item.id === bookingId);

      if (booking) {
        setSelectedBookingNotice("");
        setSelectedBooking(booking);
        setActiveView("calendar");
      }
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
  }, [bookings, setActiveView, setSelectedBooking, setSelectedBookingNotice]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const bookingId = new URLSearchParams(window.location.search).get("booking");

    if (!bookingId || bookingId.startsWith("fixed:")) {
      return;
    }

    const booking = bookings.find((item) => item.id === bookingId);

    if (!booking) {
      return;
    }

    setSelectedBookingNotice("");
    setSelectedBooking(booking);
    setActiveView("calendar");
    window.history.replaceState(null, "", "/dashboard");
  }, [bookings, setActiveView, setSelectedBooking, setSelectedBookingNotice]);
}
