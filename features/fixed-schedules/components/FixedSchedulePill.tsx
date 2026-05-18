"use client";

import { isGroupFixedSchedule } from "@/lib/scheduling";
import type { FixedSchedule } from "@/lib/types/domain";

type FixedSchedulePillProps = {
  item: FixedSchedule;
  profileGroupName?: string;
};

export function FixedSchedulePill({
  item,
  profileGroupName,
}: FixedSchedulePillProps) {
  return (
    <div
      className={`fixed-pill ${
        isGroupFixedSchedule(item, profileGroupName) ? "own-group-booking" : ""
      }`}
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