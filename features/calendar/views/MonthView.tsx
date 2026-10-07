"use client";

// Vederea lunii: grilă cu zilele, primele rezervări ale fiecărei zile și numărul celor ascunse.
import { bookingsForDay, isGroupBooking } from "@/lib/scheduling";
import { parseDateKey } from "@/lib/dates";
import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import type { Booking, GroupItem } from "@/lib/types/domain";

// Câte rezervări se afișează într-o celulă; restul apar ca „+N”.
const visibleBookingsPerMonthCell = 2;

// Proprietățile vederii: celulele lunii, ziua curentă, rezervările și acțiunile.
type MonthViewProps = {
  shortDayLabels: string[];
  monthCells: (string | null)[];
  today: string;
  bookings: Booking[];
  groups: GroupItem[];
  canManageBookings: boolean;
  isOnline: boolean;
  profileGroupName?: string;
  onDateSelect: (date: string) => void;
  onCreateBooking: (date: string) => void;
  onSelectBooking: (booking: Booking) => void;
};

// Componenta lunii.
export function MonthView({
  shortDayLabels,
  monthCells,
  today,
  bookings,
  groups,
  canManageBookings,
  isOnline,
  profileGroupName,
  onDateSelect,
  onCreateBooking,
  onSelectBooking,
}: MonthViewProps) {
  return (
    <div className="month-calendar">
      {/* Capul de tabel cu zilele săptămânii. */}
      {shortDayLabels.map((day) => (
        <div className="month-heading" key={day}>
          {day}
        </div>
      ))}

      {/* Fiecare celulă: o zi sau un gol. */}
      {monthCells.map((cell, index) => {
        const dayBookings = cell ? bookingsForDay(bookings, cell) : [];
        const visibleBookings = dayBookings.slice(0, visibleBookingsPerMonthCell);
        const hiddenBookings = dayBookings.slice(visibleBookingsPerMonthCell);
        const hiddenOwnGroupBooking = hiddenBookings.some((booking) => isGroupBooking(booking, profileGroupName));

        return (
          <div
            className={`month-cell ${cell === today ? "today" : ""} ${cell ? "" : "muted"}`}
            key={`${cell ?? "blank"}-${index}`}
            onClick={() => cell && onDateSelect(cell)}
          >
            {cell && (
              <>
                <div className="cell-date">
                  <span>{parseDateKey(cell).getDate()}</span>

                  {canManageBookings && (
                    <button
                      disabled={!isOnline}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateBooking(cell);
                      }}
                      type="button"
                      aria-label="Adaugă"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* Rezervările zilei (colorate după grup) și „+N” pentru cele ascunse; se evidențiază dacă una aparține grupului utilizatorului. */}
                <div className="cell-events">
                  {visibleBookings.map((booking) => {
                    const groupColor = groupColorForName(groups, booking.group);

                    return (
                    <button
                      className={groupColor ? "group-colored-booking" : ""}
                      key={booking.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectBooking(booking);
                      }}
                      style={groupColorStyle(groupColor)}
                      type="button"
                    >
                      <strong>{booking.startTime}</strong>
                      <span>{booking.group}</span>
                    </button>
                    );
                  })}

                  {hiddenBookings.length > 0 && (
                    <small className={hiddenOwnGroupBooking ? "own-group-booking" : ""}>
                      +{hiddenBookings.length}
                    </small>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
