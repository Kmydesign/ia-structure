import type { ArchitectureNode, ArchitectureEdge, ArchitectureGraph, NodeType, FlowType } from "../types";

const AUTH_KEYWORDS = [
  "auth", "login", "signin", "sign-in", "signup", "sign-up", "register",
  "password", "oauth", "token", "jwt", "session", "logout", "signout",
  "sign-out", "authentication", "authorization", "2fa", "mfa", "sso",
  "saml", "ldap", "credential", "verify", "verification",
];

const API_KEYWORDS = [
  "api", "endpoint", "rest", "graphql", "mutation", "query",
  "webhook", "request", "response", "http", "fetch", "axios",
  "grpc", "rpc", "soap", "microservice",
];

const DATABASE_KEYWORDS = [
  "database", "db", "schema", "table", "model", "migration",
  "query", "crud", "repository", "cache", "redis", "postgres",
  "mongodb", "mysql", "sqlite", "sql", "nosql", "orm", "prisma",
];

const ACTION_KEYWORDS = [
  "action", "handler", "controller", "service", "usecase",
  "command", "event", "listener", "subscriber", "trigger",
  "cron", "job", "queue", "worker", "processor", "submit",
  "create", "update", "delete", "process",
];

const DECISION_KEYWORDS = [
  "decision", "condition", "branch", "if", "switch", "case",
  "gateway", "router", "middleware", "guard", "check", "validate",
  "permission", "role", "access", "rule", "policy",
];

const ERROR_KEYWORDS = [
  "error", "exception", "failure", "fallback", "retry",
  "timeout", "404", "500", "400", "403", "401", "crash",
  "bug", "issue", "problem", " handleError", "catch",
];

const STATE_KEYWORDS = [
  "state", "status", "phase", "stage", "step", "workflow",
  "pipeline", "transition", "lifecycle", "draft", "published",
  "pending", "active", "inactive", "archived", "complete",
];

export function detectNodeType(
  name: string,
  content: string,
  frontmatter: Record<string, unknown>,
  path: string
): NodeType {
  if (frontmatter.type && typeof frontmatter.type === "string") {
    const t = frontmatter.type.toLowerCase();
    if (isValidNodeType(t)) return t as NodeType;
  }

  const lower = name.toLowerCase();
  const contentLower = content.toLowerCase();
  const pathLower = path.toLowerCase();

  const hasSteps = /^#{2,4}\s+Step\s+\d+/m.test(content);
  const hasFlowDiagram = contentLower.includes("flow overview") || contentLower.includes("step-by-step");
  const hasSitemapTree = /^\s*[├└│┐└─┌┬]/m.test(content);
  const hasDecisionPoints = contentLower.includes("decision point") || /^#{2,4}\s+decision/i.test(content);

  if (hasSteps && hasDecisionPoints) return "decision";
  if (hasSteps || hasFlowDiagram) return "step";
  if (hasSitemapTree) return "page";

  const score: Record<NodeType, number> = {
    page: 0, component: 0, api: 0, database: 0, auth: 0,
    action: 0, decision: 0, error: 0, group: 0, external: 0, state: 0,
    entry: 0, exit: 0, step: 0, screen: 0, system: 0,
  };

  if (pathLower.includes("/pages/") || pathLower.includes("/views/") || pathLower.includes("/routes/")) {
    score.page += 5;
  }
  if (pathLower.includes("/components/") || pathLower.includes("/ui/")) {
    score.component += 5;
  }
  if (pathLower.includes("/api/") || pathLower.includes("/endpoints/")) {
    score.api += 5;
  }

  if (lower.includes("page") || lower.includes("view") || lower.includes("screen")) score.page += 3;
  if (lower.includes("component") || lower.includes("widget") || lower.includes("module")) score.component += 3;
  if (lower.endsWith("api") || lower.endsWith("service")) score.api += 3;

  score.auth += countKeywordMatches(lower + " " + contentLower.slice(0, 500), AUTH_KEYWORDS) * 2;
  score.api += countKeywordMatches(lower + " " + contentLower.slice(0, 500), API_KEYWORDS) * 2;
  score.database += countKeywordMatches(lower + " " + contentLower.slice(0, 500), DATABASE_KEYWORDS) * 2;
  score.action += countKeywordMatches(lower + " " + contentLower.slice(0, 500), ACTION_KEYWORDS) * 2;
  score.decision += countKeywordMatches(lower + " " + contentLower.slice(0, 500), DECISION_KEYWORDS) * 2;
  score.error += countKeywordMatches(lower + " " + contentLower.slice(0, 500), ERROR_KEYWORDS) * 2;
  score.state += countKeywordMatches(lower + " " + contentLower.slice(0, 500), STATE_KEYWORDS) * 2;

  if (frontmatter.auth || frontmatter.authentication) score.auth += 10;
  if (frontmatter.api || frontmatter.endpoint) score.api += 10;
  if (frontmatter.database || frontmatter.db || frontmatter.model) score.database += 10;

  if (contentLower.includes("```mermaid") || contentLower.includes("flowchart") || contentLower.includes("graph")) {
    score.decision += 2;
  }

  if (score.page === 0 && score.component === 0 && score.api === 0 &&
      score.database === 0 && score.auth === 0 && score.action === 0 &&
      score.decision === 0 && score.error === 0 && score.state === 0) {
    score.page += 1;
  }

  let bestType: NodeType = "page";
  let bestScore = -1;

  for (const [type, s] of Object.entries(score)) {
    if (s > bestScore) {
      bestScore = s;
      bestType = type as NodeType;
    }
  }

  return bestType;
}

