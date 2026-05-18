"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";

import { db, storage } from "@/lib/firebase";
import type { AuditAction, AuditEntityType } from "@/lib/audit";
import type { RoomItem } from "@/lib/types/domain";
import { FloorplanCanvas } from "@/features/floorplans/components/FloorplanCanvas";
import { FloorplanInlineInspector, FloorplanSidebar } from "@/features/floorplans/components/FloorplanSidebar";
import { FloorplanToolbar } from "@/features/floorplans/components/FloorplanToolbar";
import {
  createFloorplan,
  createFloorplanItem,
  floorplanItemPayload,
  floorplanItemDraft,
  restoreFloorplan,
  restoreFloorplanItem,
  softDeleteFloorplan,
  softDeleteFloorplanItem,
  updateFloorplanSettings,
  updateFloorplanItem,
  uploadFloorplanItemAttachment,
} from "@/features/floorplans/repository/floorplans.repository";
import type {
  Floorplan,
  FloorplanAttachmentKind,
  FloorplanAssetType,
  FloorplanItem,
  FloorplanItemDraft,
  FloorplanPanel,
  FloorplanTool,
} from "@/features/floorplans/types/floorplan.types";

type RecordAuditLog = (
  entityType: AuditEntityType,
  action: AuditAction,
  entityId: string,
  before: unknown,
  after: unknown,
  auditLocationId?: string,
  auditLocationName?: string
) => Promise<void>;

type FloorplansViewProps = {
  canEdit: boolean;
  canUseFloorplans: boolean;
  error: string;
  floorplans: Floorplan[];
  items: FloorplanItem[];
  licenseMessage: string;
  loading: boolean;
  locationId: string;
  locationName: string;
  rooms: RoomItem[];
  selectedFloorplan: Floorplan | null;
  selectedFloorplanId: string;
  user: User | null;
  recordAuditLog: RecordAuditLog;
  onError: (message: string) => void;
  onFloorplanCreated: (id: string) => void;
  onFloorplanChange: (id: string) => void;
  onOpenAuditHistory: () => void;
};

type UndoAction = {
  label: string;
  run: () => Promise<void>;
};

