"use client";

import type { PointerEvent } from "react";
import type { FloorplanItem } from "@/features/floorplans/types/floorplan.types";

type FloorplanObjectProps = {
  item: FloorplanItem;
  openingMeasurements: { before: number; width: number; after: number } | null;
  selected: boolean;
  wallOpenings: Array<{ start: number; end: number }>;
  x: number;
  y: number;
  pixelsPerMeter: number;
  showMeasurements: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>, item: FloorplanItem) => void;
  onSelect: (item: FloorplanItem) => void;
};

const statusClass: Record<FloorplanItem["status"], string> = {
  available: "available",
  occupied: "occupied",
  maintenance: "maintenance",
  broken: "broken",
};

export function FloorplanObject({
  item,
  openingMeasurements,
  selected,
  wallOpenings,
  x,
  y,
  pixelsPerMeter,
  showMeasurements,
  onPointerDown,
  onSelect,
}: FloorplanObjectProps) {
  const label = item.name || itemLabel(item);
  const transform = `translate(${x} ${y}) rotate(${item.rotation})`;
  const selectionY = item.type === "wall" ? -item.height / 2 - 6 : -6;

  return (
    <g
      className={`floorplan-object floorplan-object-${item.type} ${selected ? "selected" : ""}`}
      transform={transform}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
      onPointerDown={(event) => onPointerDown(event, item)}
    >
      {item.type === "wall" ? (
        <>
          <WallSegments item={item} openings={wallOpenings} />
          {showMeasurements && (
            <text className="floorplan-measure-label" x={item.width / 2} y={-item.height / 2 - 5} textAnchor="middle">
              {metersLabel(item.width, pixelsPerMeter)}
            </text>
          )}
        </>
      ) : item.type === "door" ? (
        <>
          <line x1="0" y1="0" x2={item.width} y2="0" stroke={item.color} strokeLinecap="round" strokeWidth="4" />
          <path d={`M 0 0 A ${item.width} ${item.width} 0 0 1 ${item.width} ${-item.width}`} fill="none" stroke={item.color} strokeLinecap="round" strokeWidth="3" />
          {showMeasurements && <OpeningMeasurements measurements={openingMeasurements} pixelsPerMeter={pixelsPerMeter} />}
        </>
      ) : item.type === "window" ? (
        <>
          <line x1="0" y1="-4" x2={item.width} y2="-4" stroke={item.color} strokeLinecap="round" strokeWidth="3" />
          <line x1="0" y1="4" x2={item.width} y2="4" stroke={item.color} strokeLinecap="round" strokeWidth="3" />
          <line x1={item.width / 2} y1="-9" x2={item.width / 2} y2="9" stroke={item.color} strokeLinecap="round" strokeWidth="2" />
          {showMeasurements && <OpeningMeasurements measurements={openingMeasurements} pixelsPerMeter={pixelsPerMeter} />}
        </>
      ) : item.type === "text" ? (
        <text className="floorplan-free-text" x="0" y="18" fill={item.color}>
          {label}
        </text>
      ) : item.type === "circle" ? (
        <>
          <ellipse
            className={`floorplan-shape-outline ${statusClass[item.status]}`}
            cx={item.width / 2}
            cy={item.height / 2}
            rx={item.width / 2}
            ry={item.height / 2}
            fill="rgba(29, 164, 254, 0.08)"
            stroke={item.color}
          />
          <text className="floorplan-shape-label" x={item.width / 2} y={item.height / 2 + 6} textAnchor="middle">
            {label}
          </text>
        </>
      ) : item.type === "asset" ? (
        <>
          <AssetIcon item={item} />
          <circle className={`floorplan-status-dot ${statusClass[item.status]}`} cx={item.width - 11} cy="11" r="5" />
          <text className="floorplan-asset-caption" x={item.width / 2} y={item.height + 17} textAnchor="middle">
            {label}
          </text>
        </>
      ) : (
        <>
          <rect
            className={`floorplan-object-box ${statusClass[item.status]}`}
            width={item.width}
            height={item.height}
            rx={10}
            fill={item.color}
          />
          <circle className={`floorplan-status-dot ${statusClass[item.status]}`} cx={item.width - 14} cy="14" r="6" />
          <text className="floorplan-object-label" x="12" y="24">
            {label}
          </text>
        </>
      )}
      {selected && <rect className="floorplan-selection" x="-6" y={selectionY} width={item.width + 12} height={item.height + 12} rx="12" />}
    </g>
  );
}

function metersLabel(width: number, pixelsPerMeter: number) {
  return `${(width / pixelsPerMeter).toFixed(2)} m`;
}

