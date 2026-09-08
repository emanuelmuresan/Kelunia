"use client";

import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import type { GroupItem } from "@/lib/types/domain";

type CalendarGroupFilterProps = {
  groups: GroupItem[];
  value: string;
  onChange: (group: string) => void;
};

/** Quick chips to show only one group's bookings in the calendar. "" = all. */
export function CalendarGroupFilter({ groups, value, onChange }: CalendarGroupFilterProps) {
  if (groups.length < 2) {
    return null;
  }

  return (
    <div className="calendar-group-filter" role="group" aria-label="Filtru grup">
      <button
        className={`group-chip ${value === "" ? "active" : ""}`}
        onClick={() => onChange("")}
        type="button"
      >
        Toate
      </button>

      {groups.map((group) => {
        const color = groupColorForName(groups, group.name);

        return (
          <button
            className={`group-chip ${value === group.name ? "active" : ""}`}
            key={group.id}
            onClick={() => onChange(value === group.name ? "" : group.name)}
            style={value === group.name ? groupColorStyle(color) : undefined}
            type="button"
          >
            {color && <i aria-hidden="true" style={{ backgroundColor: color }} />}
            {group.name}
          </button>
        );
      })}
    </div>
  );
}
