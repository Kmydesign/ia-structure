import type {
  ParsedMarkdown,
  DocType,
  FlowOverview,
  FlowStep,
  FlowDecision,
  FlowError,
  PageNode,
  ValidationReport,
  ValidationIssue,
} from "../types";

export function detectDocumentType(file: ParsedMarkdown): DocType {
  const content = file.content;
  const lower = content.toLowerCase();

  const hasStepHeadings = /^#{2,4}\s+Step\s+\d+/m.test(content);
  const hasFlowOverview = lower.includes("flow overview") || lower.includes("step-by-step");
  const hasDecisionSection = /^#{2,4}\s+decision\s+point/i.test(content);
  const hasActions = /^\*\*actions?:\*\*/im.test(content);

  if (hasStepHeadings || (hasFlowOverview && hasActions) || hasDecisionSection) {
    return "flow";
  }

  const hasSitemapTree = /^\s*[├└│┐└─┌┬]/m.test(content);
  const hasAccessLevels = /\[(?:PUB|AUTH|REN|LND|SYS|PUBLIC|PRIVATE|ADMIN|USER|GUEST)\]/i.test(content);
  const hasRouteTree = /^\s*[├└│]\s+.*\/[a-z]/m.test(content);

  if ((hasSitemapTree && hasRouteTree) || (hasAccessLevels && hasSitemapTree)) {
    return "sitemap";
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.includes("persona") || lowerName.includes("navigation") || lowerName.includes("content-hierarchy")) {
    return "supplementary";
  }

  if (hasFlowOverview || hasStepHeadings) {
    return "flow";
  }

  return "unknown";
}

export function parseFlowOverview(file: ParsedMarkdown): FlowOverview {
  const content = file.content;
  const title =
    content.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
    file.headings[0]?.text ||
    file.name;

  const entryPoints: string[] = [];
  const exitPoints: string[] = [];
  let estimatedTime: string | undefined;

  const entryMatch = content.match(/\*\*entry\s+points?\*\*:\s*(.+)/gi) ||
    content.match(/\*\*entry\s*:\*\*\s*(.+)/gi) ||
    content.match(/entry\s+point[s]?:\s*(.+)/gi);
  if (entryMatch) {
    for (const m of entryMatch) {
      const text = m.replace(/\*\*entry\s+points?\*\*:\s*/i, "").replace(/\*\*entry\s*:\*\*\s*/i, "").trim();
      const routes = extractRoutes(text);
      if (routes.length > 0) {
        entryPoints.push(...routes);
      } else {
        entryPoints.push(text.split(/[,;→>]/)[0].trim());
      }
    }
  }

  const exitMatch = content.match(/\*\*exit\s+points?\*\*:\s*(.+)/gi) ||
    content.match(/\*\*exit\s*:\*\*\s*(.+)/gi) ||
    content.match(/exit\s+point[s]?:\s*(.+)/gi);
  if (exitMatch) {
    for (const m of exitMatch) {
      const text = m.replace(/\*\*exit\s+points?\*\*:\s*/i, "").replace(/\*\*exit\s*:\*\*\s*/i, "").trim();
      const routes = extractRoutes(text);
      if (routes.length > 0) {
        exitPoints.push(...routes);
      } else {
        exitPoints.push(text.split(/[,;→>]/)[0].trim());
      }
    }
  }

  const timeMatch = content.match(/\*\*estimated\s+time\*\*:\s*(.+)/i) ||
    content.match(/estimated\s+time:\s*(.+)/i);
  if (timeMatch) {
    estimatedTime = timeMatch[1].trim();
  }

  return {
    title: title.replace(/^User\s+Flow\s+\d+:\s*/i, ""),
    entryPoints,
    exitPoints,
    estimatedTime,
  };
}

