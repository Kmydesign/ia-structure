import React, { useState, useMemo } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useCanvasStore } from "../../stores/canvasStore";
import { useFilterStore } from "../../stores/filterStore";
import { useFileViewerStore } from "../../stores/fileViewerStore";
import type { DirectoryTree, NodeType, FlowType } from "../../types";
import { NODE_COLORS, NODE_LABELS, FLOW_COLORS } from "../../types";
import { detectDocumentType } from "../../parsers/flowParser";

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`}
  >
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

const FolderIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);

const FileIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
);

interface TreeNodeProps {
  tree: DirectoryTree;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ tree, depth, selectedPath, onSelect }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);

  const hasChildren = tree.children.length > 0 || tree.files.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          onSelect(tree.path);
        }}
        className={`
          w-full flex items-center gap-1.5 py-1 px-2 rounded-lg text-left
          transition-colors duration-100
          hover:bg-surface-overlay
          ${selectedPath === tree.path ? "bg-surface-overlay text-text-primary" : "text-text-secondary"}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren && <ChevronIcon open={isOpen} />}
        {!hasChildren && <span className="w-3" />}
        <span className="text-text-tertiary">
          <FolderIcon />
        </span>
        <span className="text-[12px] font-medium truncate">{tree.name}</span>
        <span className="ml-auto text-[10px] text-text-muted">
          {tree.files.length}
        </span>
      </button>

      {isOpen && (
        <div className="animate-fade-in">
          {tree.files.map((file) => (
            <button
              key={file.path}
              onClick={() => onSelect(file.path)}
              className={`
                w-full flex items-center gap-1.5 py-1 px-2 rounded-lg text-left
                transition-colors duration-100
                hover:bg-surface-overlay
                ${selectedPath === file.path ? "bg-accent/10 text-accent" : "text-text-tertiary"}
              `}
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              <span className="text-text-muted">
                <FileIcon />
              </span>
              <span className="text-[11px] truncate">{file.name}</span>
            </button>
          ))}

          {tree.children.map((child) => (
            <TreeNode
              key={child.path}
              tree={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"tree" | "flows" | "filters" | "details">("tree");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const directoryTree = useProjectStore((s) => s.directoryTree);
  const rootPath = useProjectStore((s) => s.rootPath);
  const projectName = useProjectStore((s) => s.name);
  const graph = useProjectStore((s) => s.graph);
  const files = useProjectStore((s) => s.files);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const focusedFlowId = useCanvasStore((s) => s.focusedFlowId);
  const setFocusedFlow = useCanvasStore((s) => s.setFocusedFlow);
  const openFileInViewer = useFileViewerStore((s) => s.openFile);

  const filters = useFilterStore();

  const flowFiles = useMemo(() => {
    return files.filter((f) => detectDocumentType(f) === "flow");
  }, [files]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graph.nodes]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    graph.nodes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [graph.nodes]);

  const nodeTypeCounts = useMemo(() => {
    const counts: Partial<Record<NodeType, number>> = {};
    graph.nodes.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [graph.nodes]);

  const tabs = [
    { id: "tree" as const, label: "Files" },
    { id: "flows" as const, label: "Flows" },
    { id: "filters" as const, label: "Filters" },
    { id: "details" as const, label: "Details" },
  ];

  const stats = useMemo(() => {
    return {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      groups: graph.groups.length,
      orphaned: graph.nodes.filter(
        (n) => !graph.edges.some((e) => e.source === n.id || e.target === n.id)
      ).length,
    };
  }, [graph]);

  const handleSelectPath = (path: string) => {
    setSelectedPath(path);

    const matchedFile = files.find(
      (f) => f.path === path || f.relativePath === path
    );
    if (matchedFile) {
      openFileInViewer({
        path: matchedFile.path,
        relativePath: matchedFile.relativePath,
        name: matchedFile.name,
        content: matchedFile.content,
      });
    }
  };

  return (
    <div className="w-[280px] h-full bg-surface-raised border-r border-surface-border flex flex-col">
      <div className="px-4 py-3 border-b border-surface-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-text-primary leading-tight">
                {projectName || "IA Structure"}
              </h2>
              <p className="text-[10px] text-text-muted mt-0.5">
                {stats.nodes} nodes &middot; {stats.edges} connections
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-surface-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-2 text-[11px] font-medium transition-colors duration-100
              ${
                activeTab === tab.id
                  ? "text-text-primary border-b-2 border-accent"
                  : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "tree" && (
          <div className="p-2">
            {directoryTree ? (
              <>
                <TreeNode
                  tree={directoryTree}
                  depth={0}
                  selectedPath={selectedPath}
                  onSelect={handleSelectPath}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3 opacity-30">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                <p className="text-[11px]">Open a folder to begin</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "flows" && (
          <div className="p-2 space-y-1">
            {flowFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-2 opacity-30">
                  <path d="M2 12h4l3-9 4 18 3-9h6" />
                </svg>
                <p className="text-[11px]">No flows detected</p>
                <p className="text-[10px] mt-1 opacity-60">Files with ### Step N: headings</p>
              </div>
            ) : (
              <>
                <div className="px-2 pb-2">
                  <p className="text-[10px] text-text-muted">
                    Click a flow to focus on it
                  </p>
                </div>
                {flowFiles.map((file) => {
                  const isFocused = focusedFlowId === file.relativePath;
                  const flowTitle = file.headings[0]?.text || file.name;
                  const stepCount = (file.content.match(/^#{2,4}\s+Step\s+\d+/gm) || []).length;
                  return (
                    <button
                      key={file.relativePath}
                      onClick={() => setFocusedFlow(isFocused ? null : file.relativePath)}
                      className={`
                        w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left
                        transition-colors duration-100
                        ${isFocused
                          ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                          : "hover:bg-surface-overlay text-text-secondary"
                        }
                      `}
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-blue-500/15">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                          <path d="M2 12h4l3-9 4 18 3-9h6" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium truncate block">
                          {flowTitle}
                        </span>
                        <span className="text-[9px] text-text-muted">
                          {stepCount} step{stepCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {isFocused && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
                          FOCUSED
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeTab === "filters" && (
          <div className="p-3 space-y-5">
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Node Types
              </h3>
              <div className="space-y-1">
                {(Object.keys(NODE_LABELS) as NodeType[]).map((type) => {
                  const count = nodeTypeCounts[type] || 0;
                  if (count === 0) return null;
                  const isActive = filters.activeNodeTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => filters.toggleNodeType(type)}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                        transition-colors duration-100
                        ${isActive ? "bg-surface-overlay text-text-primary" : "text-text-secondary hover:bg-surface-overlay/50"}
                      `}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: NODE_COLORS[type] }}
                      />
                      <span className="text-[11px] font-medium flex-1">{NODE_LABELS[type]}</span>
                      <span className="text-[10px] text-text-muted">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Flow Types
              </h3>
              <div className="space-y-1">
                {(Object.keys(FLOW_COLORS) as FlowType[]).map((type) => {
                  const isActive = filters.activeFlowTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => filters.toggleFlowType(type)}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                        transition-colors duration-100
                        ${isActive ? "bg-surface-overlay text-text-primary" : "text-text-secondary hover:bg-surface-overlay/50"}
                      `}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: FLOW_COLORS[type] }}
                      />
                      <span className="text-[11px] font-medium flex-1 capitalize">
                        {type.replace("-", " ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {allTags.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1">
                  {allTags.map((tag) => {
                    const isActive = filters.activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => filters.toggleTag(tag)}
                        className={`
                          text-[10px] px-2 py-1 rounded-md transition-colors duration-100
                          ${isActive ? "bg-accent/15 text-accent" : "bg-surface-overlay text-text-tertiary hover:text-text-secondary"}
                        `}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-overlay/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showOrphaned}
                  onChange={(e) => filters.setShowOrphaned(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-surface-border accent-accent"
                />
                <span className="text-[11px] text-text-secondary">Show orphaned nodes</span>
                <span className="text-[10px] text-text-muted ml-auto">{stats.orphaned}</span>
              </label>
            </div>

            {(filters.activeNodeTypes.length > 0 || filters.activeFlowTypes.length > 0 || filters.activeTags.length > 0) && (
              <button
                onClick={filters.clearFilters}
                className="w-full py-1.5 text-[11px] text-accent hover:text-accent-hover transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <div className="p-3">
            {selectedNode ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[selectedNode.type] }}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                      {NODE_LABELS[selectedNode.type]}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-text-primary">
                    {selectedNode.label}
                  </h3>
                  {selectedNode.description && (
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                      {selectedNode.description}
                    </p>
                  )}
                </div>

                {selectedNode.sourcePath && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">
                      Source
                    </h4>
                    <button
                      onClick={() => {
                        const matchedFile = files.find(
                          (f) => f.relativePath === selectedNode.sourcePath
                        );
                        if (matchedFile) {
                          openFileInViewer({
                            path: matchedFile.path,
                            relativePath: matchedFile.relativePath,
                            name: matchedFile.name,
                            content: matchedFile.content,
                          });
                        }
                      }}
                      className="text-[11px] text-accent hover:text-accent-hover transition-colors text-left flex items-center gap-1"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                      </svg>
                      {selectedNode.sourcePath}
                    </button>
                  </div>
                )}

                {selectedNode.tags.length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-surface-overlay text-text-tertiary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.flowTypes.length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
                      Flows
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.flowTypes.map((ft) => (
                        <span
                          key={ft}
                          className="text-[10px] px-2 py-0.5 rounded-full border"
                          style={{
                            borderColor: FLOW_COLORS[ft] + "40",
                            color: FLOW_COLORS[ft],
                          }}
                        >
                          {ft.replace("-", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(selectedNode.metadata).length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
                      Metadata
                    </h4>
                    <div className="space-y-1">
                      {Object.entries(selectedNode.metadata).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-[11px]">
                          <span className="text-text-muted flex-shrink-0">{key}:</span>
                          <span className="text-text-secondary truncate">
                            {Array.isArray(value) ? value.join(", ") : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
                    Connections
                  </h4>
                  <div className="space-y-1">
                    {graph.edges
                      .filter((e) => e.source === selectedNode.id)
                      .map((e) => {
                        const target = graph.nodes.find((n) => n.id === e.target);
                        return target ? (
                          <div
                            key={e.id}
                            className="flex items-center gap-1.5 text-[11px] text-text-secondary"
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12,5 19,12 12,19" />
                            </svg>
                            <span className="truncate">{target.label}</span>
                          </div>
                        ) : null;
                      })}
                    {graph.edges
                      .filter((e) => e.target === selectedNode.id)
                      .map((e) => {
                        const source = graph.nodes.find((n) => n.id === e.source);
                        return source ? (
                          <div
                            key={e.id}
                            className="flex items-center gap-1.5 text-[11px] text-text-secondary"
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="19" y1="12" x2="5" y2="12" />
                              <polyline points="12,5 5,12 12,19" />
                            </svg>
                            <span className="truncate">{source.label}</span>
                          </div>
                        ) : null;
                      })}
                    {!graph.edges.some(
                      (e) => e.source === selectedNode.id || e.target === selectedNode.id
                    ) && (
                      <p className="text-[11px] text-text-muted italic">No connections</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-2 opacity-30">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <p className="text-[11px]">Select a node to inspect</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-surface-border">
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span>{stats.nodes} nodes</span>
          <span>{stats.edges} edges</span>
          <span>{stats.orphaned} orphaned</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
