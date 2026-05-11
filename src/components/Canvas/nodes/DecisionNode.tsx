import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ArchitectureNodeData } from "../../../types";

const handleBase = "!w-1.5 !h-1.5 !min-w-0 !min-h-0 !border-0 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200";

const BRANCH_HANDLES = [
  { position: Position.Bottom, id: "bottom" },
  { position: Position.Left, id: "left" },
  { position: Position.Right, id: "right" },
  { position: Position.Top, id: "top-extra" },
];

const DecisionNode = memo(({ data, selected }: NodeProps<ArchitectureNodeData>) => {
  const branchLabels = data.branchLabels || [];
  const branchCount = Math.max(branchLabels.length, 2);
  const activeHandles = BRANCH_HANDLES.slice(0, branchCount);

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
        className={`${handleBase} !bg-orange-500/50`}
      />

      <div
        className={`
          group relative px-4 py-3 cursor-pointer
          transition-all duration-200 ease-out
          border
          ${selected
            ? "bg-[#1a1a1e] border-orange-500/50 shadow-lg shadow-orange-500/10"
            : "bg-[#111113] border-[#27272a] hover:border-orange-500/30"
          }
          ${data.highlighted ? "ring-1 ring-orange-500/20" : ""}
        `}
        style={{
          minWidth: 200,
          maxWidth: 260,
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          padding: "32px 40px",
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
            <path d="M12 2l10 10-10 10L2 12z" />
          </svg>
          <span className="text-[12px] font-medium text-[#e4e4e7] text-center">
            {data.label}
          </span>
        </div>
      </div>

      {activeHandles.map((handle) => (
        <Handle
          key={handle.id}
          type="source"
          position={handle.position}
          id={handle.id}
          className={`${handleBase} !bg-orange-500/50`}
        />
      ))}
    </div>
  );
});

DecisionNode.displayName = "DecisionNode";
export default DecisionNode;