export function parseFlowSteps(file: ParsedMarkdown): FlowStep[] {
  const steps: FlowStep[] = [];
  const lines = file.content.split("\n");
  let currentStep: { number: number; title: string; startLine: number } | null = null;
  let inActions = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const stepMatch = trimmed.match(/^#{2,4}\s+Step\s+(\d+)[.:]\s*(.+)/i) ||
      trimmed.match(/^#{2,4}\s+(\d+)\.\s+(.+)/);

    if (stepMatch) {
      if (currentStep) {
        steps.push(buildStep(currentStep, lines, file.relativePath));
      }
      currentStep = {
        number: parseInt(stepMatch[1], 10),
        title: stepMatch[2].trim(),
        startLine: i,
      };
      inActions = false;
      continue;
    }

    if (currentStep && /^\*\*actions?:\*\*/i.test(trimmed)) {
      inActions = true;
      continue;
    }

    if (currentStep && trimmed.startsWith("##")) {
      steps.push(buildStep(currentStep, lines, file.relativePath));
      currentStep = null;
      inActions = false;
    }
  }

  if (currentStep) {
    steps.push(buildStep(currentStep, lines, file.relativePath));
  }

  return steps;
}

function buildStep(
  step: { number: number; title: string; startLine: number },
  lines: string[],
  parentFile: string
): FlowStep {
  const actions: string[] = [];
  const routes: string[] = [];
  let collectingActions = false;

  for (let i = step.startLine + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.match(/^#{2,4}\s+(?:Step\s+\d+|\d+\.)/)) break;
    if (line.startsWith("---") && i > step.startLine + 2) break;

    if (/^\*\*actions?:\*\*/i.test(line)) {
      collectingActions = true;
      continue;
    }

    if (/^\*\*(?:fields|why|privacy|note|storage|smart|validation)/i.test(line)) {
      collectingActions = false;
      continue;
    }

    if (collectingActions && (line.startsWith("- ") || line.startsWith("* ") || /^\d+\.\s/.test(line))) {
      const actionText = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
      actions.push(actionText);
      const foundRoutes = extractRoutes(actionText);
      routes.push(...foundRoutes);
    }

    if (collectingActions && line === "") {
      continue;
    }
  }

  return {
    id: `step-${step.number}-${hashString(parentFile + step.title)}`,
    number: step.number,
    title: step.title,
    actions,
    routes: [...new Set(routes)],
    parentFile,
  };
}

export function parseDecisionTable(file: ParsedMarkdown): FlowDecision[] {
  const decisions: FlowDecision[] = [];
  const content = file.content;
  const lines = content.split("\n");

  let inDecisionSection = false;
  let headerParsed = false;
  let decisionColIdx = -1;
  let optionsColIdx = -1;
  let defaultColIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^#{2,4}\s+decision/i.test(line)) {
      inDecisionSection = true;
      headerParsed = false;
      continue;
    }

    if (inDecisionSection && /^#{2,4}\s+/i.test(line) && !/^#{2,4}\s+decision/i.test(line)) {
      inDecisionSection = false;
      continue;
    }

    if (inDecisionSection && line.startsWith("|") && !headerParsed) {
      const headers = line.split("|").map((h) => h.trim().toLowerCase());
      decisionColIdx = headers.findIndex((h) => h.includes("decision") || h.includes("question") || h.includes("choice"));
      optionsColIdx = headers.findIndex((h) => h.includes("option") || h.includes("choice") || h.includes("answer") || h.includes("path"));
      defaultColIdx = headers.findIndex((h) => h.includes("default") || h.includes("preselect"));

      if (decisionColIdx !== -1) {
        headerParsed = true;
      }
      continue;
    }

    if (inDecisionSection && headerParsed && line.startsWith("|---") || line.startsWith("| ---")) {
      continue;
    }

    if (inDecisionSection && headerParsed && line.startsWith("|")) {
      const cols = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);

      if (cols.length >= 2 && decisionColIdx !== -1 && optionsColIdx !== -1) {
        const question = cols[decisionColIdx] || "";
        const optionsStr = cols[optionsColIdx] || "";
        const defaultVal = defaultColIdx !== -1 ? cols[defaultColIdx] : undefined;

        if (!question || question === "Decision") continue;

        const options = optionsStr
          .split(/\s*[/|]\s*/)
          .map((o) => o.trim().replace(/^["']|["']$/g, ""))
          .filter((o) => o.length > 0);

        const optionRoutes: Record<string, string> = {};
        const sectionBelow = lines.slice(i + 1, i + 20).join("\n");

        for (const option of options) {
          const routePattern = new RegExp(
            escapeRegex(option) + "\\s*(?:→|->|\\=>)\\s*(/[/a-z0-9_:-]+)",
            "i"
          );
          const routeMatch = sectionBelow.match(routePattern);
          if (routeMatch) {
            optionRoutes[option] = routeMatch[1];
          }
        }

        const redirectPattern = new RegExp(
          escapeRegex(question.replace(/\?$/, "")) + "[^\\n]*?(→|->|redirect)\\s*(/[/a-z0-9_:-]+)",
          "i"
        );
        const contentBelow = lines.slice(Math.max(0, i - 5), i + 20).join("\n");
        const roleBranchMatch = contentBelow.match(
          /(?:Renter|renter)\s*(?:→|->|=>)\s*(\/[/a-z0-9_:-]+)/g
        );
        if (roleBranchMatch) {
          for (const rm of roleBranchMatch) {
            const parts = rm.match(/(\w+)\s*(?:→|->|=>)\s*(\/[/a-z0-9_:-]+)/);
            if (parts) {
              optionRoutes[parts[1]] = parts[2];
            }
          }
        }

        decisions.push({
          id: `decision-${decisions.length}-${hashString(file.relativePath + question)}`,
          question: question.replace(/\*\*/g, ""),
          options: options.length > 0 ? options : ["Yes", "No"],
          defaultOption: defaultVal || undefined,
          optionRoutes,
          parentFile: file.relativePath,
        });
      }
    }
  }

  return decisions;
}

export function parseErrorTable(file: ParsedMarkdown): FlowError[] {
  const errors: FlowError[] = [];
  const content = file.content;
  const lines = content.split("\n");

  let inErrorSection = false;
  let headerParsed = false;
  let errorColIdx = -1;
  let messageColIdx = -1;
  let recoveryColIdx = -1;

  const sectionPatterns = /^#{2,4}\s+(?:error|error\s+state|error\s+handling|edge\s+case)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (sectionPatterns.test(line)) {
      inErrorSection = true;
      headerParsed = false;
      continue;
    }

    if (inErrorSection && /^#{2,4}\s+/i.test(line)) {
      inErrorSection = false;
      continue;
    }

    if (inErrorSection && line.startsWith("|") && !headerParsed) {
      const headers = line.split("|").map((h) => h.trim().toLowerCase());
      errorColIdx = headers.findIndex((h) => h.includes("error") || h.includes("case"));
      messageColIdx = headers.findIndex((h) => h.includes("message") || h.includes("description"));
      recoveryColIdx = headers.findIndex((h) => h.includes("recovery") || h.includes("behavior") || h.includes("resolution"));

      if (errorColIdx !== -1) {
        headerParsed = true;
      }
      continue;
    }

    if (inErrorSection && headerParsed && (line.startsWith("|---") || line.startsWith("| ---"))) {
      continue;
    }

    if (inErrorSection && headerParsed && line.startsWith("|")) {
      const cols = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);

      if (cols.length >= 2 && errorColIdx !== -1) {
        const errorText = cols[errorColIdx] || "";
        if (!errorText || errorText.toLowerCase() === "error" || errorText.toLowerCase() === "case") continue;

        const message = messageColIdx !== -1 && cols[messageColIdx] ? cols[messageColIdx] : "";
        const recovery = recoveryColIdx !== -1 && cols[recoveryColIdx] ? cols[recoveryColIdx] : "";

        const recoveryRoutes = extractRoutes(recovery);

        errors.push({
          id: `error-${errors.length}-${hashString(file.relativePath + errorText)}`,
          error: errorText.replace(/\*\*/g, ""),
          message: message.replace(/\*\*/g, "").replace(/^["']|["']$/g, ""),
          recoveryRoute: recoveryRoutes[0] || undefined,
          parentFile: file.relativePath,
        });
      }
    }
  }

  return errors;
}

export function parseSitemapTree(file: ParsedMarkdown): PageNode[] {
  const pages: PageNode[] = [];
  const lines = file.content.split("\n");
  const seenRoutes = new Set<string>();

  const treeLinePattern = /^\s*([├└│┐└─┌┬\s]+)\s*(?:\[([A-Z]+)\]\s+)?(\/[/a-z0-9_:-]+(?:\?[a-z=&_-]+)?)\s*(?:\.{2,}\s*)?(.*)?$/;

  for (const line of lines) {
    const match = line.match(treeLinePattern);
    if (match) {
      const accessLevel = match[2] || undefined;
      const route = match[3];
      const description = match[4]?.trim() || "";
      const cleanRoute = route.split("?")[0].replace(/\/:[\w-]+/g, "");

      if (seenRoutes.has(cleanRoute)) continue;
      seenRoutes.add(cleanRoute);

      pages.push({
        id: `page-${hashString(cleanRoute)}`,
        route: cleanRoute,
        label: description || cleanRoute.split("/").pop() || cleanRoute,
        accessLevel,
        children: [],
      });
    }
  }

  const rolePattern = /\[(PUB|AUTH|REN|LND|SYS|PUBLIC|PRIVATE|ADMIN|USER|GUEST)\]\s+(\/[/a-z0-9_:-]+)/gi;
  let roleMatch;
  while ((roleMatch = rolePattern.exec(file.content)) !== null) {
    const route = roleMatch[2].split("?")[0].replace(/\/:[\w-]+/g, "");
    if (!seenRoutes.has(route)) {
      seenRoutes.add(route);
      pages.push({
        id: `page-${hashString(route)}`,
        route,
        label: route.split("/").pop() || route,
        accessLevel: roleMatch[1],
        children: [],
      });
    }
  }

  return pages;
}

export function parseRedirects(text: string): { from: string; to: string; label?: string }[] {
  const redirects: { from: string; to: string; label?: string }[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const match = line.match(/(→|->|=>|redirect(?:s)?\s+to)\s*(\/[/a-z0-9_:-]+)/gi);
    if (match) {
      for (const m of match) {
        const route = m.replace(/^(?:→|->|=>|redirect(?:s)?\s+to)\s*/i, "").trim();
        redirects.push({
          from: "",
          to: route,
          label: undefined,
        });
      }
    }
  }

  return redirects;
}

export function parseRoleBranches(text: string): Record<string, string> {
  const branches: Record<string, string> = {};

  const patterns = [
    /(\w[\w\s]*?)\s*(?:→|->|=>)\s*(\/[/a-z0-9_:-]+)/g,
    /(\w[\w\s]*?)\s*:\s*(\/[/a-z0-9_:-]+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const label = match[1].trim();
      const route = match[2].trim();
      if (label.length > 0 && label.length < 40 && route.startsWith("/")) {
        branches[label] = route;
      }
    }
  }

  return branches;
}

export function validateDocument(file: ParsedMarkdown): ValidationReport {
  const docType = detectDocumentType(file);
  const issues: ValidationIssue[] = [];

  if (docType === "flow") {
    const overview = parseFlowOverview(file);
    const steps = parseFlowSteps(file);
    const decisions = parseDecisionTable(file);
    const errors = parseErrorTable(file);

    if (overview.entryPoints.length === 0) {
      issues.push({
        severity: "warning",
        message: "No entry points detected. Add **Entry point**: to your Flow Overview.",
        suggestion: 'Add a line like: **Entry point**: /your-start-page',
      });
    }

    if (overview.exitPoints.length === 0) {
      issues.push({
        severity: "warning",
        message: "No exit points detected. Add **Exit point**: to your Flow Overview.",
        suggestion: 'Add a line like: **Exit point**: /your-end-page',
      });
    }

    if (steps.length === 0) {
      issues.push({
        severity: "error",
        message: "No steps detected. Use ### Step N: Title headings.",
        suggestion: "Add steps like: ### Step 1: User fills form",
      });
    }

    if (decisions.length === 0) {
      issues.push({
        severity: "info",
        message: "No decision points found. Flow will be linear.",
        suggestion: "Add a Decision Points table with | Decision | Options | Default | columns.",
      });
    }

    for (const step of steps) {
      if (step.actions.length === 0) {
        issues.push({
          severity: "info",
          message: `Step ${step.number} "${step.title}" has no actions listed.`,
        });
      }
    }

    for (const step of steps) {
      for (const action of step.actions) {
        const routes = extractRoutes(action);
        for (const route of routes) {
          issues.push({
            severity: "info",
            message: `Step ${step.number} references route ${route}.`,
          });
        }
      }
    }
  } else if (docType === "sitemap") {
    const pages = parseSitemapTree(file);
    if (pages.length === 0) {
      issues.push({
        severity: "warning",
        message: "Sitemap detected but no pages could be extracted from the tree.",
      });
    }
  } else {
    issues.push({
      severity: "info",
      message: "Unrecognized document format. File will be rendered as a single node.",
      suggestion: "Add ### Step N: headings or a Decision Points table to create a flow diagram.",
    });
  }

  return { file: file.relativePath, docType, issues };
}

function extractRoutes(text: string): string[] {
  const routes: string[] = [];
  const seen = new Set<string>();

  const patterns = [
    /(?:→|->|=>|redirect(?:s)?\s+to|navigate\s+to)\s*(\/[/a-z0-9_:-]+)/gi,
    /(\/[a-z][a-z0-9_-]*(?:\/[:a-z][a-z0-9_-]*)*)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const route = match[1].replace(/[.,;:!?)\]}>]+$/, "").split("?")[0];
      if (route.length > 1 && !seen.has(route) && !route.startsWith("//")) {
        seen.add(route);
        routes.push(route);
      }
    }
  }

  return routes;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
