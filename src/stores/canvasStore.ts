import { create } from "zustand";
import type { Node, Edge, Viewport } from "reactflow";
import type {
  ArchitectureNodeData,
  ArchitectureNode,
  ArchitectureGraph,
  ViewMode,
  ArchitectureEdge,
  NODE_COLORS,
} from "../types";
import { filterGraph, getViewModeGraph } from "../engine/relationshipEngine";
import { computeAutoLayout } from "../engine/autoLayout";
import { useFilterStore } from "./filterStore";
import { NODE_COLORS as nodeColors, FLOW_COLORS } from "../types";

interface CanvasActions {
  setNodes: (nodes: Node<ArchitectureNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  setViewport: (viewport: Viewport) => void;
  selectNode: (id: string | null) => void;
  selectNodes: (ids: string[]) => void;
  toggleNodeExpanded: (id: string) => void;
  highlightConnections: (nodeId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLayoutDirection: (dir: "TB" | "LR" | "RL" | "BT") => void;
  toggleMinimap: () => void;
  toggleAutoLayout: () => void;
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  syncWithGraph: (graph: ArchitectureGraph) => void;
  recomputeLayout: () => Promise<void>;
  resetCanvas: () => void;
  setFocusedFlow: (flowPath: string | null) => void;
}

interface CanvasState {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  viewMode: ViewMode;
  layoutDirection: "TB" | "LR" | "RL" | "BT";
  showMinimap: boolean;
  autoLayout: boolean;
  fitViewOnUpdate: boolean;
  focusedFlowId: string | null;
}

const initialCanvas: CanvasState = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  selectedNodeIds: [],
  hoveredNodeId: null,
  viewMode: "architecture",
  layoutDirection: "TB",
  showMinimap: true,
  autoLayout: true,
  fitViewOnUpdate: false,
  focusedFlowId: null,
};

let nodeIdCounter = 0;

function graphToFlowNodes(
  graphNodes: ArchitectureNode[],
  highlighted?: Set<string>,
  dimmed?: Set<string>
): Node<ArchitectureNodeData>[] {
  return graphNodes.map((gn) => ({
    id: gn.id,
    type: gn.type === "decision" ? "decision" : gn.type === "group" ? "group" : "default",
    position: gn.position || { x: 0, y: 0 },
    data: {
      nodeType: gn.type,
      label: gn.label,
      description: gn.description,
      sourcePath: gn.sourcePath,
      tags: gn.tags,
      flowTypes: gn.flowTypes,
      group: gn.group,
      connections: 0,
      expanded: false,
      selected: false,
      highlighted: highlighted?.has(gn.id) ?? false,
      dimmed: dimmed?.has(gn.id) ?? false,
      metadata: gn.metadata,
    } as ArchitectureNodeData,
  }));
}

function graphToFlowEdges(graphEdges: ArchitectureEdge[]): Edge[] {
  return graphEdges.map((ge) => ({
    id: ge.id,
    source: ge.source,
    target: ge.target,
    type: ge.conditional ? "conditional" : "default",
    label: ge.conditionLabel || ge.label,
    animated: ge.animated,
    style: {
      stroke: FLOW_COLORS[ge.flowType] || "#3b82f6",
      strokeWidth: 1.5,
    },
    labelStyle: {
      fill: "#71717a",
      fontSize: 11,
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    },
    labelBgStyle: {
      fill: "#0a0a0b",
      fillOpacity: 0.9,
    },
    labelBgPadding: [4, 8] as [number, number],
    labelBgBorderRadius: 4,
  }));
}

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  (set, get) => ({
    ...initialCanvas,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    onNodesChange: (changes) => {
      const { nodes } = get();
      const updated = applyNodeChanges(changes, nodes);
      set({ nodes: updated });
    },

    onEdgesChange: (changes) => {
      const { edges } = get();
      const updated = applyEdgeChanges(changes, edges);
      set({ edges: updated });
    },

    setViewport: (viewport) => set({ viewport }),

    selectNode: (id) =>
      set({
        selectedNodeId: id,
        selectedNodeIds: id ? [id] : [],
      }),

    selectNodes: (ids) =>
      set({ selectedNodeIds: ids, selectedNodeId: ids[0] || null }),

    toggleNodeExpanded: (id) => {
      const { nodes } = get();
      const updated = nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, expanded: !n.data.expanded } } : n
      );
      set({ nodes: updated });
    },

    highlightConnections: (nodeId) => {
      set({ hoveredNodeId: nodeId });

      if (!nodeId) {
        const { nodes } = get();
        set({
          nodes: nodes.map((n) => ({
            ...n,
            data: { ...n.data, highlighted: false, dimmed: false },
          })),
        });
        return;
      }

      const { nodes, edges } = get();
      const connectedIds = new Set<string>([nodeId]);
      for (const edge of edges) {
        if (edge.source === nodeId) connectedIds.add(edge.target);
        if (edge.target === nodeId) connectedIds.add(edge.source);
      }

      set({
        nodes: nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            highlighted: connectedIds.has(n.id),
            dimmed: !connectedIds.has(n.id),
          },
        })),
      });
    },

    setViewMode: (mode) => {
      set({ viewMode: mode, fitViewOnUpdate: true });
    },

    setLayoutDirection: (dir) => set({ layoutDirection: dir }),

    toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),

    toggleAutoLayout: () => set((s) => ({ autoLayout: !s.autoLayout })),

    fitView: () => set({ fitViewOnUpdate: true }),
    zoomIn: () => {},
    zoomOut: () => {},

    syncWithGraph: (graph) => {
      const { viewMode } = get();
      const filters = useFilterStore.getState();
      const modeGraph = getViewModeGraph(graph, viewMode);
      const filtered = filterGraph(modeGraph, {
        nodeTypes: filters.activeNodeTypes.length > 0 ? filters.activeNodeTypes : undefined,
        flowTypes: filters.activeFlowTypes.length > 0 ? filters.activeFlowTypes : undefined,
        tags: filters.activeTags.length > 0 ? filters.activeTags : undefined,
        groups: filters.activeGroups.length > 0 ? filters.activeGroups : undefined,
        searchQuery: filters.searchQuery || undefined,
        showOrphaned: filters.showOrphaned,
      });

      const flowNodes = graphToFlowNodes(filtered.nodes);
      const flowEdges = graphToFlowEdges(filtered.edges);

      const existingPositions = new Map(
        get().nodes.map((n) => [n.id, n.position])
      );

      const mergedNodes = flowNodes.map((n) => ({
        ...n,
        position: existingPositions.get(n.id) || n.position,
      }));

      set({
        nodes: mergedNodes,
        edges: flowEdges,
        fitViewOnUpdate: true,
      });

      if (get().autoLayout) {
        get().recomputeLayout();
      }
    },

    recomputeLayout: async () => {
      const { nodes, edges, layoutDirection } = get();

      if (nodes.length === 0) return;

      const archNodes = nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        label: n.data.label,
        metadata: n.data.metadata,
        tags: n.data.tags,
        flowTypes: n.data.flowTypes,
      }));

      const archEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        flowType: "navigation" as const,
      }));

      const positions = await computeAutoLayout(archNodes, archEdges, {
        direction: layoutDirection,
      });

      set({
        nodes: nodes.map((n) => ({
          ...n,
          position: positions.get(n.id) || n.position,
        })),
        fitViewOnUpdate: true,
      });
    },

    resetCanvas: () => set(initialCanvas),

    setFocusedFlow: (flowPath) =>
      set({ focusedFlowId: flowPath, fitViewOnUpdate: true }),
  })
);

