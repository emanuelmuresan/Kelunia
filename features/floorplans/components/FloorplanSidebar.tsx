"use client";

import { useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";

import type { RoomItem } from "@/lib/types/domain";
import type {
  Floorplan,
  FloorplanAttachmentKind,
  FloorplanAssetType,
  FloorplanItem,
  FloorplanItemDraft,
  FloorplanPanel,
  FloorplanItemStatus,
  FloorplanItemType,
  FloorplanTool,
} from "@/features/floorplans/types/floorplan.types";

type FloorplanSidebarProps = {
  activePanel: FloorplanPanel;
  activeTool: FloorplanTool;
  assetToolType: FloorplanAssetType;
  canEdit: boolean;
  floorplans: Floorplan[];
  items: FloorplanItem[];
  rooms: RoomItem[];
  selectedFloorplan: Floorplan | null;
  selectedFloorplanId: string;
  selectedItem: FloorplanItem | null;
  sidebarOpen: boolean;
  working: boolean;
  onCreateFloorplan: (name: string, floorLabel: string, widthMeters: number, heightMeters: number, pixelsPerMeter: number, showMeasurements: boolean, file: File | null) => Promise<boolean>;
  onToolChange: (tool: FloorplanTool) => void;
  onAssetToolChange: (assetType: FloorplanAssetType) => void;
  onCloseSidebar: () => void;
  onFloorplanChange: (id: string) => void;
  onRemoveFloorplan: () => void;
  onUpdateFloorplanSettings: (widthMeters: number, heightMeters: number, pixelsPerMeter: number, showMeasurements: boolean) => void;
  onItemChange: (patch: Partial<FloorplanItemDraft>) => void;
  onRemoveItem: () => void;
  onUploadAttachment: (kind: FloorplanAttachmentKind, file: File) => void;
};

const itemTypes: Array<{ value: FloorplanItemType; label: string }> = [
  { value: "room", label: "Dreptunghi / zona" },
  { value: "circle", label: "Cerc" },
  { value: "asset", label: "Obiect" },
  { value: "wall", label: "Perete" },
  { value: "door", label: "Usa" },
  { value: "window", label: "Geam" },
  { value: "text", label: "Text" },
];

const assetTypes: Array<{ value: FloorplanAssetType; label: string }> = [
  { value: "table", label: "Masa" },
  { value: "chair", label: "Scaun" },
  { value: "desk", label: "Birou" },
  { value: "sofa", label: "Canapea" },
  { value: "bed", label: "Pat" },
  { value: "tv", label: "TV" },
  { value: "sink", label: "Chiuveta" },
  { value: "toilet", label: "WC" },
  { value: "cabinet", label: "Dulap" },
  { value: "appliance", label: "Electrocasnic" },
  { value: "equipment", label: "Echipament" },
  { value: "storage", label: "Depozitare" },
  { value: "custom", label: "Alt obiect" },
];

const statuses: Array<{ value: FloorplanItemStatus; label: string }> = [
  { value: "available", label: "Disponibil" },
  { value: "occupied", label: "Ocupat" },
  { value: "maintenance", label: "Mentenanta" },
  { value: "broken", label: "Defect" },
];

const floorLabels = ["Subsol", "Parter", "Etaj 1", "Etaj 2", "Etaj 3", "Etaj 4", "Etaj 5"];
const defaultPixelsPerMeter = 40;
const scaleOptions = [20, 40, 60, 100];

function metersFromPixels(pixels: number, pixelsPerMeter: number) {
  return Number((pixels / pixelsPerMeter).toFixed(2));
}

export function FloorplanSidebar({
  activePanel,
  activeTool,
  assetToolType,
  canEdit,
  floorplans,
  items,
  rooms,
  selectedFloorplan,
  selectedFloorplanId,
  selectedItem,
  sidebarOpen,
  working,
  onCreateFloorplan,
  onToolChange,
  onAssetToolChange,
  onCloseSidebar,
  onFloorplanChange,
  onRemoveFloorplan,
  onUpdateFloorplanSettings,
  onItemChange,
  onRemoveItem,
  onUploadAttachment,
}: FloorplanSidebarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPlanSettings, setShowPlanSettings] = useState(false);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const floorLabel = String(form.get("floorLabel") ?? "").trim();
    const widthMeters = Number(form.get("widthMeters") ?? 20);
    const heightMeters = Number(form.get("heightMeters") ?? 12);
    const pixelsPerMeter = Number(form.get("pixelsPerMeter") ?? 40);
    const showMeasurements = form.get("showMeasurements") === "on";
    const maybeFile = form.get("background");
    const file = maybeFile instanceof File ? maybeFile : null;

    const created = await onCreateFloorplan(name, floorLabel, widthMeters, heightMeters, pixelsPerMeter, showMeasurements, file && file.size > 0 ? file : null);

    if (created) {
      event.currentTarget.reset();
      setShowCreateForm(false);
    }
  }

  function upload(kind: FloorplanAttachmentKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onUploadAttachment(kind, file);
    }

    event.target.value = "";
  }

  function updatePlanSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onUpdateFloorplanSettings(
      Number(form.get("widthMeters") ?? selectedFloorplan?.widthMeters ?? 20),
      Number(form.get("heightMeters") ?? selectedFloorplan?.heightMeters ?? 12),
      Number(form.get("pixelsPerMeter") ?? selectedFloorplan?.pixelsPerMeter ?? 40),
      form.get("showMeasurements") === "on"
    );
    setShowPlanSettings(false);
  }

  return (
    <aside className={`floorplan-sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="floorplan-sidebar-head">
        <strong>{sidebarTitle(activePanel)}</strong>
        <button aria-label="Inchide panoul" className="icon-button compact" onClick={onCloseSidebar} type="button">
          x
        </button>
      </div>

      {activePanel === "plan" && (
      <section className="floorplan-panel">
        <span className="eyebrow">Planuri</span>
        <label>
          Plan activ
          <select value={selectedFloorplanId} onChange={(event) => onFloorplanChange(event.target.value)}>
            <option value="">Alege planul</option>
            {floorplans.map((floorplan) => (
              <option key={floorplan.id} value={floorplan.id}>
                {floorplan.floorLabel ? `${floorplan.floorLabel} - ${floorplan.name}` : floorplan.name}
              </option>
            ))}
          </select>
        </label>

        {canEdit && (
          <div className="floorplan-panel-actions">
            <button className="secondary-button" onClick={() => setShowCreateForm((value) => !value)} type="button">
              {showCreateForm ? "Inchide" : "Plan nou"}
            </button>
            {selectedFloorplan && (
              <button className="secondary-button" onClick={() => setShowPlanSettings((value) => !value)} type="button">
                {showPlanSettings ? "Inchide editarea" : "Editeaza plan"}
              </button>
            )}
            {selectedFloorplan && (
              <button className="danger-button" disabled={working} onClick={onRemoveFloorplan} type="button">
                Sterge planul
              </button>
            )}
          </div>
        )}

        {canEdit && showCreateForm && (
          <form className="floorplan-create" onSubmit={createPlan}>
            <label>
              Nume plan
              <input name="name" placeholder="Ex. Sala principala" />
            </label>
            <label>
              Etaj
              <select name="floorLabel" defaultValue="Parter">
                {floorLabels.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </label>
            <div className="floorplan-dimensions">
              <label>
                Latime (m)
                <input defaultValue="20" max="100" min="1" name="widthMeters" step="0.5" type="number" />
              </label>
              <label>
                Inaltime (m)
                <input defaultValue="12" max="100" min="1" name="heightMeters" step="0.5" type="number" />
              </label>
            </div>
            <label>
              Scara
              <select name="pixelsPerMeter" defaultValue="40">
                {scaleOptions.map((value) => (
                  <option key={value} value={value}>1 m = {value} px</option>
                ))}
              </select>
            </label>
            <label>
              Imagine fundal
              <input accept="image/png,image/jpeg,image/webp" name="background" type="file" />
            </label>
            <label className="checkbox-line">
              <input defaultChecked name="showMeasurements" type="checkbox" />
              Arata dimensiunile peretilor
            </label>
            <button className="primary-button" disabled={working} type="submit">
              Creeaza plan
            </button>
          </form>
        )}

        {canEdit && selectedFloorplan && showPlanSettings && (
          <form className="floorplan-create floorplan-scale-form" key={selectedFloorplan.id} onSubmit={updatePlanSettings}>
            <span className="eyebrow">Dimensiuni</span>
            <div className="floorplan-dimensions">
              <label>
                Latime (m)
                <input defaultValue={selectedFloorplan.widthMeters} max="100" min="1" name="widthMeters" step="0.5" type="number" />
              </label>
              <label>
                Inaltime (m)
                <input defaultValue={selectedFloorplan.heightMeters} max="100" min="1" name="heightMeters" step="0.5" type="number" />
              </label>
            </div>
            <label>
              Scara
              <select name="pixelsPerMeter" defaultValue={selectedFloorplan.pixelsPerMeter}>
                {scaleOptions.map((value) => (
                  <option key={value} value={value}>1 m = {value} px</option>
                ))}
              </select>
            </label>
            <label className="checkbox-line">
              <input defaultChecked={selectedFloorplan.showMeasurements} name="showMeasurements" type="checkbox" />
              Arata dimensiunile peretilor
            </label>
            <button className="secondary-button" disabled={working} type="submit">
              Salveaza planul
            </button>
          </form>
        )}
      </section>
      )}

      {canEdit && activePanel === "shapes" && (
        <section className="floorplan-panel">
          <span className="eyebrow">Forme</span>
          <div className="floorplan-tool-palette" aria-label="Unelte plan">
            <button className={activeTool === "wall" ? "active" : ""} draggable onClick={() => onToolChange("wall")} onDragStart={(event) => dragTool(event, "wall")} type="button">
              LIN
              <span>Perete</span>
            </button>
            <button className={activeTool === "room" ? "active" : ""} draggable onClick={() => onToolChange("room")} onDragStart={(event) => dragTool(event, "room")} type="button">
              DRT
              <span>Dreptunghi</span>
            </button>
            <button className={activeTool === "circle" ? "active" : ""} draggable onClick={() => onToolChange("circle")} onDragStart={(event) => dragTool(event, "circle")} type="button">
              CRC
              <span>Cerc</span>
            </button>
            <button className={activeTool === "door" ? "active" : ""} draggable onClick={() => onToolChange("door")} onDragStart={(event) => dragTool(event, "door")} type="button">
              USA
              <span>Usa</span>
            </button>
            <button className={activeTool === "window" ? "active" : ""} draggable onClick={() => onToolChange("window")} onDragStart={(event) => dragTool(event, "window")} type="button">
              GEM
              <span>Geam</span>
            </button>
            <button className={activeTool === "text" ? "active" : ""} draggable onClick={() => onToolChange("text")} onDragStart={(event) => dragTool(event, "text")} type="button">
              TXT
              <span>Text</span>
            </button>
          </div>
          <p className="muted-note">Alege o forma si apasa pe plan, sau trage forma direct pe plan.</p>
        </section>
      )}

      {canEdit && activePanel === "objects" && (
        <section className="floorplan-panel">
          <span className="eyebrow">Obiecte</span>
          <div className="floorplan-object-palette" aria-label="Obiecte plan">
            {assetTypes.map((type) => (
              <button
                key={type.value}
                className={activeTool === "asset" && assetToolType === type.value ? "active" : ""}
                draggable
                onClick={() => onAssetToolChange(type.value)}
                onDragStart={(event) => dragAsset(event, type.value)}
                type="button"
              >
                <strong>{assetShortLabel(type.value)}</strong>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
          <p className="muted-note">Alege un obiect si apasa pe plan, sau trage-l pe plan.</p>
        </section>
      )}

      {activePanel === "details" && (
      <>
      <section className="floorplan-panel floorplan-inspector">
        <span className="eyebrow">Detalii element</span>
        {!selectedItem ? (
          <p className="muted-note">Alege un element de pe plan ca sa il editezi.</p>
        ) : (
          <InspectorFields
            canEdit={canEdit}
            rooms={rooms}
            selectedFloorplan={selectedFloorplan}
            selectedItem={selectedItem}
            working={working}
            onItemChange={onItemChange}
            onRemoveItem={onRemoveItem}
            onUpload={upload}
          />
        )}
      </section>

      <section className="floorplan-panel">
        <span className="eyebrow">Elemente</span>
        <p className="muted-note">{items.length} elemente pe plan</p>
        <div className="floorplan-item-list">
          {items.map((item) => (
            <span key={item.id} className={`floorplan-item-pill floorplan-status-${item.status}`}>
              {item.name || item.type}
            </span>
          ))}
        </div>
      </section>
      </>
      )}
    </aside>
  );
}

type InspectorFieldsProps = {
  canEdit: boolean;
  rooms: RoomItem[];
  selectedFloorplan: Floorplan | null;
  selectedItem: FloorplanItem;
  working: boolean;
  onItemChange: (patch: Partial<FloorplanItemDraft>) => void;
  onRemoveItem: () => void;
  onUpload: (kind: FloorplanAttachmentKind, event: ChangeEvent<HTMLInputElement>) => void;
};

export function FloorplanInlineInspector({
  canEdit,
  rooms,
  selectedFloorplan,
  selectedItem,
  working,
  onItemChange,
  onRemoveItem,
  onUpload,
}: InspectorFieldsProps) {
  return (
    <div className="floorplan-inline-inspector">
      <InspectorFields
        compact
        canEdit={canEdit}
        rooms={rooms}
        selectedFloorplan={selectedFloorplan}
        selectedItem={selectedItem}
        working={working}
        onItemChange={onItemChange}
        onRemoveItem={onRemoveItem}
        onUpload={onUpload}
      />
    </div>
  );
}

function InspectorFields({
  canEdit,
  compact = false,
  rooms,
  selectedFloorplan,
  selectedItem,
  working,
  onItemChange,
  onRemoveItem,
  onUpload,
}: InspectorFieldsProps & { compact?: boolean }) {
  const pixelsPerMeter = selectedFloorplan?.pixelsPerMeter ?? defaultPixelsPerMeter;
  const isLinear = selectedItem.type === "wall" || selectedItem.type === "door" || selectedItem.type === "window";

  return (
    <div className={`settings-form ${compact ? "floorplan-compact-inspector" : ""}`}>
      <label>
        Nume
        <input disabled={!canEdit || working} value={selectedItem.name} placeholder="Ex. TV principal" onChange={(event) => onItemChange({ name: event.target.value })} />
      </label>

      <label>
        Tip
        <select disabled={!canEdit || working} value={selectedItem.type} onChange={(event) => onItemChange({ type: event.target.value as FloorplanItemType })}>
          {itemTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      {selectedItem.type === "asset" && (
        <label>
          Obiect
          <select disabled={!canEdit || working} value={selectedItem.assetType} onChange={(event) => onItemChange({ assetType: event.target.value as FloorplanAssetType })}>
            {assetTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {(selectedItem.type === "room" || selectedItem.type === "circle") && (
        <label>
          Sala legata
          <select disabled={!canEdit || working} value={selectedItem.linkedRoomId} onChange={(event) => onItemChange({ linkedRoomId: event.target.value })}>
            <option value="">Fara sala legata</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {isLinear && (
        <label>
          Lungime (m)
          <input
            disabled={!canEdit || working}
            min="0.1"
            step="0.1"
            type="number"
            value={metersFromPixels(selectedItem.width, pixelsPerMeter)}
            onChange={(event) => onItemChange({ width: Math.max(10, Math.round(Number(event.target.value) * pixelsPerMeter)) })}
          />
        </label>
      )}

      <div className="floorplan-dimensions">
        <label>
          {isLinear ? "Lungime px" : "Latime"}
          <input disabled={!canEdit || working} min="1" type="number" value={selectedItem.width} onChange={(event) => onItemChange({ width: Number(event.target.value) })} />
        </label>
        <label>
          {isLinear ? "Grosime" : "Inaltime"}
          <input disabled={!canEdit || working} min="1" type="number" value={selectedItem.height} onChange={(event) => onItemChange({ height: Number(event.target.value) })} />
        </label>
      </div>

      {(isLinear || selectedItem.type === "asset" || selectedItem.type === "text") && (
        <label>
          Rotatie
          <input
            disabled={!canEdit || working}
            max="360"
            min="-360"
            step="1"
            type="number"
            value={Math.round(selectedItem.rotation)}
            onChange={(event) => onItemChange({ rotation: Number(event.target.value) })}
          />
        </label>
      )}

      <label>
        Status
        <select disabled={!canEdit || working} value={selectedItem.status} onChange={(event) => onItemChange({ status: event.target.value as FloorplanItemStatus })}>
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Culoare
        <input disabled={!canEdit || working} type="color" value={selectedItem.color} onChange={(event) => onItemChange({ color: event.target.value })} />
      </label>

      {!compact && (
        <>
          <label>
            Observatii
            <textarea disabled={!canEdit || working} value={selectedItem.notes} placeholder="Garantie, stare, detalii utile" onChange={(event) => onItemChange({ notes: event.target.value })} />
          </label>

          <label>
            Poza
            <input accept="image/*" disabled={!canEdit || working} type="file" onChange={(event) => onUpload("photo", event)} />
          </label>
          {selectedItem.photoUrl && <a className="secondary-button" href={selectedItem.photoUrl} rel="noreferrer" target="_blank">Vezi poza</a>}

          <label>
            Factura / document
            <input accept="application/pdf,image/*" disabled={!canEdit || working} type="file" onChange={(event) => onUpload("document", event)} />
          </label>
          {selectedItem.documentUrl && <a className="secondary-button" href={selectedItem.documentUrl} rel="noreferrer" target="_blank">{selectedItem.documentName || "Vezi document"}</a>}
        </>
      )}

      <button className="danger-button" disabled={!canEdit || working} onClick={onRemoveItem} type="button">
        Sterge elementul
      </button>
    </div>
  );
}

function dragTool(event: DragEvent<HTMLButtonElement>, tool: Exclude<FloorplanTool, "select" | "asset">) {
  event.dataTransfer.setData("application/x-kelunia-floorplan-tool", JSON.stringify({ tool }));
  event.dataTransfer.effectAllowed = "copy";
}

function dragAsset(event: DragEvent<HTMLButtonElement>, assetType: FloorplanAssetType) {
  event.dataTransfer.setData("application/x-kelunia-floorplan-tool", JSON.stringify({ tool: "asset", assetType }));
  event.dataTransfer.effectAllowed = "copy";
}

function sidebarTitle(panel: FloorplanPanel) {
  const labels: Record<FloorplanPanel, string> = {
    plan: "Plan",
    shapes: "Forme",
    objects: "Obiecte",
    details: "Detalii",
  };

  return labels[panel];
}

function assetShortLabel(assetType: FloorplanAssetType) {
  const labels: Record<FloorplanAssetType, string> = {
    table: "MS",
    chair: "SC",
    desk: "BR",
    sofa: "CF",
    bed: "PT",
    tv: "TV",
    sink: "CH",
    toilet: "WC",
    cabinet: "DL",
    appliance: "AP",
    equipment: "EQ",
    storage: "DP",
    custom: "OB",
  };

  return labels[assetType];
}
