import React, { useMemo } from "react";
import { useFileViewerStore } from "../../stores/fileViewerStore";

const FileViewer: React.FC = () => {
  const openFiles = useFileViewerStore((s) => s.openFiles);
  const activeFilePath = useFileViewerStore((s) => s.activeFilePath);
  const isOpen = useFileViewerStore((s) => s.isOpen);
  const closeFile = useFileViewerStore((s) => s.closeFile);
  const setActiveFile = useFileViewerStore((s) => s.setActiveFile);
  const closeAll = useFileViewerStore((s) => s.closeAll);

  const activeFile = useMemo(
    () => openFiles.find((f) => f.path === activeFilePath) || null,
    [openFiles, activeFilePath]
  );

  if (!isOpen || openFiles.length === 0) return null;

  return (
    <div
      className="w-[420px] h-full flex flex-col border-l border-surface-border bg-surface-raised"
      style={{ flexShrink: 0 }}
    >
      <div className="flex items-center border-b border-surface-border">
        <div className="flex-1 flex overflow-x-auto">
          {openFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(file.path)}
              className={`
                flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium
                border-r border-surface-border whitespace-nowrap
                transition-colors duration-100
                ${
                  file.path === activeFilePath
                    ? "bg-surface text-text-primary"
                    : "text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50"
                }
              `}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
                className="ml-1 text-text-muted hover:text-text-primary transition-colors p-0.5 rounded hover:bg-surface-overlay"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </button>
          ))}
        </div>
        <button
          onClick={closeAll}
          className="px-2 py-2 text-text-muted hover:text-text-primary transition-colors"
          title="Close all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeFile ? (
          <MarkdownContent content={activeFile.content} />
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-[11px]">
            No file selected
          </div>
        )}
      </div>
    </div>
  );
};

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");

  return (
    <div className="p-4 font-mono text-[12px] leading-[1.7]">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="w-8 text-right mr-4 text-text-muted/40 select-none text-[10px] leading-[1.7]">
            {i + 1}
          </span>
          <span
            className={
              line.startsWith("# ")
                ? "text-[14px] font-bold text-text-primary leading-[2]"
                : line.startsWith("## ")
                ? "text-[13px] font-semibold text-text-primary leading-[1.8]"
                : line.startsWith("### ")
                ? "text-[12px] font-semibold text-text-primary leading-[1.7]"
                : line.startsWith("- ") || line.startsWith("* ")
                ? "text-[#a1a1aa] pl-3"
                : line.startsWith("|")
                ? "text-[#71717a]"
                : line.startsWith("> ")
                ? "text-[#71717a] border-l-2 border-surface-border pl-3 italic"
                : line.trim() === ""
                ? "h-2"
                : "text-[#a1a1aa]"
            }
          >
            {renderLine(line)}
          </span>
        </div>
      ))}
    </div>
  );
};

function renderLine(line: string) {
  return line.replace(
    /`([^`]+)`/g,
    '⟨$1⟩'
  );
}

export default FileViewer;
