import type { ArchitectureNode, ArchitectureEdge } from "../types";

interface MermaidParseResult {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export function parseMermaidGraph(mermaidCode: string): MermaidParseResult {
  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];

  const cleaned = mermaidCode.trim();

  const flowchartMatch = cleaned.match(
    /(?:flowchart|graph)\s+(?:TB|BT|LR|RL|TD)\s*\n([\s\S]*)/
  );

  if (!flowchartMatch) return { nodes, edges };

  const body = flowchartMatch[1];
  const nodeIdMap = new Map<string, string>();
  let nodeIndex = 0;

  const nodeRegex = /([A-Za-z0-9_-]+)(?:\[([^\]]*)\]|\(([^\)]*)\)|\{([^}]*)\}|>([^\]]*)\])?/g;

  const lines = body.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%") || trimmed.startsWith("style") || trimmed.startsWith("classDef") || trimmed.startsWith("class ")) continue;

    const edgePatterns = [
      /([A-Za-z0-9_-]+)\s*-->[*\|]?([^*|]*)[*\|]?\s*([A-Za-z0-9_-]+)/,
      /([A-Za-z0-9_-]+)\s*---?\s*([A-Za-z0-9_-]+)/,
      /([A-Za-z0-9_-]+)\s*-.->\s*([A-Za-z0-9_-]+)/,
      /([A-Za-z0-9_-]+)\s*==>\s*([A-Za-z0-9_-]+)/,
    ];

    let matched = false;
    for (const pattern of edgePatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const sourceId = match[1];
        const label = match[2] || undefined;
        const targetId = match[3] || match[2];

        if (!nodeIdMap.has(sourceId)) {
          const nodeId = `mermaid-${nodeIndex++}`;
          nodeIdMap.set(sourceId, nodeId);
          nodes.push({
            id: nodeId,
            type: "page",
            label: sourceId,
            metadata: {},
            tags: ["mermaid"],
            flowTypes: [],
          });
        }

        if (!nodeIdMap.has(targetId)) {
          const nodeId = `mermaid-${nodeIndex++}`;
          nodeIdMap.set(targetId, nodeId);
          nodes.push({
            id: nodeId,
            type: "page",
            label: targetId,
            metadata: {},
            tags: ["mermaid"],
            flowTypes: [],
          });
        }

        edges.push({
          id: `mermaid-edge-${nodeIndex++}`,
          source: nodeIdMap.get(sourceId)!,
          target: nodeIdMap.get(targetId)!,
          label,
          flowType: "navigation",
        });

        matched = true;
        break;
      }
    }

    if (!matched) {
      const soloMatch = trimmed.match(/([A-Za-z0-9_-]+)(?:\[(.+)\]|\((.+)\)|\{(.+)\})/);
      if (soloMatch) {
        const id = soloMatch[1];
        const label = soloMatch[2] || soloMatch[3] || soloMatch[4] || id;

        if (!nodeIdMap.has(id)) {
          const nodeId = `mermaid-${nodeIndex++}`;
          nodeIdMap.set(id, nodeId);

          let type: ArchitectureNode["type"] = "page";
          if (soloMatch[4]) type = "decision";
          else if (soloMatch[3]) type = "action";

          nodes.push({
            id: nodeId,
            type,
            label,
            metadata: {},
            tags: ["mermaid"],
            flowTypes: [],
          });
        }
      }
    }
  }

  return { nodes, edges };
}
