import type {
  ParsedMarkdown,
  Frontmatter,
  Heading,
  Link,
  CodeBlock,
  Task,
  Condition,
  Route,
} from "../types";

export function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  const frontmatter: Frontmatter = {};
  let body = content;

  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (fmMatch) {
    body = content.slice(fmMatch[0].length);
    const fmText = fmMatch[1];

    for (const line of fmText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (value.startsWith("[") && value.endsWith("]")) {
        const items = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
        frontmatter[key] = items;
      } else if (value === "true") {
        frontmatter[key] = true;
      } else if (value === "false") {
        frontmatter[key] = false;
      } else if (/^\d+$/.test(value)) {
        frontmatter[key] = parseInt(value, 10);
      } else {
        frontmatter[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  return { frontmatter, body };
}

export function parseHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  const lines = body.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      headings.push({ level, text, id, children: [] });
    }
  }

  return buildHeadingTree(headings);
}

function buildHeadingTree(flat: Heading[]): Heading[] {
  const root: Heading[] = [];
  const stack: Heading[] = [];

  for (const heading of flat) {
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(heading);
    } else {
      stack[stack.length - 1].children.push(heading);
    }

    stack.push(heading);
  }

  return root;
}

export function parseLinks(body: string): Link[] {
  const links: Link[] = [];
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(body)) !== null) {
    const text = match[1];
    const target = match[2];

    let type: Link["type"] = "internal";
    if (target.startsWith("http://") || target.startsWith("https://")) {
      type = "external";
    } else if (
      target.startsWith("/") ||
      target.startsWith("./") ||
      target.startsWith("../")
    ) {
      type = "internal";
    } else if (target.startsWith("#")) {
      type = "anchor";
    } else if (
      target.endsWith(".png") ||
      target.endsWith(".jpg") ||
      target.endsWith(".svg") ||
      target.endsWith(".gif")
    ) {
      type = "image";
    }

    links.push({ target, text, type });
  }

  return links;
}

export function parseMermaidBlocks(body: string): string[] {
  const blocks: string[] = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(body)) !== null) {
    blocks.push(match[1].trim());
  }

  return blocks;
}

export function parseCodeBlocks(body: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w*)\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(body)) !== null) {
    blocks.push({
      language: match[1] || "text",
      content: match[2].trim(),
    });
  }

  return blocks;
}

export function parseTasks(body: string): Task[] {
  const tasks: Task[] = [];
  const lines = body.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\s*)- \[([ xX])\]\s+(.+)$/);
    if (match) {
      tasks.push({
        text: match[3].trim(),
        checked: match[2] !== " ",
        indent: match[1].length,
      });
    }
  }

  return tasks;
}

export function parseConditions(body: string): Condition[] {
  const conditions: Condition[] = [];
  const lines = body.split("\n");

  const ifPatterns = [
    /\bif\s+(.+?)(?:\s*:|\s*→|\s*->|\s*then)/i,
    /\bwhen\s+(.+?)(?:\s*:|\s*→|\s*->)/i,
    /\bunless\s+(.+?)(?:\s*:|\s*→|\s*->)/i,
    /\bcondition(?:s)?:\s*(.+)/i,
    /\brule(?:s)?:\s*(.+)/i,
    /\bbranch(?:es)?:\s*(.+)/i,
    /\*\*If\b[^*]*\*\*[:\s]+(.+)/i,
  ];

  for (const line of lines) {
    for (const pattern of ifPatterns) {
      const match = line.match(pattern);
      if (match) {
        const text = match[1]?.trim() || line.trim();
        const branches = extractBranches(line, body);
        conditions.push({
          text,
          type: "if",
          branches,
        });
        break;
      }
    }

    const switchMatch = line.match(
      /\b(?:switch|case|scenario|path)\s*[:]\s*(.+)/i
    );
    if (switchMatch) {
      const branches = extractSwitchBranches(body, lines.indexOf(line));
      conditions.push({
        text: switchMatch[1].trim(),
        type: "switch",
        branches,
      });
    }
  }

  return conditions;
}

function extractBranches(line: string, _body: string): string[] {
  const branches: string[] = [];

  const elseMatch = line.match(
    /\b(?:else|otherwise|or|alternative)\s*[:→>]+\s*(.+)/i
  );
  if (elseMatch) {
    branches.push("else: " + elseMatch[1].trim());
  }

  const orParts = line.split(/\s+\bor\s+/i);
  if (orParts.length > 1) {
    branches.push(...orParts.slice(1).map((s) => s.trim()));
  }

  return branches.length > 0 ? branches : ["yes", "no"];
}

