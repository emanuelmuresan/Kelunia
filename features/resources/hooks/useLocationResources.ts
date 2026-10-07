"use client";

// Citește în timp real resursele unei locații: camere, grupuri și programe fixe (fără cele șterse logic).
// Returnează și variantele „selectabile” (fără cele expirate), folosite la alegerea din formulare.
import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";

import {
  defaultFixedSchedules,
  defaultGroups,
  defaultRooms,
} from "@/lib/config/app";
import { db } from "@/lib/firebase";
import {
  buildFixedSchedulesQuery,
  buildGroupsQuery,
  buildRoomsQuery,
  fixedSchedulesQueryLimit,
  groupsQueryLimit,
  roomsQueryLimit,
} from "@/lib/queries/resources";
import { compareFixedSchedules } from "@/lib/scheduling";
import { normalizeGroupColor } from "@/lib/group-colors";
import { dateKey } from "@/lib/dates";
import { isSpaceExpired, readActiveUntil } from "@/lib/space-expiry";
import { isSoftDeleted } from "@/lib/soft-delete";
import type { FixedSchedule, GroupItem, RoomItem } from "@/lib/types/domain";

// Parametrii: dacă există utilizator și locația curentă.
type UseLocationResourcesParams = {
  userExists: boolean;
  locationId: string;
};

// Hook-ul resurselor.
export function useLocationResources({
  userExists,
  locationId,
}: UseLocationResourcesParams) {
  // Starea: camerele, grupurile (cu indicatorii de încărcare/eroare) și programele fixe.
  const [rooms, setRooms] = useState<RoomItem[]>(defaultRooms);
  const [groups, setGroups] = useState<GroupItem[]>(defaultGroups);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [groupsReadError, setGroupsReadError] = useState("");
  const [fixedSchedules, setFixedSchedules] = useState<FixedSchedule[]>(defaultFixedSchedules);

  // Fără utilizator sau fără locație listele se golesc; fără locație se explică în eroare.
  useEffect(() => {
    if (!userExists) {
      setRooms(defaultRooms);
      setGroups(defaultGroups);
      setGroupsLoaded(false);
      setGroupsReadError("");
      setFixedSchedules(defaultFixedSchedules);
      return;
    }

    if (!locationId) {
      setRooms(defaultRooms);
      setGroups(defaultGroups);
      setGroupsLoaded(true);
      setGroupsReadError("Contul nu are inca o locatie asociata.");
      setFixedSchedules(defaultFixedSchedules);
      return;
    }

    setGroupsLoaded(false);
    setGroupsReadError("");

    // Abonare la camere; la atingerea limitei de citire se scrie un avertisment în consolă.
    const unsubRooms = onSnapshot(
      buildRoomsQuery(db, locationId),
      (snapshot) => {
        setRooms(
          snapshot.docs
            .filter((item) => !isSoftDeleted(item.data()))
            .map((item) => ({
              id: item.id,
              name: String(item.data().name ?? ""),
              activeUntil: readActiveUntil(item.data().activeUntil),
            }))
        );

        if (snapshot.docs.length >= roomsQueryLimit) {
          console.warn("Lista de sali a atins limita de citire pentru aceasta locatie.");
        }
      },
      (error) => {
        console.warn("Salile nu au putut fi citite:", error);
        setRooms(defaultRooms);
      }
    );

    // Abonare la grupuri, cu culoarea și data-limită; semnalează când au fost încărcate sau nu s-au putut citi.
    const unsubGroups = onSnapshot(
      buildGroupsQuery(db, locationId),
      (snapshot) => {
        setGroups(
          snapshot.docs
            .filter((item) => !isSoftDeleted(item.data()))
            .map((item) => {
              const data = item.data();
              return {
                id: item.id,
                name: String(data.name ?? ""),
                color: normalizeGroupColor(data.color),
                activeUntil: readActiveUntil(data.activeUntil),
              };
            })
        );
        setGroupsLoaded(true);
        setGroupsReadError("");

        if (snapshot.docs.length >= groupsQueryLimit) {
          console.warn("Lista de grupuri a atins limita de citire pentru aceasta locatie.");
        }
      },
      (error) => {
        console.warn("Grupurile nu au putut fi citite:", error);
        setGroups(defaultGroups);
        setGroupsLoaded(true);
        setGroupsReadError("Grupurile nu au putut fi citite. Verifica regulile Firebase pentru locatia acestui cont.");
      }
    );

    // Abonare la programele fixe, sortate cronologic.
    const unsubFixed = onSnapshot(
      buildFixedSchedulesQuery(db, locationId),
      (snapshot) => {
        setFixedSchedules(
          snapshot.docs
            .filter((item) => !isSoftDeleted(item.data()))
            .map((item) => {
              const data = item.data();
              return {
                id: item.id,
                dayIndex: Number(data.dayIndex ?? 0),
                group: String(data.group ?? ""),
                room: String(data.room ?? ""),
                startTime: String(data.startTime ?? ""),
                endTime: String(data.endTime ?? ""),
                title: String(data.title ?? ""),
              };
            })
            .sort(compareFixedSchedules)
        );

        if (snapshot.docs.length >= fixedSchedulesQueryLimit) {
          console.warn("Lista de programari fixe a atins limita de citire pentru aceasta locatie.");
        }
      },
      (error) => {
        console.warn("Programarile fixe nu au putut fi citite:", error);
        setFixedSchedules(defaultFixedSchedules);
      }
    );

    // La schimbarea locației sau a utilizatorului abonările se opresc.
    return () => {
      unsubRooms();
      unsubGroups();
      unsubFixed();
    };
  }, [locationId, userExists]);

  // Camerele și grupurile încă valabile (cele cu activeUntil depășit nu se mai pot alege).
  const todayKey = dateKey(new Date());
  const selectableGroups = useMemo(() => groups.filter((item) => !isSpaceExpired(item, todayKey)), [groups, todayKey]);
  const selectableRooms = useMemo(() => rooms.filter((item) => !isSpaceExpired(item, todayKey)), [rooms, todayKey]);

  return {
    fixedSchedules,
    groups,
    groupsLoaded,
    groupsReadError,
    rooms,
    selectableGroups,
    selectableRooms,
  };
}
