"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  buildFloorplanItemsQuery,
  buildFloorplansQuery,
  floorplanItemsQueryLimit,
  floorplansQueryLimit,
  normalizeFloorplan,
  normalizeFloorplanItem,
} from "@/features/floorplans/repository/floorplans.repository";
import type { Floorplan, FloorplanItem } from "@/features/floorplans/types/floorplan.types";

type UseFloorplansParams = {
  enabled: boolean;
  locationId: string;
};

export function useFloorplans({ enabled, locationId }: UseFloorplansParams) {
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [items, setItems] = useState<FloorplanItem[]>([]);
  const [selectedFloorplanId, setSelectedFloorplanId] = useState("");
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !locationId) {
      setFloorplans([]);
      setItems([]);
      setSelectedFloorplanId("");
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    return onSnapshot(
      buildFloorplansQuery(db, locationId),
      (snapshot) => {
        const nextFloorplans = snapshot.docs
          .map((item) => normalizeFloorplan(item.id, item.data()))
          .filter((item): item is Floorplan => Boolean(item))
          .sort((a, b) => a.name.localeCompare(b.name));

        setFloorplans(nextFloorplans);
        setSelectedFloorplanId((current) => current || nextFloorplans[0]?.id || "");
        setLoading(false);

        if (snapshot.docs.length >= floorplansQueryLimit) {
          console.warn("Lista de planuri a atins limita de citire pentru aceasta locatie.");
        }
      },
      (snapshotError) => {
        console.warn("Planurile nu au putut fi citite:", snapshotError);
        setFloorplans([]);
        setItems([]);
        setSelectedFloorplanId("");
        setError("Planurile nu au putut fi citite. Verifica regulile Firebase.");
        setLoading(false);
      }
    );
  }, [enabled, locationId]);

  useEffect(() => {
    if (!enabled || !locationId || !selectedFloorplanId) {
      setItems([]);
      return;
    }

    setItemsLoading(true);

    return onSnapshot(
      buildFloorplanItemsQuery(db, locationId, selectedFloorplanId),
      (snapshot) => {
        setItems(
          snapshot.docs
            .map((item) => normalizeFloorplanItem(item.id, item.data()))
            .filter((item): item is FloorplanItem => Boolean(item))
            .sort(compareFloorplanItems)
        );
        setItemsLoading(false);

        if (snapshot.docs.length >= floorplanItemsQueryLimit) {
          console.warn("Lista de elemente din plan a atins limita de citire pentru aceasta locatie.");
        }
      },
      (snapshotError) => {
        console.warn("Elementele planului nu au putut fi citite:", snapshotError);
        setItems([]);
        setError("Elementele planului nu au putut fi citite. Verifica regulile Firebase.");
        setItemsLoading(false);
      }
    );
  }, [enabled, locationId, selectedFloorplanId]);

  const selectedFloorplan = useMemo(
    () => floorplans.find((floorplan) => floorplan.id === selectedFloorplanId) ?? null,
    [floorplans, selectedFloorplanId]
  );

  return {
    error,
    floorplans,
    items,
    itemsLoading,
    loading,
    selectedFloorplan,
    selectedFloorplanId,
    setError,
    setSelectedFloorplanId,
  };
}

const floorplanLayerOrder: Record<FloorplanItem["type"], number> = {
  wall: 1,
  room: 2,
  circle: 2,
  door: 3,
  window: 3,
  asset: 4,
  text: 5,
};

function compareFloorplanItems(first: FloorplanItem, second: FloorplanItem) {
  return floorplanLayerOrder[first.type] - floorplanLayerOrder[second.type] || first.name.localeCompare(second.name);
}
