"use client";

import { fixedForDay } from "@/lib/scheduling";
import type { FixedSchedule } from "@/lib/types/domain";
import { FixedSchedulePill } from "../components/FixedSchedulePill";

type FixedSchedulesViewProps = {
  fixedSectionTitle: string;
  fixedSchedules: FixedSchedule[];
  dayLabels: string[];
  canEditCurrentLocation: boolean;
  profileGroupName?: string;
  onOpenFixedManager: () => void;
};

export function FixedSchedulesView({
  fixedSectionTitle,
  fixedSchedules,
  dayLabels,
  canEditCurrentLocation,
  profileGroupName,
  onOpenFixedManager,
}: FixedSchedulesViewProps) {
  return (
    <section className="fixed-schedule-band">
      <div className="section-heading">
        <div>
          <h2>{fixedSectionTitle}</h2>
        </div>

        {canEditCurrentLocation && (
          <button
            className="secondary-button compact"
            onClick={onOpenFixedManager}
            type="button"
          >
            Administrează
          </button>
        )}
      </div>

      <div className="fixed-grid">
        {dayLabels.map((day, index) => {
          const items = fixedForDay(fixedSchedules, index);

          return (
            <article className="fixed-day" key={day}>
              <span>{day}</span>

              {items.length === 0 ? (
                <p>Liber</p>
              ) : (
                items.map((item) => (
                  <FixedSchedulePill
                    key={item.id}
                    item={item}
                    profileGroupName={profileGroupName}
                  />
                ))
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}