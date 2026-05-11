import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ArchitectureNodeData } from "../../../types";

const handleBase = "!w-1.5 !h-1.5 !min-w-0 !min-h-0 !border-0 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200";

const StepNode = memo(({ data, selected }: NodeProps<ArchitectureNodeData>) => {
  return (
    <div
      style={{
        opacity: data.dimmed ? 0.3 : 1,
        transform: data.highlighted ? "scale(1.02)" : "scale(1)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`${handleBase} !bg-blue-500/50`}
      />

      <div
        className={`
          group relative px-4 py-3 rounded-xl cursor-pointer
          transition-all duration-200 ease-out
          border
          ${selected
            ? "bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10"
            : "bg-[#111113] border-[#27272a] hover:border-blue-500/30 hover:bg-blue-500/5"
          }
          ${data.highlighted ? "ring-1 ring-blue-500/20" : ""}
        `}
        style={{ minWidth: 220, maxWidth: 300 }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center mt-0.5">
            <span className="text-[11px] font-bold text-blue-400">
              {data.stepNumber || "#"}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-blue-400/70 uppercase tracking-wider">
                Step {data.stepNumber}
              </span>
            </div>
            <h3 className="text-[13px] font-medium text-[#e4e4e7] leading-snug mt-0.5">
              {data.label}
            </h3>
            {data.description && (
              <p className="text-[11px] text-[#71717a] mt-1 leading-relaxed line-clamp-2">
                {data.description}
              </p>
            )}
          </div>
        </div>

        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pl-10">
            {data.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#18181b] text-[#71717a]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-500" />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`${handleBase} !bg-blue-500/50`}
      />
    </div>
  );
});

StepNode.displayName = "StepNode";
export default StepNode;
