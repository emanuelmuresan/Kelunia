// Proprietățile comune ale vederilor calendarului (rezervări, programe fixe, camere, grupuri și data curentă).
import type {
  Booking,
  FixedSchedule,
  GroupItem,
  RoomItem,
} from "@/lib/types/domain";

export interface CalendarViewProps {
  bookings: Booking[];
  fixedSchedules: FixedSchedule[];
  rooms: RoomItem[];
  groups: GroupItem[];
  currentDate: Date;
  onBookingClick?: (bookingId: string) => void;
}