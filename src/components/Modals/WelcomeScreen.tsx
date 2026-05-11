import React, { useCallback } from "react";
import { useProjectStore } from "../../stores/projectStore";

const WelcomeScreen: React.FC = () => {
  const scanFolder = useProjectStore((s) => s.scanFolder);

  const handleOpenFolder = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/tauri");
      const path = await invoke<string | null>("open_folder");
      if (path) {
        await scanFolder(path);
      }
    } catch (e) {
      console.error("Failed to open folder:", e);
    }
  }, [scanFolder]);

  return (
    <div className="flex-1 flex items-center justify-center bg-surface">
      <div className="max-w-md text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
          IA Structure
        </h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          Visual architecture & workflow mapping from Markdown documentation.
        </p>

        <button
          onClick={handleOpenFolder}
          className="mt-8 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-accent text-white text-[13px] font-medium hover:bg-accent-hover transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <polyline points="9,14 12,11 15,14" />
          </svg>
          Open Documentation Folder
        </button>

        <div className="mt-12 grid grid-cols-3 gap-4 text-left">
          <div className="p-3 rounded-xl bg-surface-raised border border-surface-border">
            <div className="w-7 h-7 rounded-lg bg-node-page/10 flex items-center justify-center mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-[11px] font-semibold text-text-primary">Auto-Detect</h3>
            <p className="text-[10px] text-text-muted mt-0.5">Pages, APIs, auth flows, dependencies</p>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-surface-border">
            <div className="w-7 h-7 rounded-lg bg-node-component/10 flex items-center justify-center mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="8" y="14" width="8" height="7" rx="1" />
              </svg>
            </div>
            <h3 className="text-[11px] font-semibold text-text-primary">Visualize</h3>
            <p className="text-[10px] text-text-muted mt-0.5">Interactive architecture maps</p>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-surface-border">
            <div className="w-7 h-7 rounded-lg bg-node-action/10 flex items-center justify-center mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5">
                <polyline points="23,4 23,10 17,10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </div>
            <h3 className="text-[11px] font-semibold text-text-primary">Live Sync</h3>
            <p className="text-[10px] text-text-muted mt-0.5">Updates as files change</p>
          </div>
        </div>

        <p className="text-[10px] text-text-muted mt-8">
          Works with any Markdown documentation structure. Frontmatter, links, and Mermaid diagrams are automatically parsed.
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
