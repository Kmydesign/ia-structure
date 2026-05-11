import type {
  ParsedMarkdown,
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureGraph,
  NodeGroup,
  DirectoryTree,
} from "../types";
import {
  detectDocumentType,
  parseFlowOverview,
  parseFlowSteps,
  parseDecisionTable,
  parseErrorTable,
  parseSitemapTree,
} from "../parsers/flowParser";
import { computeGridLayout } from "./autoLayout";
import { parseMermaidGraph } from "./mermaidParser";
import { simpleHash, detectNodeType, detectFlowTypes, extractTags } from "../parsers/nodeDetector";

export function buildGraph(
  files: ParsedMarkdown[],
  tree: DirectoryTree | null
): ArchitectureGraph {
  const nodes: ArchitectureNode[] = [];
  const edges: ArchitectureEdge[] = [];
  const nodeMap = new Map<string, ArchitectureNode>();
  const edgeSet = new Set<string>();
  const pageNodesByRoute = new Map<string, ArchitectureNode>();

  // Phase A: Extract page nodes from sitemap files
  for (const file of files) {
    const docType = detectDocumentType(file);
    if (docType === "sitemap") {
      const pages = parseSitemapTree(file);
      for (const page of pages) {
        if (!pageNodesByRoute.has(page.route)) {
          const pageNode: ArchitectureNode = {
            id: page.id,
            type: "page",
            label: page.label,
            description: page.route,
            sourcePath: file.relativePath,
            metadata: {},
            tags: page.accessLevel ? [page.accessLevel.toLowerCase()] : [],
            flowTypes: ["navigation"],
            group: "pages",
          };
          nodes.push(pageNode);
          nodeMap.set(pageNode.id, pageNode);
          pageNodesByRoute.set(page.route, pageNode);
        }
      }
    }
  }

  // Phase B: Decompose flow files into step/decision/error/entry/exit nodes
  for (const file of files) {
    const docType = detectDocumentType(file);
    if (docType !== "flow") continue;

    const overview = parseFlowOverview(file);
    const steps = parseFlowSteps(file);
    const decisions = parseDecisionTable(file);
    const errors = parseErrorTable(file);

    const flowId = `flow-${simpleHash(file.relativePath)}`;

    // Create ENTRY node
    const entryNode: ArchitectureNode = {
      id: `${flowId}-entry`,
      type: "entry",
      label: overview.title || file.name,
      description: overview.entryPoints.join(", ") || undefined,
      sourcePath: file.relativePath,
      metadata: {},
      tags: [],
      flowTypes: ["user-journey"],
      group: inferGroup(file),
    };
    nodes.push(entryNode);
    nodeMap.set(entryNode.id, entryNode);

    // Connect entry to first page if entry point matches a route
    for (const ep of overview.entryPoints) {
      const pageNode = pageNodesByRoute.get(ep);
      if (pageNode) {
        addEdge(edges, edgeSet, entryNode.id, pageNode.id, undefined, "navigation");
      }
    }

    let lastNodeId = entryNode.id;

    // Create STEP nodes sequentially
    for (const step of steps) {
      const stepNode: ArchitectureNode = {
        id: step.id,
        type: "step",
        label: step.title,
        description: step.actions.slice(0, 2).join(". "),
        sourcePath: file.relativePath,
        metadata: {},
        tags: [],
        flowTypes: ["user-journey"],
        group: inferGroup(file),
        branchLabels: [],
      };
      nodes.push(stepNode);
      nodeMap.set(stepNode.id, stepNode);

      addEdge(edges, edgeSet, lastNodeId, stepNode.id, undefined, "sequential", undefined, "bottom", "top");
      lastNodeId = stepNode.id;

      // Connect step routes to page nodes
      for (const route of step.routes) {
        const pageNode = pageNodesByRoute.get(route);
        if (pageNode) {
          addEdge(edges, edgeSet, stepNode.id, pageNode.id, undefined, "navigation");
        } else {
          const implicitPage: ArchitectureNode = {
            id: `page-${simpleHash(route)}`,
            type: "screen",
            label: route.split("/").pop() || route,
            description: route,
            sourcePath: file.relativePath,
            metadata: {},
            tags: [],
            flowTypes: ["navigation"],
            group: "pages",
          };
          if (!nodeMap.has(implicitPage.id)) {
            nodes.push(implicitPage);
            nodeMap.set(implicitPage.id, implicitPage);
            pageNodesByRoute.set(route, implicitPage);
          }
          addEdge(edges, edgeSet, stepNode.id, implicitPage.id, undefined, "navigation");
        }
      }
    }

    // Create DECISION nodes branching from last step
    for (const decision of decisions) {
      const decisionNode: ArchitectureNode = {
        id: decision.id,
        type: "decision",
        label: decision.question,
        sourcePath: file.relativePath,
        metadata: {},
        tags: [],
        flowTypes: ["user-journey"],
        group: inferGroup(file),
        branchLabels: decision.options,
      };
      nodes.push(decisionNode);
      nodeMap.set(decisionNode.id, decisionNode);

      addEdge(edges, edgeSet, lastNodeId, decisionNode.id, undefined, "branch", undefined, "bottom", "top");
      lastNodeId = decisionNode.id;

      const BRANCH_HANDLE_IDS = ["bottom", "left", "right", "top-extra"];

      for (let i = 0; i < decision.options.length; i++) {
        const option = decision.options[i];
        const handleId = BRANCH_HANDLE_IDS[i] || "bottom";
        const targetRoute = decision.optionRoutes[option];
        if (targetRoute) {
          let targetNode = pageNodesByRoute.get(targetRoute);
          if (!targetNode) {
            targetNode = {
              id: `page-${simpleHash(targetRoute)}`,
              type: "screen",
              label: targetRoute.split("/").pop() || targetRoute,
              description: targetRoute,
              sourcePath: file.relativePath,
              metadata: {},
              tags: [],
              flowTypes: ["navigation"],
              group: "pages",
            };
            nodes.push(targetNode);
            nodeMap.set(targetNode.id, targetNode);
            pageNodesByRoute.set(targetRoute, targetNode);
          }
          addEdge(edges, edgeSet, decisionNode.id, targetNode.id, option, "branch", option, handleId, "top");
        } else {
          const optionNode: ArchitectureNode = {
            id: `${decision.id}-opt-${simpleHash(option)}`,
            type: "screen",
            label: option,
            sourcePath: file.relativePath,
            metadata: {},
            tags: [],
            flowTypes: ["user-journey"],
            group: inferGroup(file),
          };
          nodes.push(optionNode);
          nodeMap.set(optionNode.id, optionNode);
          addEdge(edges, edgeSet, decisionNode.id, optionNode.id, option, "branch", option, handleId, "top");
        }
      }
    }

    // Create ERROR nodes
    for (const error of errors) {
      const errorNode: ArchitectureNode = {
        id: error.id,
        type: "error",
        label: error.error,
        description: error.message || undefined,
        sourcePath: file.relativePath,
        metadata: {},
        tags: [],
        flowTypes: ["user-journey"],
        group: inferGroup(file),
      };
      nodes.push(errorNode);
      nodeMap.set(errorNode.id, errorNode);

      // Connect from the last step (errors can happen at any step, but we attach to the end)
      addEdge(edges, edgeSet, lastNodeId, errorNode.id, undefined, "branch", undefined, "bottom", "top");

      if (error.recoveryRoute) {
        let recoveryPage = pageNodesByRoute.get(error.recoveryRoute);
        if (!recoveryPage) {
          recoveryPage = {
            id: `page-${simpleHash(error.recoveryRoute)}`,
            type: "screen",
            label: error.recoveryRoute.split("/").pop() || error.recoveryRoute,
            description: error.recoveryRoute,
            sourcePath: file.relativePath,
            metadata: {},
            tags: [],
            flowTypes: ["navigation"],
            group: "pages",
          };
          nodes.push(recoveryPage);
          nodeMap.set(recoveryPage.id, recoveryPage);
          pageNodesByRoute.set(error.recoveryRoute, recoveryPage);
        }
        addEdge(edges, edgeSet, errorNode.id, recoveryPage.id, "Recover", "navigation");
      }
    }

    // Create EXIT node
    const exitNode: ArchitectureNode = {
      id: `${flowId}-exit`,
      type: "exit",
      label: overview.exitPoints.length > 0 ? overview.exitPoints.join(", ") : "End",
      sourcePath: file.relativePath,
      metadata: {},
      tags: [],
      flowTypes: ["user-journey"],
      group: inferGroup(file),
    };
    nodes.push(exitNode);
    nodeMap.set(exitNode.id, exitNode);
    addEdge(edges, edgeSet, lastNodeId, exitNode.id, undefined, "sequential", undefined, "bottom", "top");

    // Connect exit to page nodes
    for (const ep of overview.exitPoints) {
      const pageNode = pageNodesByRoute.get(ep);
      if (pageNode) {
        addEdge(edges, edgeSet, exitNode.id, pageNode.id, undefined, "navigation");
      }
    }
  }

  // Phase C: Handle mermaid blocks in any file
  for (const file of files) {
    for (const mermaidBlock of file.mermaidBlocks) {
      const mermaidResult = parseMermaidGraph(mermaidBlock);
      for (const mNode of mermaidResult.nodes) {
        if (!nodeMap.has(mNode.id)) {
          const mArchNode: ArchitectureNode = {
            ...mNode,
            metadata: {},
            tags: ["mermaid"],
            flowTypes: [],
            sourcePath: file.relativePath,
          };
          nodes.push(mArchNode);
          nodeMap.set(mNode.id, mArchNode);
        }
      }
      for (const mEdge of mermaidResult.edges) {
        if (nodeMap.has(mEdge.source) && nodeMap.has(mEdge.target)) {
          addEdge(edges, edgeSet, mEdge.source, mEdge.target, mEdge.label, mEdge.flowType);
        }
      }
    }
  }

  // Phase D: Non-flow, non-sitemap files get single-node treatment
  for (const file of files) {
    const docType = detectDocumentType(file);
    if (docType !== "unknown" && docType !== "supplementary") continue;

    const node = buildNodeFromFile(file);
    if (!nodeMap.has(node.id)) {
      nodes.push(node);
      nodeMap.set(node.id, node);
    }

    for (const link of file.links) {
      if (link.type !== "internal") continue;
      const targetId = `node-${simpleHash(link.target.replace(/^\.\//, ""))}`;
      if (nodeMap.has(targetId) && targetId !== node.id) {
        addEdge(edges, edgeSet, node.id, targetId, link.text || undefined, "navigation");
      }
    }
  }

  // Phase E: Apply initial grid positions
  const initialPositions = computeGridLayout(nodes.length, { x: 320, y: 200 });
  for (let i = 0; i < nodes.length; i++) {
    const pos = initialPositions.get(i);
    if (pos) {
      nodes[i].position = pos;
    }
  }

  const groups = buildGroups(nodes, tree);
  return { nodes, edges, groups };
}

