import type { Node, Edge } from "reactflow";

export type NodeType =
  | "page"
  | "component"
  | "api"
  | "database"
  | "auth"
  | "action"
  | "decision"
  | "error"
  | "group"
  | "external"
  | "state"
  | "entry"
  | "exit"
  | "step"
  | "screen"
  | "system";

export type FlowType =
  | "navigation"
  | "user-journey"
  | "api-flow"
  | "auth-flow"
  | "data-flow"
  | "dependency"
  | "state-machine"
  | "feature"
  | "sequential"
  | "branch";

export type ViewMode =
  | "architecture"
  | "sitemap"
  | "user-flow"
  | "dependency"
  | "heatmap"
  | "timeline";

export type DocType = "flow" | "sitemap" | "supplementary" | "unknown";

export interface Frontmatter {
  [key: string]: string | number | boolean | string[];
}

export interface FlowOverview {
  title: string;
  entryPoints: string[];
  exitPoints: string[];
  estimatedTime?: string;
}

export interface FlowStep {
  id: string;
  number: number;
  title: string;
  actions: string[];
  routes: string[];
  parentFile: string;
}

export interface FlowDecision {
  id: string;
  question: string;
  options: string[];
  defaultOption?: string;
  optionRoutes: Record<string, string>;
  parentFile: string;
}

export interface FlowError {
  id: string;
  error: string;
  message: string;
  recoveryRoute?: string;
  parentFile: string;
}

export interface PageNode {
  id: string;
  route: string;
  label: string;
  accessLevel?: string;
  parentRoute?: string;
  children: PageNode[];
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

export interface ValidationReport {
  file: string;
  docType: DocType;
  issues: ValidationIssue[];
}

export interface ParsedMarkdown {
  path: string;
  relativePath: string;
  name: string;
  content: string;
  frontmatter: Frontmatter;
  headings: Heading[];
  links: Link[];
  mermaidBlocks: string[];
  codeBlocks: CodeBlock[];
  tasks: Task[];
  conditions: Condition[];
  routes: Route[];
  steps: string[];
  crossFileRefs: string[];
  accessRoles: string[];
  depth: number;
  parentDir: string;
}

export interface Heading {
  level: number;
  text: string;
  id?: string;
  children: Heading[];
}

export interface Link {
  target: string;
  text: string;
  type: "internal" | "external" | "image" | "anchor";
  lineNumber?: number;
}

export interface CodeBlock {
  language: string;
  content: string;
}

export interface Task {
  text: string;
  checked: boolean;
  indent: number;
}

export interface Condition {
  text: string;
  type: "if" | "switch" | "ternary" | "conditional-link";
  branches: string[];
}

export interface Route {
  path: string;
  method?: string;
  description?: string;
  params?: string[];
}

export interface ArchitectureNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  sourcePath?: string;
  lineNumber?: number;
  metadata: Frontmatter;
  tags: string[];
  flowTypes: FlowType[];
  group?: string;
  children?: string[];
  position?: { x: number; y: number };
  branchLabels?: string[];
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
  flowType: FlowType;
  animated?: boolean;
  conditional?: boolean;
  conditionLabel?: string;
}

export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  groups: NodeGroup[];
}

export interface NodeGroup {
  id: string;
  label: string;
  type: "folder" | "feature" | "flow" | "system";
  nodeIds: string[];
  color?: string;
  collapsed?: boolean;
}

export interface ProjectState {
  rootPath: string | null;
  name: string;
  files: ParsedMarkdown[];
  directoryTree: DirectoryTree | null;
  graph: ArchitectureGraph;
  lastScanned: number | null;
  isScanning: boolean;
  validationReports: ValidationReport[];
}

export interface DirectoryTree {
  name: string;
  path: string;
  relativePath: string;
  children: DirectoryTree[];
  files: FileInfo[];
  depth: number;
}

