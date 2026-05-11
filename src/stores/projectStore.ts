import { create } from "zustand";
import type {
  ParsedMarkdown,
  DirectoryTree,
  ArchitectureGraph,
  ProjectState,
  ValidationReport,
} from "../types";
import { parseMarkdownFile } from "../parsers/markdownParser";
import { buildGraph } from "../engine/graphBuilder";
import { computeAutoLayout } from "../engine/autoLayout";
import { validateDocument } from "../parsers/flowParser";

interface ProjectActions {
  setRootPath: (path: string) => void;
  loadFromScan: (
    files: any[],
    tree: DirectoryTree
  ) => void;
  scanFolder: (path: string) => Promise<void>;
  updateFile: (path: string, content: string) => void;
  removeFile: (path: string) => void;
  clear: () => void;
  setScanning: (v: boolean) => void;
  getGraph: () => ArchitectureGraph;
}

const initialProject: ProjectState = {
  rootPath: null,
  name: "",
  files: [],
  directoryTree: null,
  graph: { nodes: [], edges: [], groups: [] },
  lastScanned: null,
  isScanning: false,
  validationReports: [],
};

export const useProjectStore = create<ProjectState & ProjectActions>()(
  (set, get) => ({
    ...initialProject,

    setRootPath: (path) => {
      const name = path.split(/[\\/]/).pop() || "Untitled";
      set({ rootPath: path, name });
    },

    loadFromScan: (rawFiles, tree) => {
      const parsed: ParsedMarkdown[] = rawFiles.map((f: any) =>
        parseMarkdownFile(f)
      );

      const graph = buildGraph(parsed, tree);

      const reports: ValidationReport[] = parsed.map((f) => validateDocument(f));

      set({
        files: parsed,
        directoryTree: tree,
        graph,
        lastScanned: Date.now(),
        isScanning: false,
        validationReports: reports,
      });

      computeAutoLayout(graph.nodes, graph.edges).then((positions) => {
        if (positions.size === 0) return;
        const { graph: currentGraph } = get();
        const updatedNodes = currentGraph.nodes.map((node) => ({
          ...node,
          position: positions.get(node.id) || node.position || { x: 0, y: 0 },
        }));
        set({ graph: { ...currentGraph, nodes: updatedNodes } });
      });
    },

    scanFolder: async (path) => {
      set({ isScanning: true });
      get().setRootPath(path);

      try {
        const { invoke } = await import("@tauri-apps/api/tauri");
        const result = await invoke<{
          files: any[];
          tree: DirectoryTree;
        }>("scan_directory", { path });
        if (result) {
          get().loadFromScan(result.files, result.tree);
        }
      } catch (err) {
        console.error("Scan failed:", err);
        set({ isScanning: false });
      }
    },

    updateFile: (path, content) => {
      const { files } = get();
      const idx = files.findIndex((f) => f.path === path);
      if (idx === -1) return;

      const updated = [...files];
      updated[idx] = parseMarkdownFile({
        path: updated[idx].path,
        relative_path: updated[idx].relativePath,
        name: updated[idx].name,
        content,
        depth: updated[idx].depth,
        parent_dir: updated[idx].parentDir,
      });

      const graph = buildGraph(updated, get().directoryTree);
      set({ files: updated, graph });
    },

    removeFile: (path) => {
      const files = get().files.filter((f) => f.path !== path);
      const graph = buildGraph(files, get().directoryTree);
      set({ files, graph });
    },

    clear: () => set(initialProject),

    setScanning: (v) => set({ isScanning: v }),

    getGraph: () => get().graph,
  })
);
