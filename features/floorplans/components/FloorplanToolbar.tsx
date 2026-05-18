"use client";

import type { FloorplanPanel, FloorplanTool } from "@/features/floorplans/types/floorplan.types";

type FloorplanToolbarProps = {
  activeTool: FloorplanTool;
  activePanel: FloorplanPanel;
  canEdit: boolean;
  canUndo: boolean;
  sidebarOpen: boolean;
  zoom: number;
  onActivePanelChange: (panel: FloorplanPanel) => void;
  onOpenAuditHistory: () => void;
  onOpenSidebar: () => void;
  onToggleSidebar: () => void;
  onToolChange: (tool: FloorplanTool) => void;
  onUndo: () => void;
  onZoomChange: (zoom: number) => void;
};

export function FloorplanToolbar({
  activeTool,
  activePanel,
  canEdit,
  canUndo,
  sidebarOpen,
  zoom,
  onActivePanelChange,
  onOpenAuditHistory,
  onOpenSidebar,
  onToggleSidebar,
  onToolChange,
  onUndo,
  onZoomChange,
}: FloorplanToolbarProps) {
  function openPanel(panel: FloorplanPanel) {
    onActivePanelChange(panel);
    onOpenSidebar();
  }

  return (
    <div className="floorplan-toolbar" aria-label="Instrumente plan">
      <div className="floorplan-tool-group">
        <button className={activePanel === "plan" ? "active" : ""} onClick={() => openPanel("plan")} type="button">
          Plan
        </button>
        <button
          className={activeTool === "select" ? "active" : ""}
          onClick={() => {
            onToolChange("select");
            onActivePanelChange("details");
            onOpenSidebar();
          }}
          type="button"
        >
          Selectare
        </button>
        <button className={activePanel === "shapes" ? "active" : ""} disabled={!canEdit} onClick={() => openPanel("shapes")} type="button">
          Forme
        </button>
        <button className={activePanel === "objects" ? "active" : ""} disabled={!canEdit} onClick={() => openPanel("objects")} type="button">
          Obiecte
        </button>
        <button className={activePanel === "details" ? "active" : ""} onClick={() => openPanel("details")} type="button">
          Detalii
        </button>
        <button disabled={!canUndo || !canEdit} onClick={onUndo} type="button">
          Undo
        </button>
        <button onClick={onOpenAuditHistory} type="button">
          Istoric
        </button>
        <button className="floorplan-sidebar-toggle" onClick={onToggleSidebar} type="button">
          {sidebarOpen ? "Ascunde" : "Panou"}
        </button>
      </div>

      <div className="floorplan-zoom">
        <button type="button" onClick={() => onZoomChange(0)}>
          Fit
        </button>
        <button type="button" onClick={() => onZoomChange(zoom <= 0 ? 0.85 : Math.max(0.25, zoom - 0.15))}>
          -
        </button>
        <span>{zoom <= 0 ? "Fit" : `${Math.round(zoom * 100)}%`}</span>
        <button type="button" onClick={() => onZoomChange(zoom <= 0 ? 0.85 : Math.min(3, zoom + 0.15))}>
          +
        </button>
      </div>
    </div>
  );
}
