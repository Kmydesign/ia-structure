import React, { useCallback, useMemo, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  ArchitectureNode,
  DecisionNode,
  EntryNode,
  ExitNode,
  StepNode,
  ErrorNode,
} from "./nodes";
import { ArchitectureEdge, ConditionalEdge, BranchEdge } from "./edges";
import { useProjectStore } from "../../stores/projectStore";
import { useCanvasStore } from "../../stores/canvasStore";
import { useFilterStore } from "../../stores/filterStore";
import { NODE_COLORS, FLOW_COLORS } from "../../types";
import type { ArchitectureNodeData } from "../../types";
import { filterGraph, getViewModeGraph } from "../../engine/relationshipEngine";

const nodeTypes = {
  default: ArchitectureNode,
  decision: DecisionNode,
  entry: EntryNode,
  exit: ExitNode,
  step: StepNode,
  error: ErrorNode,
  page: ArchitectureNode,
  screen: ArchitectureNode,
  system: ArchitectureNode,
};

const edgeTypes = {
  default: ArchitectureEdge,
  conditional: ConditionalEdge,
  branch: BranchEdge,
};

const FlowCanvas: React.FC = () => {
  const reactFlowRef = useRef<any>(null);

  const projectGraph = useProjectStore((s) => s.graph);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const focusedFlowId = useCanvasStore((s) => s.focusedFlowId);
  const showMinimap = useCanvasStore((s) => s.showMinimap);

  const filters = useFilterStore();

  const { flowNodes, flowEdges } = useMemo(() => {
    let graph = projectGraph;

    if (focusedFlowId) {
      const flowNodes = graph.nodes.filter(
        (n) => n.sourcePath === focusedFlowId ||
          n.type === "page" ||
          n.type === "screen"
      );
      const flowNodeIds = new Set(flowNodes.map((n) => n.id));
      const flowEdges = graph.edges.filter(
        (e) => flowNodeIds.has(e.source) && flowNodeIds.has(e.target)
      );
      graph = { nodes: flowNodes, edges: flowEdges, groups: graph.groups };
    }

    const modeGraph = getViewModeGraph(graph, viewMode);
    const filtered = filterGraph(modeGraph, {
      nodeTypes: filters.activeNodeTypes.length > 0 ? filters.activeNodeTypes : undefined,
      flowTypes: filters.activeFlowTypes.length > 0 ? filters.activeFlowTypes : undefined,
      tags: filters.activeTags.length > 0 ? filters.activeTags : undefined,
      groups: filters.activeGroups.length > 0 ? filters.activeGroups : undefined,
      searchQuery: filters.searchQuery || undefined,
      showOrphaned: filters.showOrphaned,
    });

    const positionMap = new Map(
      projectGraph.nodes.map((n) => [n.id, n.position])
    );

    const nodes = filtered.nodes.map((gn) => ({
      id: gn.id,
      type: mapNodeType(gn.type),
      position: positionMap.get(gn.id) || gn.position || { x: 0, y: 0 },
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
        highlighted: false,
        dimmed: false,
        metadata: gn.metadata,
        branchLabels: gn.branchLabels,
        stepNumber: gn.type === "step" ? parseInt(gn.id.match(/step-(\d+)/)?.[1] || "0", 10) : undefined,
      } as ArchitectureNodeData,
    }));

    const edges = filtered.edges.map((ge) => {
      const isBranch = ge.flowType === "branch" || ge.conditional;
      return {
        id: ge.id,
        source: ge.source,
        target: ge.target,
        sourceHandle: ge.sourceHandle,
        targetHandle: ge.targetHandle,
        type: isBranch ? "branch" : ge.conditional ? "conditional" : "default",
        label: ge.conditionLabel || ge.label,
        animated: ge.animated,
        style: {
          stroke: isBranch
            ? getBranchColor(ge.conditionLabel || ge.label)
            : ge.flowType === "sequential"
            ? "#3b82f640"
            : (FLOW_COLORS as Record<string, string>)[ge.flowType] || "#3b82f6",
          strokeWidth: isBranch ? 2 : 1.5,
        },
        labelStyle: {
          fill: isBranch ? getBranchColor(ge.conditionLabel || ge.label) : "#71717a",
          fontSize: 10,
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: isBranch ? 600 : 400,
        },
        labelBgStyle: {
          fill: "#0a0a0b",
          fillOpacity: 0.95,
        },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [projectGraph, viewMode, focusedFlowId, filters]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  useEffect(() => {
    const timer = setTimeout(() => {
      reactFlowRef.current?.fitView?.({ padding: 0.15, duration: 600 });
    }, 200);
    return () => clearTimeout(timer);
  }, [flowNodes.length, focusedFlowId]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    useCanvasStore.getState().selectNode(node.id);
  }, []);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: any) => {
    const id = node.id;
    setNodes((nds) =>
      nds.map((n) => {
        const connected = edges.some((e) => e.source === id && e.target === n.id) ||
                         edges.some((e) => e.target === id && e.source === n.id) ||
                         n.id === id;
        return {
          ...n,
          data: {
            ...n.data,
            highlighted: connected,
            dimmed: !connected,
          },
        };
      })
    );
  }, [edges, setNodes]);

  const onNodeMouseLeave = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, highlighted: false, dimmed: false },
      }))
    );
  }, [setNodes]);

  const onPaneClick = useCallback(() => {
    useCanvasStore.getState().selectNode(null);
  }, []);

  const handleInit = useCallback((instance: any) => {
    reactFlowRef.current = instance;
    setTimeout(() => {
      instance.fitView?.({ padding: 0.15, duration: 800 });
    }, 400);
  }, []);

  const minimapNodeColor = useCallback((node: any) => {
    const type: string = node.data?.nodeType || "page";
    return (NODE_COLORS as Record<string, string>)[type] || "#3b82f6";
  }, []);

  return (
    <div className="w-full h-full bg-surface">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        onInit={handleInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={3}
        defaultEdgeOptions={{
          type: "default",
          style: { strokeWidth: 1.5, stroke: "#27272a" },
        }}
        proOptions={{ hideAttribution: true }}
        className="!bg-surface"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1e1e22"
        />

        {showMinimap && (
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(10, 10, 11, 0.85)"
            style={{
              backgroundColor: "#111113",
              border: "1px solid #27272a",
              borderRadius: 12,
            }}
            pannable
            zoomable
          />
        )}

        <Controls
          showInteractive={false}
          className="!bg-[#111113] !border-[#27272a] !rounded-xl !shadow-xl [&>button]:!bg-[#111113] [&>button]:!border-[#27272a] [&>button]:!text-[#71717a] [&>button:hover]:!bg-[#18181b] [&>button:hover]:!text-[#e4e4e7]"
        />
      </ReactFlow>
    </div>
  );
};

function mapNodeType(type: string): string {
  switch (type) {
    case "entry":
      return "entry";
    case "exit":
      return "exit";
    case "step":
      return "step";
    case "decision":
      return "decision";
    case "error":
      return "error";
    default:
      return "default";
  }
}

function getBranchColor(label?: string): string {
  if (!label) return "#f97316";
  const lower = label.toLowerCase();
  if (lower === "yes" || lower === "pass" || lower === "success") return "#22c55e";
  if (lower === "no" || lower === "fail" || lower === "error") return "#ef4444";
  return "#f97316";
}

export default FlowCanvas;
