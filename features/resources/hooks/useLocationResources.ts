"use client";

import { useEffect, useState } from "react";
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
import { isSoftDeleted } from "@/lib/soft-delete";
import type { FixedSchedule, GroupItem, RoomItem } from "@/lib/types/domain";

type UseLocationResourcesParams = {
  userExists: boolean;
  locationId: string;
};

export function useLocationResources({
  userExists,
  locationId,
}: UseLocationResourcesParams) {
  const [rooms, setRooms] = useState<RoomItem[]>(defaultRooms);
  const [groups, setGroups] = useState<GroupItem[]>(defaultGroups);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [groupsReadError, setGroupsReadError] = useState("");
  const [fixedSchedules, setFixedSchedules] = useState<FixedSchedule[]>(defaultFixedSchedules);

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

    const unsubRooms = onSnapshot(
      buildRoomsQuery(db, locationId),
      (snapshot) => {
        setRooms(
          snapshot.docs
            .filter((item) => !isSoftDeleted(item.data()))
            .map((item) => ({ id: item.id, name: String(item.data().name ?? "") }))
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

    const unsubGroups = onSnapshot(
      buildGroupsQuery(db, locationId),
      (snapshot) => {
        setGroups(
          snapshot.docs
            .filter((item) => !isSoftDeleted(item.data()))
            .map((item) => ({ id: item.id, name: String(item.data().name ?? "") }))
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

    return () => {
      unsubRooms();
      unsubGroups();
      unsubFixed();
    };
  }, [locationId, userExists]);

  return {
    fixedSchedules,
    groups,
    groupsLoaded,
    groupsReadError,
    rooms,
  };
}