function extractSwitchBranches(body: string, startLine: number): string[] {
  const branches: string[] = [];
  const lines = body.split("\n");

  for (let i = startLine + 1; i < Math.min(startLine + 20, lines.length); i++) {
    const line = lines[i].trim();
    if (!line || line.match(/^#{1,6}\s/)) break;

    const caseMatch = line.match(
      /[-*]\s+(?:case\s+)?(.+?)(?:\s*:|\s*→|\s*->|$)/i
    );
    if (caseMatch) {
      branches.push(caseMatch[1].trim());
    }
  }

  return branches;
}

export function parseRoutes(body: string): Route[] {
  const routes: Route[] = [];
  const seen = new Set<string>();

  const directPatterns = [
    /`[^`]*`/g,
  ];

  const pathPatterns = [
    /(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s,`"')\]]+)/gi,
    /(?:route|path|endpoint|url|page|redirect)(?:s)?[:\s]+(\/[^\s,`"')\]]+)/gi,
    /→\s*(\/[^\s,`"')\]]+)/g,
    /\b(?:to|redirect[s]?\s+(?:to\s+)?)\s*(\/[^\s,`"')\]]+)/gi,
  ];

  const genericPathRegex = /(?<![a-zA-Z0-9_/-])\/[a-z][a-z0-9_-]*(?:\/[:a-z][a-z0-9_-]*)*(?:\?[a-z=&_-]+)?/gi;

  for (const pattern of pathPatterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const clean = match[1].trim();
      if (clean.length > 1 && !seen.has(clean) && !isInCodeBlock(body, match.index)) {
        seen.add(clean);
        routes.push({ path: clean });
      }
    }
  }

  let gMatch;
  while ((gMatch = genericPathRegex.exec(body)) !== null) {
    const raw = gMatch[0];
    const clean = raw.replace(/[.,;:!?)\]}>]+$/, "");
    if (clean.length > 1 && !seen.has(clean) && !isInCodeBlock(body, gMatch.index)) {
      seen.add(clean);
      routes.push({ path: clean });
    }
  }

  const rolePatterns = [
    /\[(PUB|AUTH|REN|LND|SYS)\]\s+(\/[^\s,]+)/g,
  ];
  for (const pattern of rolePatterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const clean = match[2].trim();
      if (clean.length > 1 && !seen.has(clean)) {
        seen.add(clean);
        routes.push({ path: clean, description: `Access: ${match[1]}` });
      }
    }
  }

  const queryRoutes = /\/[a-z_-]+(?:\/[:a-z_-]+)*\?[a-z_-]+=[a-z_-]+(?:&[a-z_-]+=[a-z_:-]+)*/gi;
  while ((gMatch = queryRoutes.exec(body)) !== null) {
    const clean = gMatch[0].replace(/[.,;:!?)\]}>]+$/, "");
    if (clean.length > 1 && !seen.has(clean) && !isInCodeBlock(body, gMatch.index)) {
      seen.add(clean);
      routes.push({ path: clean });
    }
  }

  return routes;
}

function isInCodeBlock(body: string, index: number): boolean {
  const before = body.slice(0, index);
  const ticks = (before.match(/```/g) || []).length;
  return ticks % 2 === 1;
}

export function parseSteps(body: string): string[] {
  const steps: string[] = [];
  const lines = body.split("\n");

  for (const line of lines) {
    const stepMatch = line.match(
      /^#{2,4}\s+Step\s+(\d+)[.:]\s*(.+)/i
    );
    if (stepMatch) {
      steps.push(stepMatch[2].trim());
    }

    const altStepMatch = line.match(
      /^#{2,4}\s+(?:Step\s+)?(\d+)\.\s+(.+)/
    );
    if (altStepMatch && !stepMatch) {
      steps.push(altStepMatch[2].trim());
    }
  }

  return steps;
}

export function parseCrossFileRefs(body: string, currentPath: string): string[] {
  const refs: string[] = [];

  const patterns = [
    /(?:see|refer[s]?\s+to|view|check|follow)\s+(?:flow\s+)?(\d{2}-[a-z0-9-]+\.md)/gi,
    /(\d{2}-[a-z0-9-]+\.md)/gi,
    /([a-z][a-z0-9_-]+\.md)/gi,
  ];

  const seen = new Set<string>();
  const currentName = currentPath.split(/[\\/]/).pop() || "";

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const ref = match[1];
      if (ref !== currentName && !seen.has(ref)) {
        seen.add(ref);
        refs.push(ref);
      }
    }
  }

  return refs;
}

export function parseAccessRoles(body: string): string[] {
  const roles = new Set<string>();
  const patterns = [
    /\[PUB\]/g,
    /\[AUTH\]/g,
    /\[REN\]/g,
    /\[LND\]/g,
    /\[SYS\]/g,
  ];

  const roleMap: Record<string, string> = {
    PUB: "public",
    AUTH: "authenticated",
    REN: "renter",
    LND: "landlord",
    SYS: "system",
  };

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const code = match[0].slice(1, -1);
      if (roleMap[code]) roles.add(roleMap[code]);
    }
  }

  return [...roles];
}

export function parseMarkdownFile(raw: {
  path: string;
  relative_path: string;
  name: string;
  content: string;
  depth: number;
  parent_dir: string;
  metadata?: Record<string, unknown>;
}): ParsedMarkdown {
  const { frontmatter, body } = parseFrontmatter(raw.content);

  return {
    path: raw.path,
    relativePath: raw.relative_path,
    name: raw.name,
    content: raw.content,
    frontmatter: {
      ...frontmatter,
      ...(raw.metadata as Record<string, string | number | boolean | string[]>),
    },
    headings: parseHeadings(body),
    links: parseLinks(body),
    mermaidBlocks: parseMermaidBlocks(body),
    codeBlocks: parseCodeBlocks(body),
    tasks: parseTasks(body),
    conditions: parseConditions(body),
    routes: parseRoutes(body),
    steps: parseSteps(body),
    crossFileRefs: parseCrossFileRefs(body, raw.path),
    accessRoles: parseAccessRoles(body),
    depth: raw.depth,
    parentDir: raw.parent_dir,
  };
}

export function parseMarkdownContent(
  content: string,
  path: string = "",
  name: string = ""
): ParsedMarkdown {
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    path,
    relativePath: path,
    name: name || path.split("/").pop()?.replace(/\.md$/, "") || "",
    content,
    frontmatter,
    headings: parseHeadings(body),
    links: parseLinks(body),
    mermaidBlocks: parseMermaidBlocks(body),
    codeBlocks: parseCodeBlocks(body),
    tasks: parseTasks(body),
    conditions: parseConditions(body),
    routes: parseRoutes(body),
    steps: parseSteps(body),
    crossFileRefs: parseCrossFileRefs(body, path),
    accessRoles: parseAccessRoles(body),
    depth: 0,
    parentDir: "",
  };
}
