import React, { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ArchitectureNodeData } from "../../../types";
import { NODE_COLORS, NODE_LABELS } from "../../../types";

const TypeIcon: Record<string, React.ReactNode> = {
  page: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4h12l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  ),
  component: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  api: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  database: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 5v14c0 1.66-4.03 3-9 3s-9-1.34-9-3V5" />
      <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
    </svg>
  ),
  auth: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  action: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  ),
  decision: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l10 10-10 10L2 12z" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  state: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="23,4 23,10 17,10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  ),
  external: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  group: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
};

const ArchitectureNode = memo(({ data, selected }: NodeProps<ArchitectureNodeData>) => {
  const color = NODE_COLORS[data.nodeType] || "#a1a1aa";
  const icon = TypeIcon[data.nodeType] || TypeIcon.page;

  const opacity = data.dimmed ? 0.3 : 1;
  const scale = data.highlighted ? 1.02 : 1;

  const iconBg = hexToRgba(color, 0.08);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-surface-border !w-1.5 !h-1.5 !border-0 !min-w-0 !min-h-0"
      />

      <div
        className={`
          group relative px-4 py-3 rounded-xl cursor-pointer
          transition-all duration-200 ease-out
          border
          ${selected
            ? "bg-surface-overlay border-accent/40 shadow-lg shadow-accent/10"
            : "bg-surface-raised border-surface-border hover:border-surface-border-light hover:bg-surface-overlay"
          }
          ${data.highlighted ? "ring-1 ring-accent/20" : ""}
        `}
        style={{ minWidth: 200, maxWidth: 280 }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
            style={{ backgroundColor: iconBg, color }}
          >
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                {NODE_LABELS[data.nodeType]}
              </span>
            </div>
            <h3 className="text-[13px] font-medium text-text-primary leading-snug mt-0.5 truncate">
              {data.label}
            </h3>
            {data.description && (
              <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed line-clamp-2">
                {data.description}
              </p>
            )}
          </div>
        </div>

        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5 pl-10">
            {data.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-md bg-surface-overlay text-text-tertiary font-medium"
              >
                {tag}
              </span>
            ))}
            {data.tags.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-surface-overlay text-text-muted">
                +{data.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div
          className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: color }}
        />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-surface-border !w-1.5 !h-1.5 !border-0 !min-w-0 !min-h-0"
      />
    </div>
  );
});

ArchitectureNode.displayName = "ArchitectureNode";
export default ArchitectureNode;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
