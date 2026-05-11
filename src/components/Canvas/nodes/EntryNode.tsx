import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ArchitectureNodeData } from "../../../types";

const handleBase = "!w-1.5 !h-1.5 !min-w-0 !min-h-0 !border-0 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200";

const EntryNode = memo(({ data, selected }: NodeProps<ArchitectureNodeData>) => {
  return (
    <div
      style={{
        opacity: data.dimmed ? 0.3 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`${handleBase} !bg-emerald-500/50`}
      />

      <div
        className={`
          group px-5 py-2.5 cursor-pointer
          transition-all duration-200 ease-out
          border-2
          ${selected
            ? "bg-emerald-500/20 border-emerald-500/60 shadow-lg shadow-emerald-500/10"
            : "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50"
          }
          ${data.highlighted ? "ring-1 ring-emerald-500/30" : ""}
        `}
        style={{
          borderRadius: 50,
          minWidth: 160,
          maxWidth: 260,
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e" stroke="none">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          <span className="text-[12px] font-semibold text-emerald-400 text-center">
            {data.label}
          </span>
        </div>
        {data.description && (
          <p className="text-[10px] text-emerald-400/60 text-center mt-0.5 truncate">
            {data.description}
          </p>
        )}
      </div>
    </div>
  );
});

EntryNode.displayName = "EntryNode";
export default EntryNode;
