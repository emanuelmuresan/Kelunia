"use client";

import { useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";

import { FloorplanObject } from "@/features/floorplans/components/FloorplanObject";
import type {
  Floorplan,
  FloorplanAssetType,
  FloorplanItem,
  FloorplanItemDraft,
  FloorplanTool,
} from "@/features/floorplans/types/floorplan.types";

type FloorplanCanvasProps = {
  activeTool: FloorplanTool;
  canEdit: boolean;
  floorplan: Floorplan | null;
  items: FloorplanItem[];
  selectedItemId: string;
  zoom: number;
  assetToolType: FloorplanAssetType;
  onCreateItem: (tool: Exclude<FloorplanTool, "select">, x: number, y: number, patch?: Partial<FloorplanItemDraft>) => void;
  onMoveItem: (item: FloorplanItem, x: number, y: number, patch?: Partial<FloorplanItemDraft>) => void;
  onSelectItem: (item: FloorplanItem | null) => void;
  onZoomChange: (zoom: number) => void;
};

type DragState = {
  item: FloorplanItem;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type WallDraftState = {
  pointerId: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export function FloorplanCanvas({
  activeTool,
  canEdit,
  floorplan,
  items,
  selectedItemId,
  zoom,
  assetToolType,
  onCreateItem,
  onMoveItem,
  onSelectItem,
  onZoomChange,
}: FloorplanCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [wallDraft, setWallDraft] = useState<WallDraftState | null>(null);
  const width = floorplan?.width ?? 1600;
  const height = floorplan?.height ?? 1000;
  const pixelsPerMeter = floorplan?.pixelsPerMeter ?? 40;
  const showMeasurements = floorplan?.showMeasurements ?? true;
  const gridSize = Math.max(10, Math.round(pixelsPerMeter / 4));
  const magnetDistance = Math.max(14, Math.round(pixelsPerMeter * 0.32));
  const viewBox = useMemo(() => `0 0 ${width} ${height}`, [height, width]);

  function pointFromClient(clientX: number, clientY: number) {
    const svg = svgRef.current;

    if (!svg) {
      return { x: 0, y: 0 };
    }

    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * width;
    const y = ((clientY - rect.top) / rect.height) * height;

    return {
      x: Math.max(0, Math.min(width, x)),
      y: Math.max(0, Math.min(height, y)),
    };
  }

  function pointFromEvent(event: PointerEvent<SVGElement>) {
    return pointFromClient(event.clientX, event.clientY);
  }

  function pointFromDragEvent(event: DragEvent<SVGSVGElement>) {
    return pointFromClient(event.clientX, event.clientY);
  }

  function trackPointer(event: PointerEvent<SVGSVGElement>) {
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointersRef.current.size >= 2 && !pinchRef.current) {
      pinchRef.current = {
        distance: Math.max(1, twoPointerDistance()),
        zoom,
      };
    }
  }

  function updateTrackedPointer(event: PointerEvent<SVGSVGElement>) {
    if (!activePointersRef.current.has(event.pointerId)) {
      return;
    }

    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function twoPointerDistance() {
    const pointers = Array.from(activePointersRef.current.values());

    if (pointers.length < 2) {
      return 0;
    }

    return Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
  }

  function fittedZoomFallback() {
    const rect = svgRef.current?.getBoundingClientRect();

    if (!rect || width <= 0) {
      return 0.6;
    }

    return Math.min(1, Math.max(0.25, rect.width / width));
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    trackPointer(event);

    if (activePointersRef.current.size >= 2) {
      setWallDraft(null);
      setDragState(null);
      setDragPreview(null);
      return;
    }

    if ((event.target as Element).closest(".floorplan-object")) {
      return;
    }

    const point = pointFromEvent(event);

    if (activeTool === "select" || !canEdit) {
      onSelectItem(null);
      return;
    }

    if (activeTool === "wall") {
      const start = snapToWallEndpoint(point, items, magnetDistance) ?? point;
      event.currentTarget.setPointerCapture(event.pointerId);
      setWallDraft({
        pointerId: event.pointerId,
        startX: Math.round(start.x),
        startY: Math.round(start.y),
        endX: Math.round(start.x),
        endY: Math.round(start.y),
      });
      return;
    }

    if (activeTool === "door" || activeTool === "window") {
      const snappedOpening = openingOnNearestWall(activeTool, point, items, pixelsPerMeter);
      onCreateItem(activeTool, snappedOpening.x, snappedOpening.y, snappedOpening.patch);
      return;
    }

    onCreateItem(
      activeTool,
      Math.round(point.x),
      Math.round(point.y),
      activeTool === "asset" ? { assetType: assetToolType, name: assetToolLabel(assetToolType) } : undefined
    );
  }

  function handleItemPointerDown(event: PointerEvent<SVGGElement>, item: FloorplanItem) {
    event.stopPropagation();
    onSelectItem(item);

    if (!canEdit || activeTool !== "select") {
      return;
    }

    const point = pointFromEvent(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      item,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      originX: item.x,
      originY: item.y,
    });
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    updateTrackedPointer(event);

    if (pinchRef.current && activePointersRef.current.size >= 2) {
      const distance = twoPointerDistance();

      if (distance > 0) {
        const baseZoom = pinchRef.current.zoom <= 0 ? fittedZoomFallback() : pinchRef.current.zoom;
        onZoomChange(Math.min(3, Math.max(0.25, baseZoom * (distance / pinchRef.current.distance))));
      }

      return;
    }

    if (wallDraft) {
      const point = snapWallPoint(
        { x: wallDraft.startX, y: wallDraft.startY },
        pointFromEvent(event),
        items,
        magnetDistance
      );
      setWallDraft({
        ...wallDraft,
        endX: Math.round(point.x),
        endY: Math.round(point.y),
      });
      return;
    }

    if (!dragState) {
      return;
    }

    const point = pointFromEvent(event);
    const isLinearItem = dragState.item.type === "wall" || dragState.item.type === "door" || dragState.item.type === "window";
    const maxX = isLinearItem ? width : width - dragState.item.width;
    const maxY = isLinearItem ? height : height - dragState.item.height;
    const x = Math.round(Math.max(0, Math.min(maxX, dragState.originX + point.x - dragState.startX)));
    const y = Math.round(Math.max(0, Math.min(maxY, dragState.originY + point.y - dragState.startY)));
    setDragPreview({ id: dragState.item.id, x, y });
  }

  function finishWallDraw(event: PointerEvent<SVGSVGElement>) {
    if (!wallDraft) {
      return false;
    }

    const point = snapWallPoint(
      { x: wallDraft.startX, y: wallDraft.startY },
      pointFromEvent(event),
      items,
      magnetDistance
    );
    const wall = wallGeometry(wallDraft.startX, wallDraft.startY, point.x, point.y);

    if (wall.width >= 20) {
      onCreateItem("wall", wall.x, wall.y, {
        width: wall.width,
        height: 12,
        rotation: wall.rotation,
      });
    }

    setWallDraft(null);
    return true;
  }

  function finishDrag() {
    if (dragState && dragPreview?.id === dragState.item.id) {
      if (dragState.item.type === "door" || dragState.item.type === "window") {
        const center = openingCenter(dragState.item, dragPreview.x, dragPreview.y);
        const snappedOpening = openingOnNearestWall(
          dragState.item.type,
          center,
          items,
          pixelsPerMeter,
          dragState.item.width
        );
        onMoveItem(dragState.item, snappedOpening.x, snappedOpening.y, snappedOpening.patch);
      } else {
        onMoveItem(dragState.item, dragPreview.x, dragPreview.y);
      }
    }

    setDragState(null);
    setDragPreview(null);
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    activePointersRef.current.delete(event.pointerId);
    pinchRef.current = null;

    if (finishWallDraw(event)) {
      return;
    }

    finishDrag();
  }

  function handlePointerCancel() {
    activePointersRef.current.clear();
    pinchRef.current = null;
    setWallDraft(null);
    finishDrag();
  }

  function handleDrop(event: DragEvent<SVGSVGElement>) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    const raw = event.dataTransfer.getData("application/x-kelunia-floorplan-tool");

    if (!raw) {
      return;
    }

    try {
      const data = JSON.parse(raw) as { tool?: FloorplanTool; assetType?: FloorplanAssetType };
      const tool = data.tool;
      const point = pointFromDragEvent(event);

      if (!tool || tool === "select") {
        return;
      }

      if (tool === "door" || tool === "window") {
        const snappedOpening = openingOnNearestWall(tool, point, items, pixelsPerMeter);
        onCreateItem(tool, snappedOpening.x, snappedOpening.y, snappedOpening.patch);
        return;
      }

      onCreateItem(
        tool,
        Math.round(point.x),
        Math.round(point.y),
        tool === "asset" ? { assetType: data.assetType ?? assetToolType, name: assetToolLabel(data.assetType ?? assetToolType) } : undefined
      );
    } catch {
      // Drag data from outside the editor can be ignored.
    }
  }

  return (
    <div className="floorplan-canvas-wrap">
      <div className="floorplan-canvas-scroll">
        <svg
          ref={svgRef}
          className={`floorplan-canvas ${activeTool !== "select" ? "drawing" : ""}`}
          viewBox={viewBox}
          style={{ width: zoom <= 0 ? "100%" : `${Math.round(width * zoom)}px` }}
          role="application"
          aria-label="Editor plan"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <defs>
            <pattern id="floorplan-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#dce7f8" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="#f7fbff" />
          <rect width={width} height={height} fill="url(#floorplan-grid)" />

          {floorplan?.backgroundUrl && (
            <image href={floorplan.backgroundUrl} width={width} height={height} preserveAspectRatio="xMidYMid meet" opacity="0.92" />
          )}

          {wallDraft && <WallDraftPreview draft={wallDraft} pixelsPerMeter={pixelsPerMeter} showMeasurements={showMeasurements} />}

          {items.map((item) => {
            const preview = dragPreview?.id === item.id ? dragPreview : null;

            return (
              <FloorplanObject
                key={item.id}
                item={item}
                openingMeasurements={openingMeasurementsForItem(item, items, pixelsPerMeter)}
                selected={selectedItemId === item.id}
                wallOpenings={item.type === "wall" ? wallOpeningsForItem(item, items) : []}
                x={preview?.x ?? item.x}
                y={preview?.y ?? item.y}
                onPointerDown={handleItemPointerDown}
                onSelect={onSelectItem}
                pixelsPerMeter={pixelsPerMeter}
                showMeasurements={showMeasurements}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function WallDraftPreview({ draft, pixelsPerMeter, showMeasurements }: { draft: WallDraftState; pixelsPerMeter: number; showMeasurements: boolean }) {
  const wall = wallGeometry(draft.startX, draft.startY, draft.endX, draft.endY);

  return (
    <g className="floorplan-wall-draft" transform={`translate(${wall.x} ${wall.y}) rotate(${wall.rotation})`}>
      <rect y="-6" width={Math.max(1, wall.width)} height="12" rx="3" />
      {showMeasurements && wall.width >= 20 && (
        <text x={wall.width / 2} y="-9" textAnchor="middle">
          {metersLabel(wall.width, pixelsPerMeter)}
        </text>
      )}
    </g>
  );
}

function openingOnNearestWall(
  tool: "door" | "window",
  point: { x: number; y: number },
  items: FloorplanItem[],
  pixelsPerMeter: number,
  preferredWidth?: number
) {
  const openingWidth = preferredWidth ?? (tool === "door" ? Math.max(70, Math.round(pixelsPerMeter * 0.9)) : Math.max(80, Math.round(pixelsPerMeter * 1.1)));
  const openingHeight = 18;
  const nearest = nearestWallPoint(point, items, Math.max(50, pixelsPerMeter * 0.9));

  if (!nearest) {
    return {
      x: Math.round(point.x),
      y: Math.round(point.y),
      patch: { width: openingWidth, height: openingHeight },
    };
  }

  const finalOpeningWidth = Math.min(openingWidth, Math.max(40, nearest.wall.width - 10));
  const angle = (nearest.rotation * Math.PI) / 180;
  const halfX = Math.cos(angle) * finalOpeningWidth / 2;
  const halfY = Math.sin(angle) * finalOpeningWidth / 2;

  return {
    x: Math.round(nearest.x - halfX),
    y: Math.round(nearest.y - halfY),
    patch: {
      width: finalOpeningWidth,
      height: openingHeight,
      rotation: nearest.rotation,
    },
  };
}

function nearestWallPoint(point: { x: number; y: number }, items: FloorplanItem[], maxDistance: number) {
  let best: { x: number; y: number; distance: number; rotation: number; wall: FloorplanItem } | null = null;

  for (const wall of items) {
    if (wall.type !== "wall") {
      continue;
    }

    const angle = (wall.rotation * Math.PI) / 180;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const projection = ((point.x - wall.x) * direction.x) + ((point.y - wall.y) * direction.y);
    const clampedProjection = Math.max(0, Math.min(wall.width, projection));
    const x = wall.x + direction.x * clampedProjection;
    const y = wall.y + direction.y * clampedProjection;
    const distance = Math.hypot(point.x - x, point.y - y);

    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { x, y, distance, rotation: wall.rotation, wall };
    }
  }

  return best;
}

function wallOpeningsForItem(wall: FloorplanItem, items: FloorplanItem[]) {
  return items
    .map((item) => openingIntervalOnWall(wall, item))
    .filter((item): item is { start: number; end: number } => Boolean(item))
    .sort((first, second) => first.start - second.start);
}

function openingMeasurementsForItem(item: FloorplanItem, items: FloorplanItem[], pixelsPerMeter: number) {
  if (item.type !== "door" && item.type !== "window") {
    return null;
  }

  let best: { before: number; width: number; after: number; distance: number } | null = null;
  const center = openingCenter(item, item.x, item.y);

  for (const wall of items) {
    if (wall.type !== "wall") {
      continue;
    }

    const interval = openingIntervalOnWall(wall, item);

    if (!interval) {
      continue;
    }

    const nearest = nearestWallPoint(center, [wall], Math.max(48, pixelsPerMeter));
    const distance = nearest?.distance ?? 0;
    const before = Math.max(0, interval.start);
    const width = Math.max(0, interval.end - interval.start);
    const after = Math.max(0, wall.width - interval.end);

    if (!best || distance < best.distance) {
      best = { before, width, after, distance };
    }
  }

  return best;
}

function openingIntervalOnWall(wall: FloorplanItem, opening: FloorplanItem) {
  if (opening.type !== "door" && opening.type !== "window") {
    return null;
  }

  if (angleDistance(wall.rotation, opening.rotation) > 7) {
    return null;
  }

  const wallAngle = (wall.rotation * Math.PI) / 180;
  const direction = { x: Math.cos(wallAngle), y: Math.sin(wallAngle) };
  const normal = { x: -direction.y, y: direction.x };
  const openingStart = { x: opening.x, y: opening.y };
  const openingEnd = {
    x: opening.x + Math.cos(wallAngle) * opening.width,
    y: opening.y + Math.sin(wallAngle) * opening.width,
  };
  const center = openingCenter(opening, opening.x, opening.y);
  const distanceToWall = Math.abs(((center.x - wall.x) * normal.x) + ((center.y - wall.y) * normal.y));

  if (distanceToWall > Math.max(20, wall.height * 2.5)) {
    return null;
  }

  const startProjection = ((openingStart.x - wall.x) * direction.x) + ((openingStart.y - wall.y) * direction.y);
  const endProjection = ((openingEnd.x - wall.x) * direction.x) + ((openingEnd.y - wall.y) * direction.y);
  const start = Math.max(0, Math.min(wall.width, Math.min(startProjection, endProjection)));
  const end = Math.max(0, Math.min(wall.width, Math.max(startProjection, endProjection)));

  if (end - start < 8) {
    return null;
  }

  return { start, end };
}

function openingCenter(item: FloorplanItem, x: number, y: number) {
  const angle = (item.rotation * Math.PI) / 180;

  return {
    x: x + Math.cos(angle) * item.width / 2,
    y: y + Math.sin(angle) * item.width / 2,
  };
}

function angleDistance(first: number, second: number) {
  const diff = Math.abs(((first - second + 180) % 360) - 180);
  return Math.min(diff, 360 - diff);
}

function wallGeometry(startX: number, startY: number, endX: number, endY: number) {
  const dx = endX - startX;
  const dy = endY - startY;
  const width = Math.round(Math.sqrt(dx * dx + dy * dy));
  const rotation = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

  return {
    x: Math.round(startX),
    y: Math.round(startY),
    width,
    rotation,
  };
}

function snapWallEnd(start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absoluteX = Math.abs(dx);
  const absoluteY = Math.abs(dy);

  if (absoluteX > absoluteY * 1.8) {
    return { x: end.x, y: start.y };
  }

  if (absoluteY > absoluteX * 1.8) {
    return { x: start.x, y: end.y };
  }

  return end;
}

function snapWallPoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
  items: FloorplanItem[],
  magnetDistance: number
) {
  const straightEnd = snapWallEnd(start, end);
  return snapToWallEndpoint(straightEnd, items, magnetDistance) ?? straightEnd;
}

function snapToWallEndpoint(point: { x: number; y: number }, items: FloorplanItem[], maxDistance: number) {
  let best: { x: number; y: number; distance: number } | null = null;

  for (const wall of items) {
    if (wall.type !== "wall") {
      continue;
    }

    const angle = (wall.rotation * Math.PI) / 180;
    const endpoints = [
      { x: wall.x, y: wall.y },
      { x: wall.x + Math.cos(angle) * wall.width, y: wall.y + Math.sin(angle) * wall.width },
    ];

    for (const endpoint of endpoints) {
      const distance = Math.hypot(point.x - endpoint.x, point.y - endpoint.y);

      if (distance <= maxDistance && (!best || distance < best.distance)) {
        best = { x: endpoint.x, y: endpoint.y, distance };
      }
    }
  }

  return best ? { x: best.x, y: best.y } : null;
}

function metersLabel(width: number, pixelsPerMeter: number) {
  return `${(width / pixelsPerMeter).toFixed(2)} m`;
}

function assetToolLabel(assetType: FloorplanAssetType) {
  const labels: Record<FloorplanAssetType, string> = {
    table: "Masa",
    chair: "Scaun",
    desk: "Birou",
    sofa: "Canapea",
    bed: "Pat",
    tv: "TV",
    sink: "Chiuveta",
    toilet: "WC",
    cabinet: "Dulap",
    appliance: "Electrocasnic",
    equipment: "Echipament",
    storage: "Depozitare",
    custom: "Obiect",
  };

  return labels[assetType];
}
