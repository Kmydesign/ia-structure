import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ArchitectureNodeData } from "../../../types";

const handleBase = "!w-1.5 !h-1.5 !min-w-0 !min-h-0 !border-0 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200";

const ExitNode = memo(({ data, selected }: NodeProps<ArchitectureNodeData>) => {
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
        className={`${handleBase} !bg-slate-400/50`}
      />

      <div
        className={`
          group px-5 py-2.5 cursor-pointer
          transition-all duration-200 ease-out
          border-2
          ${selected
            ? "bg-slate-400/20 border-slate-300/60 shadow-lg shadow-slate-500/10"
            : "bg-slate-400/10 border-slate-500/30 hover:border-slate-400/50"
          }
          ${data.highlighted ? "ring-1 ring-slate-400/30" : ""}
        `}
        style={{
          borderRadius: 50,
          minWidth: 140,
          maxWidth: 220,
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#94a3b8" stroke="none">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <span className="text-[12px] font-semibold text-slate-400 text-center">
            {data.label}
          </span>
        </div>
      </div>
    </div>
  );
});

ExitNode.displayName = "ExitNode";
export default ExitNode;