function WallSegments({ item, openings }: { item: FloorplanItem; openings: Array<{ start: number; end: number }> }) {
  let cursor = 0;
  const segments: Array<{ start: number; width: number }> = [];

  for (const opening of openings) {
    const start = Math.max(0, Math.min(item.width, opening.start));
    const end = Math.max(0, Math.min(item.width, opening.end));

    if (start > cursor) {
      segments.push({ start: cursor, width: start - cursor });
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < item.width) {
    segments.push({ start: cursor, width: item.width - cursor });
  }

  return (
    <>
      {segments.map((segment) => (
        <rect key={`${segment.start}-${segment.width}`} x={segment.start} y={-item.height / 2} width={segment.width} height={item.height} rx="3" fill={item.color} />
      ))}
    </>
  );
}

function OpeningMeasurements({
  measurements,
  pixelsPerMeter,
}: {
  measurements: { before: number; width: number; after: number } | null;
  pixelsPerMeter: number;
}) {
  if (!measurements) {
    return null;
  }

  return (
    <g className="floorplan-opening-measures">
      {measurements.before > 18 && (
        <text x={-measurements.before / 2} y="-7" textAnchor="middle">
          {metersLabel(measurements.before, pixelsPerMeter)}
        </text>
      )}
      <text x={measurements.width / 2} y="-13" textAnchor="middle">
        {metersLabel(measurements.width, pixelsPerMeter)}
      </text>
      {measurements.after > 18 && (
        <text x={measurements.width + measurements.after / 2} y="-7" textAnchor="middle">
          {metersLabel(measurements.after, pixelsPerMeter)}
        </text>
      )}
    </g>
  );
}

function itemLabel(item: FloorplanItem) {
  if (item.type === "room") {
    return "Zona";
  }

  if (item.type === "circle") {
    return "Cerc";
  }

  if (item.type === "wall") {
    return "Perete";
  }

  if (item.type === "door") {
    return "Usa";
  }

  if (item.type === "window") {
    return "Geam";
  }

  if (item.type === "text") {
    return "Text";
  }

  return "Obiect";
}

function AssetIcon({ item }: { item: FloorplanItem }) {
  const w = item.width;
  const h = item.height;
  const cx = w / 2;
  const cy = h / 2;
  const c = item.color;

  if (item.assetType === "table") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <rect x={w * 0.22} y={h * 0.26} width={w * 0.56} height={h * 0.42} rx="5" />
        <line x1={w * 0.28} y1={h * 0.72} x2={w * 0.2} y2={h * 0.9} />
        <line x1={w * 0.72} y1={h * 0.72} x2={w * 0.8} y2={h * 0.9} />
      </g>
    );
  }

  if (item.assetType === "chair") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <rect x={w * 0.32} y={h * 0.4} width={w * 0.36} height={h * 0.25} rx="4" />
        <line x1={w * 0.33} y1={h * 0.36} x2={w * 0.67} y2={h * 0.36} />
        <line x1={w * 0.36} y1={h * 0.66} x2={w * 0.28} y2={h * 0.88} />
        <line x1={w * 0.64} y1={h * 0.66} x2={w * 0.72} y2={h * 0.88} />
      </g>
    );
  }

  if (item.assetType === "sofa") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <rect x={w * 0.18} y={h * 0.38} width={w * 0.64} height={h * 0.3} rx="8" />
        <line x1={w * 0.24} y1={h * 0.3} x2={w * 0.76} y2={h * 0.3} />
        <line x1={w * 0.26} y1={h * 0.7} x2={w * 0.2} y2={h * 0.84} />
        <line x1={w * 0.74} y1={h * 0.7} x2={w * 0.8} y2={h * 0.84} />
      </g>
    );
  }

  if (item.assetType === "bed") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <rect x={w * 0.2} y={h * 0.34} width={w * 0.62} height={h * 0.38} rx="5" />
        <rect x={w * 0.24} y={h * 0.39} width={w * 0.18} height={h * 0.14} rx="3" />
        <line x1={w * 0.2} y1={h * 0.78} x2={w * 0.2} y2={h * 0.88} />
        <line x1={w * 0.82} y1={h * 0.78} x2={w * 0.82} y2={h * 0.88} />
      </g>
    );
  }

  if (item.assetType === "tv") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <rect x={w * 0.22} y={h * 0.24} width={w * 0.56} height={h * 0.42} rx="4" />
        <line x1={cx} y1={h * 0.67} x2={cx} y2={h * 0.82} />
        <line x1={w * 0.34} y1={h * 0.84} x2={w * 0.66} y2={h * 0.84} />
      </g>
    );
  }

  if (item.assetType === "sink") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <ellipse cx={cx} cy={h * 0.56} rx={w * 0.27} ry={h * 0.18} />
        <path d={`M ${cx} ${h * 0.38} C ${cx} ${h * 0.22}, ${w * 0.66} ${h * 0.26}, ${w * 0.66} ${h * 0.42}`} />
      </g>
    );
  }

  if (item.assetType === "toilet") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <rect x={w * 0.34} y={h * 0.22} width={w * 0.32} height={h * 0.18} rx="4" />
        <ellipse cx={cx} cy={h * 0.6} rx={w * 0.23} ry={h * 0.25} />
      </g>
    );
  }

  if (item.assetType === "cabinet" || item.assetType === "storage") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <rect x={w * 0.25} y={h * 0.2} width={w * 0.5} height={h * 0.62} rx="4" />
        <line x1={cx} y1={h * 0.22} x2={cx} y2={h * 0.8} />
        <circle cx={w * 0.45} cy={h * 0.52} r="2.5" />
        <circle cx={w * 0.55} cy={h * 0.52} r="2.5" />
      </g>
    );
  }

  if (item.assetType === "desk") {
    return (
      <g className="floorplan-line-icon" stroke={c}>
        <rect x={w * 0.18} y={h * 0.3} width={w * 0.64} height={h * 0.28} rx="4" />
        <line x1={w * 0.26} y1={h * 0.6} x2={w * 0.22} y2={h * 0.86} />
        <line x1={w * 0.74} y1={h * 0.6} x2={w * 0.78} y2={h * 0.86} />
      </g>
    );
  }

  return (
    <g className="floorplan-line-icon" stroke={c}>
      <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.24} />
      <line x1={cx} y1={h * 0.22} x2={cx} y2={h * 0.78} />
      <line x1={w * 0.22} y1={cy} x2={w * 0.78} y2={cy} />
    </g>
  );
}