function countKeywordMatches(text: string, keywords: string[]): number {
  let count = 0;
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidNodeType(t: string): boolean {
  return ["page", "component", "api", "database", "auth", "action", "decision", "error", "group", "external", "state", "entry", "exit", "step", "screen", "system"].includes(t);
}

export function detectFlowTypes(
  content: string,
  frontmatter: Record<string, unknown>,
  links: { target: string; type: string }[]
): FlowType[] {
  const types: FlowType[] = [];
  const lower = content.toLowerCase();

  if (frontmatter.flow && typeof frontmatter.flow === "string") {
    types.push(frontmatter.flow as FlowType);
  }
  if (Array.isArray(frontmatter.flows)) {
    types.push(...(frontmatter.flows as FlowType[]));
  }

  const hasNavLinks = links.some(
    (l) => l.type === "internal" && (l.target.startsWith("/") || l.target.startsWith("./"))
  );
  if (hasNavLinks || lower.includes("navigate") || lower.includes("redirect") || lower.includes("route")) {
    types.push("navigation");
  }

  if (lower.includes("user journey") || lower.includes("user flow") || lower.includes("user story") ||
      lower.includes("user scenario") || lower.includes("persona")) {
    types.push("user-journey");
  }

  if (lower.includes("api") || lower.includes("endpoint") || lower.includes("request") ||
      lower.includes("response") || lower.includes("rest") || lower.includes("graphql")) {
    types.push("api-flow");
  }

  if (AUTH_KEYWORDS.some((k) => lower.includes(k)) && (lower.includes("flow") || lower.includes("process") || lower.includes("step"))) {
    types.push("auth-flow");
  }

  if (lower.includes("data flow") || lower.includes("pipeline") || lower.includes("etl") ||
      lower.includes("stream") || lower.includes("processing")) {
    types.push("data-flow");
  }

  if (lower.includes("depend") || lower.includes("import") || lower.includes("require") ||
      lower.includes("uses") || lower.includes("consumes")) {
    types.push("dependency");
  }

  if (lower.includes("state machine") || lower.includes("state diagram") || lower.includes("transition")) {
    types.push("state-machine");
  }

  const unique = [...new Set(types)];
  return unique.length > 0 ? unique : ["navigation"];
}

export function extractTags(
  frontmatter: Record<string, unknown>,
  content: string
): string[] {
  const tags: string[] = [];

  if (Array.isArray(frontmatter.tags)) {
    tags.push(...frontmatter.tags.map(String));
  }
  if (typeof frontmatter.tag === "string") {
    tags.push(frontmatter.tag);
  }
  if (Array.isArray(frontmatter.categories)) {
    tags.push(...frontmatter.categories.map(String));
  }

  const hashTags = content.match(/(?:^|\s)#([a-zA-Z][\w-]*)/g);
  if (hashTags) {
    tags.push(...hashTags.map((t) => t.trim().slice(1)));
  }

  return [...new Set(tags)];
}

export function generateNodeId(filePath: string, prefix: string = ""): string {
  const hash = simpleHash(filePath);
  return prefix ? `${prefix}-${hash}` : `node-${hash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export { simpleHash };
