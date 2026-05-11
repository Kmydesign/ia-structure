import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ArchitectureNodeData } from "../../../types";

const handleBase = "!w-1.5 !h-1.5 !min-w-0 !min-h-0 !border-0 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200";

const ErrorNode = memo(({ data, selected }: NodeProps<ArchitectureNodeData>) => {
  return (
    <div
      style={{
        opacity: data.dimmed ? 0.3 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`${handleBase} !bg-red-500/50`}
      />

      <div
        className={`
          group relative px-4 py-3 cursor-pointer
          transition-all duration-200 ease-out
          border
          ${selected
            ? "bg-red-500/15 border-red-500/50 shadow-lg shadow-red-500/10"
            : "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
          }
          ${data.highlighted ? "ring-1 ring-red-500/30" : ""}
        `}
        style={{
          minWidth: 180,
          maxWidth: 240,
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          padding: "28px 24px",
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-[11px] font-medium text-red-400 text-center">
            {data.label}
          </span>
        </div>
        {data.description && (
          <p className="text-[9px] text-red-400/60 text-center mt-1 truncate">
            {data.description}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`${handleBase} !bg-red-500/50`}
      />
    </div>
  );
});

ErrorNode.displayName = "ErrorNode";
export default ErrorNode;