export interface FileInfo {
  path: string;
  relativePath: string;
  name: string;
  depth: number;
  parentDir: string;
}

export interface CanvasState {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge[];
  selectedNodes: string[];
  selectedEdges: string[];
  viewport: { x: number; y: number; zoom: number };
  viewMode: ViewMode;
  layoutDirection: "TB" | "LR" | "RL" | "BT";
  showMinimap: boolean;
  snapToGrid: boolean;
  gridSize: number;
  autoLayout: boolean;
  focusedFlowId: string | null;
}

export interface ArchitectureNodeData {
  nodeType: NodeType;
  label: string;
  description?: string;
  sourcePath?: string;
  lineNumber?: number;
  tags: string[];
  flowTypes: FlowType[];
  group?: string;
  connections: number;
  expanded: boolean;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  metadata: Frontmatter;
  childCount?: number;
  branchLabels?: string[];
  stepNumber?: number;
}

export interface FilterState {
  searchQuery: string;
  activeNodeTypes: NodeType[];
  activeFlowTypes: FlowType[];
  activeTags: string[];
  activeGroups: string[];
  showOrphaned: boolean;
  showHidden: boolean;
}

export interface SearchMatch {
  nodeId: string;
  label: string;
  type: NodeType;
  matchField: "label" | "description" | "tag" | "path";
  matchText: string;
}

export interface AppPreferences {
  theme: "dark" | "light";
  defaultViewMode: ViewMode;
  layoutDirection: "TB" | "LR";
  animationSpeed: number;
  nodeSize: "compact" | "default" | "large";
  showGrid: boolean;
  minimapPosition: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  autoScanOnOpen: boolean;
}

export const NODE_COLORS: Record<NodeType, string> = {
  page: "#3b82f6",
  component: "#8b5cf6",
  api: "#f59e0b",
  database: "#10b981",
  auth: "#ef4444",
  action: "#06b6d4",
  decision: "#f97316",
  error: "#dc2626",
  group: "#6366f1",
  external: "#a1a1aa",
  state: "#ec4899",
  entry: "#22c55e",
  exit: "#64748b",
  step: "#3b82f6",
  screen: "#8b5cf6",
  system: "#94a3b8",
};

export const NODE_ICONS: Record<NodeType, string> = {
  page: "\u{1F4C4}",
  component: "\u{1F9E9}",
  api: "\u26A1",
  database: "\u{1F5C4}\uFE0F",
  auth: "\u{1F512}",
  action: "\u25B6\uFE0F",
  decision: "\u25C7",
  error: "\u26A0\uFE0F",
  group: "\u{1F4E6}",
  external: "\u{1F310}",
  state: "\u{1F504}",
  entry: "\u25B6",
  exit: "\u25A0",
  step: "\u{1F4DD}",
  screen: "\u{1F5A5}\uFE0F",
  system: "\u2699\uFE0F",
};

export const NODE_LABELS: Record<NodeType, string> = {
  page: "Page",
  component: "Component",
  api: "API",
  database: "Database",
  auth: "Auth",
  action: "Action",
  decision: "Decision",
  error: "Error",
  group: "Group",
  external: "External",
  state: "State",
  entry: "Entry",
  exit: "Exit",
  step: "Step",
  screen: "Screen",
  system: "System",
};

export const FLOW_COLORS: Record<FlowType, string> = {
  navigation: "#3b82f6",
  "user-journey": "#8b5cf6",
  "api-flow": "#f59e0b",
  "auth-flow": "#ef4444",
  "data-flow": "#10b981",
  dependency: "#06b6d4",
  "state-machine": "#ec4899",
  feature: "#f97316",
  sequential: "#3b82f6",
  branch: "#f97316",
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: "dark",
  defaultViewMode: "architecture",
  layoutDirection: "TB",
  animationSpeed: 300,
  nodeSize: "default",
  showGrid: true,
  minimapPosition: "bottom-right",
  autoScanOnOpen: true,
};
