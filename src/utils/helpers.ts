export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 1) + "…";
}

export function formatName(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx !== -1 ? filename.slice(idx + 1).toLowerCase() : "";
}

export function isMarkdownFile(filename: string): boolean {
  const ext = getExtension(filename);
  return ext === "md" || ext === "mdx" || ext === "markdown";
}
