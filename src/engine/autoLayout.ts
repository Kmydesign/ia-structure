import type { ArchitectureNode, ArchitectureEdge } from "../types";
import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

export interface LayoutOptions {
  direction: "TB" | "LR" | "RL" | "BT";
  nodeSpacing: number;
  layerSpacing: number;
  padding: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: "TB",
  nodeSpacing: 80,
  layerSpacing: 120,
  padding: 60,
};

export async function computeAutoLayout(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  options: Partial<LayoutOptions> = {}
): Promise<Map<string, { x: number; y: number }>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) return positions;

  const edgeSourceTargets = new Set<string>();
  for (const e of edges) {
    edgeSourceTargets.add(e.source);
    edgeSourceTargets.add(e.target);
  }
  const connectedNodes = nodes.filter((n) => edgeSourceTargets.has(n.id));
  const orphanNodes = nodes.filter((n) => !edgeSourceTargets.has(n.id));

  try {
    if (connectedNodes.length > 0) {
      const elkGraph = buildELKGraph(connectedNodes, edges, opts);
      const layouted = await elk.layout(elkGraph);
      extractPositions(layouted, positions);
    }
  } catch (err) {
    console.warn("ELK layout failed, using grid:", err);
    gridLayout(connectedNodes, positions, 100, 100, opts);
  }

  let maxY = 0;
  for (const pos of positions.values()) {
    if (pos.y > maxY) maxY = pos.y;
  }

  gridLayout(orphanNodes, positions, 100, maxY + 200, opts);

  return positions;
}

function buildELKGraph(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  opts: LayoutOptions
) {
  const nodeWidth = 260;
  const nodeHeight = 90;

  const validIds = new Set(nodes.map((n) => n.id));

  const elkNodes = nodes.map((node) => ({
    id: node.id,
    width: nodeWidth,
    height: nodeHeight,
  }));

  const elkEdges = edges
    .filter((e) => validIds.has(e.source) && validIds.has(e.target) && e.source !== e.target)
    .map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }));

  const direction =
    opts.direction === "LR"
      ? "RIGHT"
      : opts.direction === "RL"
      ? "LEFT"
      : opts.direction === "BT"
      ? "UP"
      : "DOWN";

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": String(opts.nodeSpacing),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(opts.layerSpacing),
      "elk.padding": `[top=${opts.padding},left=${opts.padding},bottom=${opts.padding},right=${opts.padding}]`,
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.cycleBreaking.strategy": "GREEDY",
      "elk.layered.unnecessaryBendpoints": "true",
      "elk.spacing.edgeNode": "40",
      "elk.spacing.edgeEdge": "20",
    },
    children: elkNodes,
    edges: elkEdges,
  };
}

function extractPositions(
  elkNode: any,
  positions: Map<string, { x: number; y: number }>
) {
  if (elkNode.children) {
    for (const child of elkNode.children) {
      if (child.x !== undefined && child.y !== undefined) {
        positions.set(child.id, { x: child.x, y: child.y });
      }
      extractPositions(child, positions);
    }
  }
}

function gridLayout(
  nodes: ArchitectureNode[],
  positions: Map<string, { x: number; y: number }>,
  startX: number,
  startY: number,
  opts: LayoutOptions
) {
  const cols = Math.min(Math.ceil(Math.sqrt(nodes.length)), 4);
  const spacingX = 300;
  const spacingY = 160;

  for (let i = 0; i < nodes.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(nodes[i].id, {
      x: startX + col * spacingX,
      y: startY + row * spacingY,
    });
  }
}

export function computeGridLayout(
  nodeCount: number,
  spacing: { x: number; y: number } = { x: 280, y: 160 }
): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  const cols = Math.ceil(Math.sqrt(nodeCount));

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(i, {
      x: col * spacing.x + 100,
      y: row * spacing.y + 100,
    });
  }

  return positions;
}
