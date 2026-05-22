"use client";

import { AgendaView } from "./AgendaView";
import type { Booking } from "@/lib/types/domain";

type WeekViewProps = {
  activePeriodDays: string[];
  bookings: Booking[];
  canManageBookings: boolean;
  isOnline: boolean;
  profileGroupName?: string;
  onCreateBooking: (date: string) => void;
  onDateSelect: (date: string) => void;
  onSelectBooking: (booking: Booking) => void;
};

export function WeekView(props: WeekViewProps) {
  return <AgendaView {...props} />;
}
