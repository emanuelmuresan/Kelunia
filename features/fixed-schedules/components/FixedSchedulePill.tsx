"use client";

import { groupColorForName, groupColorStyle } from "@/lib/group-colors";
import { isGroupFixedSchedule } from "@/lib/scheduling";
import type { FixedSchedule, GroupItem } from "@/lib/types/domain";

type FixedSchedulePillProps = {
  item: FixedSchedule;
  groups: GroupItem[];
  profileGroupName?: string;
};

export function FixedSchedulePill({
  item,
  groups,
  profileGroupName,
}: FixedSchedulePillProps) {
  return (
    <div
      className={`fixed-pill ${
        groupColorForName(groups, item.group) ? "group-colored-booking " : ""
      }${
        isGroupFixedSchedule(item, profileGroupName) ? "own-group-booking" : ""
      }`}
      style={groupColorStyle(groupColorForName(groups, item.group))}
    >
      <strong className="fixed-pill-time">
        {item.startTime} - {item.endTime}
      </strong>
      <span className="fixed-pill-group">{item.group}</span>
      <span className="fixed-pill-room">{item.room}</span>
      <span className="fixed-pill-title">{item.title}</span>
    </div>
  );
}
