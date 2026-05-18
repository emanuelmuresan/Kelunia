import {
  addDoc,
  collection,
  doc,
  limit,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from "firebase/storage";

import { isSoftDeleted } from "@/lib/soft-delete";
import type {
  Floorplan,
  FloorplanAttachmentKind,
  FloorplanAssetType,
  FloorplanItem,
  FloorplanItemDraft,
  FloorplanItemStatus,
  FloorplanItemType,
} from "@/features/floorplans/types/floorplan.types";

export const floorplansQueryLimit = 25;
export const floorplanItemsQueryLimit = 400;
const defaultFloorplanWidth = 1600;
const defaultFloorplanHeight = 1000;
const defaultPixelsPerMeter = 40;

export function buildFloorplansQuery(db: Firestore, locationId: string) {
  return query(
    collection(db, "floorplans"),
    where("locationId", "==", locationId),
    limit(floorplansQueryLimit)
  );
}

export function buildFloorplanItemsQuery(db: Firestore, locationId: string, floorplanId: string) {
  return query(
    collection(db, "floorplanItems"),
    where("locationId", "==", locationId),
    where("floorplanId", "==", floorplanId),
    limit(floorplanItemsQueryLimit)
  );
}

export function normalizeFloorplan(id: string, data: Record<string, unknown>): Floorplan | null {
  if (isSoftDeleted(data)) {
    return null;
  }

  const width = normalizeSize(data.width, defaultFloorplanWidth);
  const height = normalizeSize(data.height, defaultFloorplanHeight);
  const pixelsPerMeter = normalizeSize(data.pixelsPerMeter, defaultPixelsPerMeter);

  return {
    id,
    locationId: String(data.locationId ?? ""),
    locationName: String(data.locationName ?? ""),
    name: String(data.name ?? "Plan"),
    floorLabel: String(data.floorLabel ?? ""),
    widthMeters: normalizePositiveNumber(data.widthMeters, width / pixelsPerMeter),
    heightMeters: normalizePositiveNumber(data.heightMeters, height / pixelsPerMeter),
    pixelsPerMeter,
    showMeasurements: typeof data.showMeasurements === "boolean" ? data.showMeasurements : true,
    backgroundUrl: String(data.backgroundUrl ?? ""),
    backgroundPath: String(data.backgroundPath ?? ""),
    width,
    height,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function normalizeFloorplanItem(id: string, data: Record<string, unknown>): FloorplanItem | null {
  if (isSoftDeleted(data)) {
    return null;
  }

  return {
    id,
    locationId: String(data.locationId ?? ""),
    locationName: String(data.locationName ?? ""),
    floorplanId: String(data.floorplanId ?? ""),
    type: normalizeItemType(data.type),
    name: String(data.name ?? ""),
    x: normalizeNumber(data.x, 80),
    y: normalizeNumber(data.y, 80),
    width: normalizeSize(data.width, 160),
    height: normalizeSize(data.height, 96),
    rotation: normalizeNumber(data.rotation, 0),
    color: String(data.color ?? "#1da4fe"),
    linkedRoomId: String(data.linkedRoomId ?? ""),
    assetType: normalizeAssetType(data.assetType),
    status: normalizeStatus(data.status),
    notes: String(data.notes ?? ""),
    photoUrl: String(data.photoUrl ?? ""),
    photoPath: String(data.photoPath ?? ""),
    documentUrl: String(data.documentUrl ?? ""),
    documentPath: String(data.documentPath ?? ""),
    documentName: String(data.documentName ?? ""),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function createFloorplan(params: {
  db: Firestore;
  storage: FirebaseStorage;
  locationId: string;
  locationName: string;
  name: string;
  floorLabel: string;
  widthMeters: number;
  heightMeters: number;
  pixelsPerMeter: number;
  showMeasurements: boolean;
  width: number;
  height: number;
  backgroundFile?: File | null;
  createdBy: string;
}) {
  const created = doc(collection(params.db, "floorplans"));
  let backgroundUrl = "";
  let backgroundPath = "";

  if (params.backgroundFile) {
    const extension = fileExtension(params.backgroundFile.name);
    backgroundPath = `locations/${params.locationId}/floorplans/${created.id}/background-${Date.now()}.${extension}`;
    const fileRef = ref(params.storage, backgroundPath);
    await uploadBytes(fileRef, params.backgroundFile);
    backgroundUrl = await getDownloadURL(fileRef);
  }

  await setDoc(created, {
    locationId: params.locationId,
    locationName: params.locationName,
    name: params.name,
    floorLabel: params.floorLabel,
    widthMeters: params.widthMeters,
    heightMeters: params.heightMeters,
    pixelsPerMeter: params.pixelsPerMeter,
    showMeasurements: params.showMeasurements,
    backgroundUrl,
    backgroundPath,
    width: normalizeSize(params.width, defaultFloorplanWidth),
    height: normalizeSize(params.height, defaultFloorplanHeight),
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    deleted: false,
  });

  return created.id;
}

export function updateFloorplanSettings(
  db: Firestore,
  floorplanId: string,
  settings: {
    width: number;
    height: number;
    widthMeters: number;
    heightMeters: number;
    pixelsPerMeter: number;
    showMeasurements: boolean;
  },
  updatedBy: string
) {
  return updateDoc(doc(db, "floorplans", floorplanId), {
    ...settings,
    updatedBy,
    updatedAt: Timestamp.now(),
  });
}

export function softDeleteFloorplan(db: Firestore, floorplanId: string, updatedBy: string) {
  return updateDoc(doc(db, "floorplans", floorplanId), {
    deleted: true,
    deletedBy: updatedBy,
    deletedAt: Timestamp.now(),
    updatedBy,
    updatedAt: Timestamp.now(),
  });
}

export function restoreFloorplan(db: Firestore, floorplanId: string, updatedBy: string) {
  return updateDoc(doc(db, "floorplans", floorplanId), {
    deleted: false,
    deletedBy: "",
    deletedAt: null,
    updatedBy,
    updatedAt: Timestamp.now(),
  });
}

export async function createFloorplanItem(params: {
  db: Firestore;
  locationId: string;
  locationName: string;
  floorplanId: string;
  item: FloorplanItemDraft;
  updatedBy: string;
}) {
  const created = await addDoc(collection(params.db, "floorplanItems"), {
    ...params.item,
    locationId: params.locationId,
    locationName: params.locationName,
    floorplanId: params.floorplanId,
    createdBy: params.updatedBy,
    updatedBy: params.updatedBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    deleted: false,
  });

  return created.id;
}

export function updateFloorplanItem(db: Firestore, itemId: string, patch: Partial<FloorplanItemDraft>, updatedBy: string) {
  return updateDoc(doc(db, "floorplanItems", itemId), {
    ...patch,
    updatedBy,
    updatedAt: Timestamp.now(),
  });
}

export function softDeleteFloorplanItem(db: Firestore, itemId: string, updatedBy: string) {
  return updateDoc(doc(db, "floorplanItems", itemId), {
    deleted: true,
    deletedBy: updatedBy,
    deletedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export function restoreFloorplanItem(db: Firestore, itemId: string, item: FloorplanItem, updatedBy: string) {
  return updateDoc(doc(db, "floorplanItems", itemId), {
    ...floorplanItemPayload(item),
    deleted: false,
    deletedBy: "",
    deletedAt: null,
    updatedBy,
    updatedAt: Timestamp.now(),
  });
}

export async function uploadFloorplanItemAttachment(params: {
  db: Firestore;
  storage: FirebaseStorage;
  locationId: string;
  floorplanId: string;
  itemId: string;
  kind: FloorplanAttachmentKind;
  file: File;
  updatedBy: string;
}) {
  const extension = fileExtension(params.file.name);
  const path = `locations/${params.locationId}/floorplans/${params.floorplanId}/items/${params.itemId}/${params.kind}-${Date.now()}.${extension}`;
  const fileRef = ref(params.storage, path);
  await uploadBytes(fileRef, params.file);
  const url = await getDownloadURL(fileRef);

  if (params.kind === "photo") {
    await updateFloorplanItem(params.db, params.itemId, { photoUrl: url, photoPath: path }, params.updatedBy);
    return;
  }

  await updateFloorplanItem(
    params.db,
    params.itemId,
    {
      documentUrl: url,
      documentPath: path,
      documentName: params.file.name,
    },
    params.updatedBy
  );
}

export function floorplanItemDraft(type: FloorplanItemType, x: number, y: number): FloorplanItemDraft {
  const colorByType: Record<FloorplanItemType, string> = {
    room: "#1da4fe",
    circle: "#1da4fe",
    asset: "#18c7ac",
    wall: "#384256",
    door: "#aa79f3",
    window: "#2b7dff",
    text: "#e5273a",
  };

  return {
    name: "",
    type,
    x,
    y,
    width: type === "wall" ? 220 : type === "door" || type === "window" ? 100 : type === "asset" ? 74 : type === "circle" ? 96 : 160,
    height: type === "wall" ? 12 : type === "door" || type === "window" ? 18 : type === "asset" ? 74 : type === "circle" ? 96 : 96,
    rotation: 0,
    color: colorByType[type],
    linkedRoomId: "",
    assetType: type === "asset" ? "equipment" : "custom",
    status: "available",
    notes: "",
    photoUrl: "",
    photoPath: "",
    documentUrl: "",
    documentPath: "",
    documentName: "",
  };
}

function normalizeItemType(value: unknown): FloorplanItemType {
  return value === "room" || value === "circle" || value === "asset" || value === "wall" || value === "door" || value === "window" || value === "text"
    ? value
    : "asset";
}

export function floorplanItemPayload(item: FloorplanItem): FloorplanItemDraft {
  return {
    name: item.name,
    type: item.type,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation,
    color: item.color,
    linkedRoomId: item.linkedRoomId,
    assetType: item.assetType,
    status: item.status,
    notes: item.notes,
    photoUrl: item.photoUrl,
    photoPath: item.photoPath,
    documentUrl: item.documentUrl,
    documentPath: item.documentPath,
    documentName: item.documentName,
  };
}

function normalizeAssetType(value: unknown): FloorplanAssetType {
  return value === "table"
    || value === "chair"
    || value === "desk"
    || value === "sofa"
    || value === "bed"
    || value === "tv"
    || value === "sink"
    || value === "toilet"
    || value === "cabinet"
    || value === "appliance"
    || value === "equipment"
    || value === "storage"
    || value === "custom"
    ? value
    : "custom";
}

function normalizeStatus(value: unknown): FloorplanItemStatus {
  return value === "occupied" || value === "maintenance" || value === "broken" ? value : "available";
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSize(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function fileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return extension || "bin";
}
