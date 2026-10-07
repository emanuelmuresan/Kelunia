"use client";

// Pagina „Programări fixe”: o coloană pentru fiecare zi a săptămânii cu programele ei repetitive; managerii au butonul „Administrează”.
import { fixedForDay } from "@/lib/scheduling";
import type { FixedSchedule, GroupItem } from "@/lib/types/domain";
import { FixedSchedulePill } from "../components/FixedSchedulePill";

// Proprietățile paginii: programele, grupurile (pentru culori), numele zilelor și acțiunea de administrare.
type FixedSchedulesViewProps = {
  fixedSectionTitle: string;
  fixedSchedules: FixedSchedule[];
  groups: GroupItem[];
  dayLabels: string[];
  canEditCurrentLocation: boolean;
  profileGroupName?: string;
  onOpenFixedManager: () => void;
};

// Componenta paginii.
export function FixedSchedulesView({
  fixedSectionTitle,
  fixedSchedules,
  groups,
  dayLabels,
  canEditCurrentLocation,
  profileGroupName,
  onOpenFixedManager,
}: FixedSchedulesViewProps) {
  // Structura paginii.
  return (
    <section className="fixed-schedule-band">
      {/* Titlul paginii și butonul „Administrează” (doar cine poate edita locația). */}
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

      {/* Cele 7 zile; o zi fără programe afișează „Liber”. */}
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
                    groups={groups}
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