function addEdge(
  edges: ArchitectureEdge[],
  edgeSet: Set<string>,
  source: string,
  target: string,
  label?: string,
  flowType: ArchitectureEdge["flowType"] = "navigation",
  conditionLabel?: string,
  sourceHandle?: string,
  targetHandle?: string
) {
  const key = `${source}->${target}${conditionLabel ? `:${conditionLabel}` : ""}`;
  if (edgeSet.has(key)) return;
  if (source === target) return;
  edgeSet.add(key);

  const conditional = flowType === "branch";

  edges.push({
    id: `edge-${simpleHash(key)}`,
    source,
    target,
    label,
    flowType,
    animated: flowType === "api-flow" || flowType === "data-flow",
    conditional,
    conditionLabel,
    sourceHandle,
    targetHandle,
  });
}

function buildNodeFromFile(file: ParsedMarkdown): ArchitectureNode {
  const id = `node-${simpleHash(file.relativePath)}`;
  const nodeType = detectNodeType(file.name, file.content, file.frontmatter, file.relativePath);
  const flowTypes = detectFlowTypes(file.content, file.frontmatter, file.links);
  const tags = extractTags(file.frontmatter, file.content);

  const title =
    (file.frontmatter.title as string) ||
    file.headings[0]?.text ||
    formatName(file.name);

  const description =
    (file.frontmatter.description as string) ||
    file.headings[1]?.text ||
    undefined;

  const group = inferGroup(file);

  return {
    id,
    type: nodeType,
    label: title,
    description,
    sourcePath: file.relativePath,
    metadata: file.frontmatter,
    tags,
    flowTypes,
    group,
  };
}

function inferGroup(file: ParsedMarkdown): string {
  if (file.frontmatter.group && typeof file.frontmatter.group === "string") {
    return file.frontmatter.group;
  }
  if (file.frontmatter.feature && typeof file.frontmatter.feature === "string") {
    return file.frontmatter.feature;
  }
  const parts = file.relativePath.split(/[\\/]/);
  if (parts.length > 2) {
    return parts.slice(0, -1).join("/");
  }
  if (parts.length === 2) {
    return parts[0];
  }
  return "root";
}

function buildGroups(
  nodes: ArchitectureNode[],
  _tree: DirectoryTree | null
): NodeGroup[] {
  const groupMap = new Map<string, Set<string>>();

  for (const node of nodes) {
    const group = node.group || "root";
    if (!groupMap.has(group)) {
      groupMap.set(group, new Set());
    }
    groupMap.get(group)!.add(node.id);
  }

  const groups: NodeGroup[] = [];
  for (const [label, nodeIds] of groupMap) {
    groups.push({
      id: `group-${simpleHash(label)}`,
      label: formatName(label.split(/[\\/]/).pop() || label),
      type: "folder",
      nodeIds: [...nodeIds],
      collapsed: false,
    });
  }

  return groups;
}

function formatName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}
