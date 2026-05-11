import React, { useEffect, useCallback } from "react";
import { FlowCanvas } from "./components/Canvas";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { FileViewer } from "./components/FileViewer";
import { WelcomeScreen } from "./components/Modals";
import { useProjectStore } from "./stores/projectStore";
import { useCanvasStore } from "./stores/canvasStore";

const App: React.FC = () => {
  const rootPath = useProjectStore((s) => s.rootPath);
  const graph = useProjectStore((s) => s.graph);
  const scanFolder = useProjectStore((s) => s.scanFolder);

  const viewMode = useCanvasStore((s) => s.viewMode);
  const layoutDirection = useCanvasStore((s) => s.layoutDirection);

  useEffect(() => {
    if (rootPath) {
      const handler = async (event: any) => {
        const paths: string[] = event.payload;
        const hasMd = paths.some(
          (p) => p.endsWith(".md") || p.endsWith(".mdx") || p.endsWith(".markdown")
        );
        if (hasMd) {
          await scanFolder(rootPath);
        }
      };

      let unlisten: (() => void) | null = null;
      (async () => {
        try {
          const { listen } = await import("@tauri-apps/api/event");
          unlisten = await listen<string[]>("fs-change", handler);
        } catch {}
      })();

      return () => {
        unlisten?.();
      };
    }
  }, [rootPath, scanFolder]);

  useEffect(() => {
    if (!rootPath) return;
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/tauri");
        await invoke("start_watcher", { path: rootPath });
      } catch {}
    })();
  }, [rootPath]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "o") {
      e.preventDefault();
      document.getElementById("open-folder-btn")?.click();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      const input = document.querySelector('input[placeholder="Search nodes..."]') as HTMLInputElement;
      input?.focus();
    }
    if (e.key === "Escape") {
      useCanvasStore.getState().selectNode(null);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!rootPath || graph.nodes.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col bg-surface">
        <Toolbar />
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <FlowCanvas />
        <FileViewer />
      </div>
    </div>
  );
};

export default App;
