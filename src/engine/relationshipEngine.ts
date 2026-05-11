import type {
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureGraph,
  FlowType,
  NodeType,
  ViewMode,
} from "../types";

export function filterGraph(
  graph: ArchitectureGraph,
  filters: {
    nodeTypes?: NodeType[];
    flowTypes?: FlowType[];
    tags?: string[];
    groups?: string[];
    searchQuery?: string;
    showOrphaned?: boolean;
  }
): ArchitectureGraph {
  let { nodes, edges } = graph;

  if (filters.nodeTypes && filters.nodeTypes.length > 0) {
    nodes = nodes.filter((n) => filters.nodeTypes!.includes(n.type));
  }

  if (filters.flowTypes && filters.flowTypes.length > 0) {
    nodes = nodes.filter((n) =>
      n.flowTypes.some((ft) => filters.flowTypes!.includes(ft))
    );
    edges = edges.filter((e) => filters.flowTypes!.includes(e.flowType));
  }

  if (filters.tags && filters.tags.length > 0) {
    nodes = nodes.filter((n) =>
      n.tags.some((t) => filters.tags!.includes(t))
    );
  }

  if (filters.groups && filters.groups.length > 0) {
    nodes = nodes.filter((n) => n.group && filters.groups!.includes(n.group));
  }

  if (filters.searchQuery && filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    nodes = nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(query) ||
        n.description?.toLowerCase().includes(query) ||
        n.tags.some((t) => t.toLowerCase().includes(query)) ||
        n.sourcePath?.toLowerCase().includes(query)
    );
  }

  if (!filters.showOrphaned) {
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      connectedIds.add(edge.source);
      connectedIds.add(edge.target);
    }
    nodes = nodes.filter(
      (n) => connectedIds.has(n.id) || nodes.length <= 10
    );
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  edges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes, edges, groups: graph.groups };
}

export function getOrphanedNodes(graph: ArchitectureGraph): ArchitectureNode[] {
  const connectedIds = new Set<string>();
  for (const edge of graph.edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }
  return graph.nodes.filter((n) => !connectedIds.has(n.id));
}

export function getNodeConnections(
  nodeId: string,
  graph: ArchitectureGraph
): { incoming: ArchitectureEdge[]; outgoing: ArchitectureEdge[] } {
  return {
    incoming: graph.edges.filter((e) => e.target === nodeId),
    outgoing: graph.edges.filter((e) => e.source === nodeId),
  };
}

export function getDependencyChain(
  nodeId: string,
  graph: ArchitectureGraph,
  direction: "upstream" | "downstream" | "both" = "both"
): string[] {
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const relevantEdges =
      direction === "upstream"
        ? graph.edges.filter((e) => e.target === current)
        : direction === "downstream"
        ? graph.edges.filter((e) => e.source === current)
        : graph.edges.filter(
            (e) => e.source === current || e.target === current
          );

    for (const edge of relevantEdges) {
      const next =
        edge.source === current ? edge.target : edge.source;
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  visited.delete(nodeId);
  return [...visited];
}

export function computeHeatmap(
  graph: ArchitectureGraph
): Map<string, number> {
  const heat = new Map<string, number>();

  for (const node of graph.nodes) {
    let score = 0;

    const connections = graph.edges.filter(
      (e) => e.source === node.id || e.target === node.id
    );
    score += connections.length * 10;

    if (node.flowTypes.length > 1) score += node.flowTypes.length * 5;
    if (node.tags.length > 0) score += 2;

    heat.set(node.id, score);
  }

  const maxHeat = Math.max(...heat.values(), 1);
  for (const [id, score] of heat) {
    heat.set(id, score / maxHeat);
  }

  return heat;
}

export function detectUserJourneys(
  graph: ArchitectureGraph
): ArchitectureEdge[][] {
  const journeys: ArchitectureEdge[][] = [];

  const startNodes = graph.nodes.filter(
    (n) =>
      n.type === "page" &&
      !graph.edges.some((e) => e.target === n.id && e.source !== n.id)
  );

  const endNodes = graph.nodes.filter(
    (n) =>
      n.type === "action" &&
      !graph.edges.some((e) => e.source === n.id && e.target !== n.id)
  );

  for (const start of startNodes.slice(0, 10)) {
    for (const end of endNodes.slice(0, 10)) {
      const path = findPath(start.id, end.id, graph);
      if (path && path.length > 1) {
        const pathEdges = pathToEdges(path, graph);
        if (pathEdges.length > 0) {
          journeys.push(pathEdges);
        }
      }
    }
  }

  return journeys;
}

function findPath(
  startId: string,
  endId: string,
  graph: ArchitectureGraph
): string[] | null {
  const visited = new Set<string>();
  const queue: { node: string; path: string[] }[] = [
    { node: startId, path: [startId] },
  ];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;

    if (node === endId) return path;
    if (visited.has(node)) continue;
    visited.add(node);

    const neighbors = graph.edges
      .filter((e) => e.source === node)
      .map((e) => e.target);

    for (const next of neighbors) {
      if (!visited.has(next)) {
        queue.push({ node: next, path: [...path, next] });
      }
    }
  }

  return null;
}

function pathToEdges(
  path: string[],
  graph: ArchitectureGraph
): ArchitectureEdge[] {
  const edges: ArchitectureEdge[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const edge = graph.edges.find(
      (e) => e.source === path[i] && e.target === path[i + 1]
    );
    if (edge) edges.push(edge);
  }

  return edges;
}

export function getViewModeGraph(
  graph: ArchitectureGraph,
  mode: ViewMode
): ArchitectureGraph {
  switch (mode) {
    case "sitemap":
      return filterGraph(graph, {
        nodeTypes: ["page", "screen"],
        showOrphaned: true,
      });

    case "user-flow":
      return filterGraph(graph, {
        nodeTypes: ["entry", "exit", "step", "decision", "error", "page", "screen"],
        showOrphaned: false,
      });

    case "dependency":
      return {
        nodes: graph.nodes.filter(
          (n) => n.type !== "group" && n.type !== "error"
        ),
        edges: graph.edges.filter((e) => e.flowType === "dependency"),
        groups: graph.groups,
      };

    case "heatmap":
      return { ...graph };

    default:
      return graph;
  }
}
