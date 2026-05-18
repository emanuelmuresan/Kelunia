export type FloorplanItemType = "room" | "circle" | "asset" | "wall" | "door" | "window" | "text";
export type FloorplanAssetType =
  | "table"
  | "chair"
  | "desk"
  | "sofa"
  | "bed"
  | "tv"
  | "sink"
  | "toilet"
  | "cabinet"
  | "appliance"
  | "equipment"
  | "storage"
  | "custom";
export type FloorplanItemStatus = "available" | "occupied" | "maintenance" | "broken";
export type FloorplanTool = "select" | FloorplanItemType;
export type FloorplanPanel = "plan" | "shapes" | "objects" | "details";

export interface Floorplan {
  id: string;
  locationId: string;
  locationName: string;
  name: string;
  floorLabel: string;
  widthMeters: number;
  heightMeters: number;
  pixelsPerMeter: number;
  showMeasurements: boolean;
  backgroundUrl: string;
  backgroundPath: string;
  width: number;
  height: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FloorplanItem {
  id: string;
  locationId: string;
  locationName: string;
  floorplanId: string;
  type: FloorplanItemType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  linkedRoomId: string;
  assetType: FloorplanAssetType;
  status: FloorplanItemStatus;
  notes: string;
  photoUrl: string;
  photoPath: string;
  documentUrl: string;
  documentPath: string;
  documentName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FloorplanItemDraft {
  name: string;
  type: FloorplanItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  linkedRoomId: string;
  assetType: FloorplanAssetType;
  status: FloorplanItemStatus;
  notes: string;
  photoUrl: string;
  photoPath: string;
  documentUrl: string;
  documentPath: string;
  documentName: string;
}

export type FloorplanAttachmentKind = "photo" | "document";