export function FloorplansView({
  canEdit,
  canUseFloorplans,
  error,
  floorplans,
  items,
  licenseMessage,
  loading,
  locationId,
  locationName,
  rooms,
  selectedFloorplan,
  selectedFloorplanId,
  user,
  recordAuditLog,
  onError,
  onFloorplanCreated,
  onFloorplanChange,
  onOpenAuditHistory,
}: FloorplansViewProps) {
  const [activeTool, setActiveTool] = useState<FloorplanTool>("select");
  const [activePanel, setActivePanel] = useState<FloorplanPanel>("plan");
  const [assetToolType, setAssetToolType] = useState<FloorplanAssetType>("equipment");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [zoom, setZoom] = useState(0);
  const touchStartXRef = useRef(0);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  function pushUndo(label: string, run: () => Promise<void>) {
    setUndoStack((current) => [...current.slice(-24), { label, run }]);
  }

  async function undoLast() {
    const last = undoStack[undoStack.length - 1];

    if (!last) {
      return;
    }

    setWorking(true);
    onError("");

    try {
      await last.run();
      setUndoStack((current) => current.slice(0, -1));
    } catch (undoError) {
      console.error("Actiunea nu a putut fi anulata:", undoError);
      onError(`Actiunea nu a putut fi anulata: ${firebaseErrorMessage(undoError)}`);
    } finally {
      setWorking(false);
    }
  }

  function selectItem(item: FloorplanItem | null) {
    setSelectedItemId(item?.id ?? "");

    if (item) {
      setActivePanel("details");
      setSidebarOpen(true);
    }
  }

  async function createPlan(
    name: string,
    floorLabel: string,
    widthMeters: number,
    heightMeters: number,
    pixelsPerMeter: number,
    showMeasurements: boolean,
    file: File | null
  ) {
    if (!canEdit || !user || !locationId) {
      return false;
    }

    const cleanName = name.trim();
    const cleanFloorLabel = floorLabel.trim();
    const cleanWidthMeters = clampPlanMeters(widthMeters, 1, 100);
    const cleanHeightMeters = clampPlanMeters(heightMeters, 1, 100);
    const cleanPixelsPerMeter = clampPixelsPerMeter(pixelsPerMeter);
    const dimensions = {
      width: Math.round(cleanWidthMeters * cleanPixelsPerMeter),
      height: Math.round(cleanHeightMeters * cleanPixelsPerMeter),
    };

    if (!cleanName) {
      onError("Scrie numele planului.");
      return false;
    }

    setWorking(true);
    onError("");

    try {
      const id = await createFloorplan({
        db,
        storage,
        locationId,
        locationName,
        name: cleanName,
        floorLabel: cleanFloorLabel,
        widthMeters: cleanWidthMeters,
        heightMeters: cleanHeightMeters,
        pixelsPerMeter: cleanPixelsPerMeter,
        showMeasurements,
        width: dimensions.width,
        height: dimensions.height,
        backgroundFile: file,
        createdBy: user.email ?? "",
      });
      await recordAuditLog(
        "floorplan",
        "create",
        id,
        null,
        {
          id,
          locationId,
          locationName,
          name: cleanName,
          floorLabel: cleanFloorLabel,
          widthMeters: cleanWidthMeters,
          heightMeters: cleanHeightMeters,
          pixelsPerMeter: cleanPixelsPerMeter,
          showMeasurements,
          width: dimensions.width,
          height: dimensions.height,
          hasBackground: Boolean(file),
        },
        locationId,
        locationName
      );
      pushUndo("Creare plan", () => softDeleteFloorplan(db, id, user.email ?? ""));
      onFloorplanCreated(id);
      return true;
    } catch (createError) {
      console.error("Planul nu a putut fi creat:", createError);
      onError(`Planul nu a putut fi creat: ${firebaseErrorMessage(createError)}`);
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function updatePlanSettings(widthMeters: number, heightMeters: number, pixelsPerMeter: number, showMeasurements: boolean) {
    if (!canEdit || !selectedFloorplan || !user) {
      return;
    }

    const cleanWidthMeters = clampPlanMeters(widthMeters, 1, 100);
    const cleanHeightMeters = clampPlanMeters(heightMeters, 1, 100);
    const cleanPixelsPerMeter = clampPixelsPerMeter(pixelsPerMeter);
    const settings = {
      widthMeters: cleanWidthMeters,
      heightMeters: cleanHeightMeters,
      pixelsPerMeter: cleanPixelsPerMeter,
      showMeasurements,
      width: Math.round(cleanWidthMeters * cleanPixelsPerMeter),
      height: Math.round(cleanHeightMeters * cleanPixelsPerMeter),
    };

    setWorking(true);
    onError("");

    try {
      const before = selectedFloorplan;
      await updateFloorplanSettings(db, selectedFloorplan.id, settings, user.email ?? "");
      pushUndo("Setari plan", () => updateFloorplanSettings(db, selectedFloorplan.id, floorplanSettingsFromPlan(before), user.email ?? ""));
      await recordAuditLog(
        "floorplan",
        "update",
        selectedFloorplan.id,
        before,
        { ...before, ...settings },
        locationId,
        locationName
      );
    } catch (updateError) {
      console.error("Scara planului nu a putut fi actualizata:", updateError);
      onError(`Scara planului nu a putut fi actualizata: ${firebaseErrorMessage(updateError)}`);
    } finally {
      setWorking(false);
    }
  }

  async function createItem(
    tool: Exclude<FloorplanTool, "select">,
    x: number,
    y: number,
    patch: Partial<FloorplanItemDraft> = {}
  ) {
    if (!canEdit || !selectedFloorplan || !user) {
      return;
    }

    setWorking(true);
    onError("");

    try {
      const draft = { ...floorplanItemDraft(tool, x, y), ...patch };
      const createdId = await createFloorplanItem({
        db,
        locationId,
        locationName,
        floorplanId: selectedFloorplan.id,
        item: draft,
        updatedBy: user.email ?? "",
      });
      await recordAuditLog(
        "floorplanItem",
        "create",
        createdId,
        null,
        {
          ...draft,
          id: createdId,
          locationId,
          locationName,
          floorplanId: selectedFloorplan.id,
        },
        locationId,
        locationName
      );
      pushUndo("Creare element", () => softDeleteFloorplanItem(db, createdId, user.email ?? ""));
      setSelectedItemId(createdId);
      setActiveTool("select");
    } catch (createError) {
      console.error("Elementul nu a putut fi creat:", createError);
      onError(`Elementul nu a putut fi creat: ${firebaseErrorMessage(createError)}`);
    } finally {
      setWorking(false);
    }
  }

  function updateItem(patch: Partial<FloorplanItemDraft>) {
    if (!canEdit || !selectedItem || !user) {
      return;
    }

    const before = selectedItem;

    void updateFloorplanItem(db, selectedItem.id, patch, user.email ?? "")
      .then(() => {
        pushUndo("Modificare element", () => updateFloorplanItem(db, before.id, floorplanItemPayload(before), user.email ?? ""));
        return recordAuditLog("floorplanItem", "update", before.id, before, { ...before, ...patch }, locationId, locationName);
      })
      .catch((updateError) => {
        console.error("Elementul nu a putut fi actualizat:", updateError);
        onError(`Elementul nu a putut fi actualizat: ${firebaseErrorMessage(updateError)}`);
      });
  }

  function moveItem(item: FloorplanItem, x: number, y: number, patch: Partial<FloorplanItemDraft> = {}) {
    if (!canEdit || !user) {
      return;
    }

    void updateFloorplanItem(db, item.id, { ...patch, x, y }, user.email ?? "")
      .then(() => {
        pushUndo("Mutare element", () => updateFloorplanItem(db, item.id, floorplanItemPayload(item), user.email ?? ""));
        return recordAuditLog("floorplanItem", "update", item.id, item, { ...item, ...patch, x, y }, locationId, locationName);
      })
      .catch((moveError) => {
        console.error("Elementul nu a putut fi mutat:", moveError);
        onError(`Elementul nu a putut fi mutat: ${firebaseErrorMessage(moveError)}`);
      });
  }

  async function removeItem() {
    if (!canEdit || !selectedItem || !user || !confirm("Stergi elementul de pe plan?")) {
      return;
    }

    setWorking(true);

    try {
      const before = selectedItem;
      await softDeleteFloorplanItem(db, selectedItem.id, user.email ?? "");
      await recordAuditLog(
        "floorplanItem",
        "delete",
        before.id,
        before,
        { ...before, deleted: true },
        locationId,
        locationName
      );
      pushUndo("Stergere element", () => restoreFloorplanItem(db, before.id, before, user.email ?? ""));
      setSelectedItemId("");
    } catch (deleteError) {
      console.error("Elementul nu a putut fi sters:", deleteError);
      onError(`Elementul nu a putut fi sters: ${firebaseErrorMessage(deleteError)}`);
    } finally {
      setWorking(false);
    }
  }

  async function removeFloorplan() {
    if (!canEdit || !selectedFloorplan || !user || !confirm("Stergi planul curent? Elementele lui vor fi ascunse odata cu planul.")) {
      return;
    }

    setWorking(true);
    onError("");

    try {
      const before = selectedFloorplan;
      await softDeleteFloorplan(db, selectedFloorplan.id, user.email ?? "");
      await recordAuditLog(
        "floorplan",
        "delete",
        before.id,
        before,
        { ...before, deleted: true },
        locationId,
        locationName
      );
      pushUndo("Stergere plan", () => restoreFloorplan(db, before.id, user.email ?? ""));
      setSelectedItemId("");
      onFloorplanChange(floorplans.find((floorplan) => floorplan.id !== before.id)?.id ?? "");
    } catch (deleteError) {
      console.error("Planul nu a putut fi sters:", deleteError);
      onError(`Planul nu a putut fi sters: ${firebaseErrorMessage(deleteError)}`);
    } finally {
      setWorking(false);
    }
  }

  async function uploadAttachment(kind: FloorplanAttachmentKind, file: File) {
    if (!canEdit || !selectedFloorplan || !selectedItem || !user) {
      return;
    }

    setWorking(true);
    onError("");

    try {
      const before = selectedItem;
      await uploadFloorplanItemAttachment({
        db,
        storage,
        locationId,
        floorplanId: selectedFloorplan.id,
        itemId: selectedItem.id,
        kind,
        file,
        updatedBy: user.email ?? "",
      });
      await recordAuditLog(
        "floorplanItem",
        "update",
        before.id,
        before,
        {
          ...before,
          attachmentKind: kind,
          uploadedFileName: file.name,
        },
        locationId,
        locationName
      );
    } catch (uploadError) {
      console.error("Fisierul nu a putut fi incarcat:", uploadError);
      onError(`Fisierul nu a putut fi incarcat: ${firebaseErrorMessage(uploadError)}`);
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editingText =
        target?.tagName === "INPUT"
        || target?.tagName === "TEXTAREA"
        || target?.tagName === "SELECT"
        || target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void undoLast();
        return;
      }

      if (!editingText && selectedItem && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        void removeItem();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, undoStack]);

  if (!locationId) {
    return (
      <section className="content-card floorplan-empty-state">
        <span className="eyebrow">Planuri</span>
        <h2>Alege o locatie</h2>
        <p>Planurile sunt legate de fiecare locatie, ca datele si accesul sa ramana separate.</p>
      </section>
    );
  }

  if (!canUseFloorplans) {
    return (
      <section className="content-card floorplan-empty-state">
        <span className="eyebrow">Pro</span>
        <h2>Planuri interactive</h2>
        <p>
          Acest modul este pregatit pentru planurile Pro si Business: fundal imagine, zone, obiecte,
          documente si poze atasate.
        </p>
        {licenseMessage && <p className="warning-line">{licenseMessage}</p>}
      </section>
    );
  }

  return (
    <section
      className="floorplan-editor"
      aria-label="Planuri locatie"
      onTouchStart={(event) => {
        touchStartXRef.current = event.touches[0]?.clientX ?? 0;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartXRef.current;
        const endX = event.changedTouches[0]?.clientX ?? startX;
        const screenWidth = typeof window === "undefined" ? 0 : window.innerWidth;

        if (screenWidth > 0 && startX > screenWidth - 42 && endX < startX - 38) {
          setSidebarOpen(true);
        }

        if (sidebarOpen && endX > startX + 58) {
          setSidebarOpen(false);
        }
      }}
    >
      <div className="floorplan-header">
        <div>
          <span className="eyebrow">Pro</span>
          <h2>Planuri interactive</h2>
          <p>{locationName}</p>
        </div>
        {loading && <span className="soft-badge">Se incarca</span>}
      </div>

      {error && <p className="error-line">{error}</p>}

      <FloorplanToolbar
        activePanel={activePanel}
        activeTool={activeTool}
        canEdit={canEdit}
        canUndo={undoStack.length > 0}
        sidebarOpen={sidebarOpen}
        zoom={zoom}
        onActivePanelChange={setActivePanel}
        onOpenAuditHistory={onOpenAuditHistory}
        onOpenSidebar={() => setSidebarOpen(true)}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
        onToolChange={setActiveTool}
        onUndo={undoLast}
        onZoomChange={setZoom}
      />

      <div className="floorplan-layout">
        <div className="floorplan-workbench">
        {selectedItem && (
          <FloorplanInlineInspector
            canEdit={canEdit}
            rooms={rooms}
            selectedFloorplan={selectedFloorplan}
            selectedItem={selectedItem}
            working={working}
            onItemChange={updateItem}
            onRemoveItem={removeItem}
            onUpload={() => undefined}
          />
        )}

        <FloorplanCanvas
          activeTool={activeTool}
          canEdit={canEdit}
          floorplan={selectedFloorplan}
          items={items}
          selectedItemId={selectedItemId}
          zoom={zoom}
          assetToolType={assetToolType}
          onCreateItem={createItem}
          onMoveItem={moveItem}
          onSelectItem={selectItem}
          onZoomChange={setZoom}
        />
        </div>

        <FloorplanSidebar
          activePanel={activePanel}
          canEdit={canEdit}
          activeTool={activeTool}
          assetToolType={assetToolType}
          floorplans={floorplans}
          items={items}
          rooms={rooms}
          selectedFloorplan={selectedFloorplan}
          selectedFloorplanId={selectedFloorplanId}
          selectedItem={selectedItem}
          sidebarOpen={sidebarOpen}
          working={working}
          onCreateFloorplan={createPlan}
          onToolChange={setActiveTool}
          onAssetToolChange={(assetType) => {
            setAssetToolType(assetType);
            setActiveTool("asset");
          }}
          onCloseSidebar={() => setSidebarOpen(false)}
          onFloorplanChange={onFloorplanChange}
          onRemoveFloorplan={removeFloorplan}
          onUpdateFloorplanSettings={updatePlanSettings}
          onItemChange={updateItem}
          onRemoveItem={removeItem}
          onUploadAttachment={uploadAttachment}
        />
      </div>
    </section>
  );
}

function clampPlanMeters(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function floorplanSettingsFromPlan(floorplan: Floorplan) {
  return {
    width: floorplan.width,
    height: floorplan.height,
    widthMeters: floorplan.widthMeters,
    heightMeters: floorplan.heightMeters,
    pixelsPerMeter: floorplan.pixelsPerMeter,
    showMeasurements: floorplan.showMeasurements,
  };
}

function clampPixelsPerMeter(value: number) {
  return Number.isFinite(value) ? Math.min(120, Math.max(10, Math.round(value))) : 40;
}

function firebaseErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    const message = error instanceof Error ? error.message : "";

    return [code, message].filter(Boolean).join(" - ") || "verifica regulile Firebase si Storage.";
  }

  return error instanceof Error ? error.message : "verifica regulile Firebase si Storage.";
}