function applyNodeChanges(changes: any[], nodes: Node<ArchitectureNodeData>[]): Node<ArchitectureNodeData>[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));

  for (const change of changes) {
    switch (change.type) {
      case "position":
        if (change.position && nodeMap.has(change.id)) {
          const node = nodeMap.get(change.id)!;
          nodeMap.set(change.id, {
            ...node,
            position: change.position,
            dragging: change.dragging ?? node.dragging,
          });
        }
        break;
      case "dimensions":
        break;
      case "select":
        if (nodeMap.has(change.id)) {
          const node = nodeMap.get(change.id)!;
          nodeMap.set(change.id, { ...node, selected: change.selected });
        }
        break;
      case "remove":
        nodeMap.delete(change.id);
        break;
    }
  }

  return [...nodeMap.values()];
}

function applyEdgeChanges(changes: any[], edges: Edge[]): Edge[] {
  const edgeMap = new Map(edges.map((e) => [e.id, { ...e }]));

  for (const change of changes) {
    switch (change.type) {
      case "remove":
        edgeMap.delete(change.id);
        break;
      case "select":
        if (edgeMap.has(change.id)) {
          const edge = edgeMap.get(change.id)!;
          edgeMap.set(change.id, { ...edge, selected: change.selected });
        }
        break;
    }
  }

  return [...edgeMap.values()];
}
