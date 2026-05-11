import React, { useCallback, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useCanvasStore } from "../../stores/canvasStore";
import { useFilterStore } from "../../stores/filterStore";
import type { ViewMode } from "../../types";

const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    id: "architecture",
    label: "All",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "user-flow",
    label: "Flows",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12h4l3-9 4 18 3-9h6" />
      </svg>
    ),
  },
  {
    id: "sitemap",
    label: "Sitemap",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="4" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="12" r="2" />
        <circle cx="6" cy="20" r="2" />
        <circle cx="18" cy="20" r="2" />
        <line x1="12" y1="6" x2="6" y2="10" />
        <line x1="12" y1="6" x2="18" y2="10" />
        <line x1="6" y1="14" x2="6" y2="18" />
        <line x1="18" y1="14" x2="18" y2="18" />
      </svg>
    ),
  },
  {
    id: "dependency",
    label: "Dependency",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="12" cy="18" r="3" />
        <line x1="8.5" y1="7.5" x2="15.5" y2="7.5" />
        <line x1="7" y1="8.5" x2="10.5" y2="15.5" />
        <line x1="17" y1="8.5" x2="13.5" y2="15.5" />
      </svg>
    ),
  },
  {
    id: "heatmap",
    label: "Heatmap",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="4" height="4" rx="1" />
        <rect x="10" y="3" width="4" height="4" rx="1" />
        <rect x="17" y="3" width="4" height="4" rx="1" />
        <rect x="3" y="10" width="4" height="4" rx="1" />
        <rect x="10" y="10" width="4" height="4" rx="1" />
        <rect x="17" y="10" width="4" height="4" rx="1" />
        <rect x="3" y="17" width="4" height="4" rx="1" />
        <rect x="10" y="17" width="4" height="4" rx="1" />
        <rect x="17" y="17" width="4" height="4" rx="1" />
      </svg>
    ),
  },
];

const Toolbar: React.FC = () => {
  const scanFolder = useProjectStore((s) => s.scanFolder);
  const isScanning = useProjectStore((s) => s.isScanning);
  const rootPath = useProjectStore((s) => s.rootPath);
  const graph = useProjectStore((s) => s.graph);

  const viewMode = useCanvasStore((s) => s.viewMode);
  const setViewMode = useCanvasStore((s) => s.setViewMode);
  const layoutDirection = useCanvasStore((s) => s.layoutDirection);
  const setLayoutDirection = useCanvasStore((s) => s.setLayoutDirection);
  const showMinimap = useCanvasStore((s) => s.showMinimap);
  const toggleMinimap = useCanvasStore((s) => s.toggleMinimap);

  const searchQuery = useFilterStore((s) => s.searchQuery);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const clearFilters = useFilterStore((s) => s.clearFilters);

  const handleOpenFolder = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/tauri");
      const path = await invoke<string | null>("open_folder");
      if (path) {
        await scanFolder(path);
      }
    } catch (e) {
      console.error("Failed to open folder:", e);
    }
  }, [scanFolder]);

  const handleRelayout = useCallback(async () => {
    const { computeAutoLayout } = await import("../../engine/autoLayout");
    const positions = await computeAutoLayout(graph.nodes, graph.edges, {
      direction: layoutDirection,
    });
    const updatedNodes = graph.nodes.map((node) => ({
      ...node,
      position: positions.get(node.id) || node.position || { x: 0, y: 0 },
    }));
    useProjectStore.setState({ graph: { ...graph, nodes: updatedNodes } });
  }, [graph, layoutDirection]);

  const handleRelayoutWithDirection = useCallback(async (direction: "TB" | "LR") => {
    const { computeAutoLayout } = await import("../../engine/autoLayout");
    const positions = await computeAutoLayout(graph.nodes, graph.edges, {
      direction,
    });
    const updatedNodes = graph.nodes.map((node) => ({
      ...node,
      position: positions.get(node.id) || node.position || { x: 0, y: 0 },
    }));
    useProjectStore.setState({ graph: { ...graph, nodes: updatedNodes } });
  }, [graph]);

  return (
    <div className="h-12 bg-surface-raised border-b border-surface-border flex items-center px-3 gap-2">
      <button
        onClick={handleOpenFolder}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium
          transition-all duration-150
          ${rootPath
            ? "bg-surface-overlay text-text-secondary hover:text-text-primary"
            : "bg-accent text-white hover:bg-accent-hover"
          }
        `}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <polyline points="9,14 12,11 15,14" />
        </svg>
        {rootPath ? "Change Folder" : "Open Folder"}
        {isScanning && (
          <span className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        )}
      </button>

      <div className="w-px h-5 bg-surface-border mx-1" />

      <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
        {viewModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium
              transition-all duration-150
              ${viewMode === mode.id
                ? "bg-surface-overlay text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
              }
            `}
            title={mode.label}
          >
            {mode.icon}
            <span className="hidden lg:inline">{mode.label}</span>
          </button>
        ))}
      </div>

      {useCanvasStore((s) => s.focusedFlowId) && (
        <button
          onClick={() => useCanvasStore.getState().setFocusedFlow(null)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Clear Focus
        </button>
      )}

      <div className="w-px h-5 bg-surface-border mx-1" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={async () => {
            setLayoutDirection("TB");
            await handleRelayoutWithDirection("TB");
          }}
          className={`p-1.5 rounded-md transition-colors ${layoutDirection === "TB" ? "bg-surface-overlay text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
          title="Top to Bottom"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="12" y1="3" x2="12" y2="21" />
            <polyline points="6,9 12,3 18,9" />
          </svg>
        </button>
        <button
          onClick={async () => {
            setLayoutDirection("LR");
            await handleRelayoutWithDirection("LR");
          }}
          className={`p-1.5 rounded-md transition-colors ${layoutDirection === "LR" ? "bg-surface-overlay text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
          title="Left to Right"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="12" x2="21" y2="12" />
            <polyline points="9,6 3,12 9,18" />
          </svg>
        </button>
      </div>

      <div className="w-px h-5 bg-surface-border mx-1" />

      <button
        onClick={handleRelayout}
        className="p-1.5 rounded-md text-text-muted hover:text-text-secondary transition-colors"
        title="Auto Layout"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="8" y="16" width="8" height="5" rx="1" />
          <line x1="6.5" y1="8" x2="12" y2="16" />
          <line x1="17.5" y1="8" x2="12" y2="16" />
        </svg>
      </button>

      <button
        onClick={toggleMinimap}
        className={`p-1.5 rounded-md transition-colors ${showMinimap ? "text-accent" : "text-text-muted hover:text-text-secondary"}`}
        title="Toggle Minimap"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <rect x="6" y="6" width="8" height="4" rx="1" />
          <rect x="6" y="13" width="12" height="3" rx="1" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="relative">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search nodes..."
          className="w-44 pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-surface-border text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-surface-border-light transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); clearFilters(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
