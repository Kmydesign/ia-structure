import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "reactflow";

const MAX_LABEL_LEN = 28;

function truncateLabel(label: string | undefined): string | undefined {
  if (!label) return undefined;
  if (label.length <= MAX_LABEL_LEN) return label;
  return label.slice(0, MAX_LABEL_LEN - 1) + "…";
}

const defaultEdgeStyle = {
  strokeWidth: 1.5,
  stroke: "#3a3a3f",
};

export function ArchitectureEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
    offset: 20,
  });

  const displayLabel = truncateLabel(typeof label === "string" ? label : undefined);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ ...defaultEdgeStyle, ...style }}
        markerEnd={markerEnd}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute text-[10px] text-[#71717a] font-medium px-2 py-0.5 rounded-md pointer-events-none"
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 8}px)`,
              backgroundColor: "rgba(10, 10, 11, 0.92)",
              border: "1px solid #27272a",
            }}
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export function ConditionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: 30,
  });

  const displayLabel = truncateLabel(typeof label === "string" ? label : undefined);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...defaultEdgeStyle,
          stroke: "#f97316",
          strokeDasharray: "5 5",
          ...style,
        }}
        markerEnd={markerEnd}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute text-[10px] font-semibold px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap"
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 10}px)`,
              color: "#f97316",
              backgroundColor: "rgba(10, 10, 11, 0.92)",
              border: "1px solid rgba(249, 115, 22, 0.25)",
            }}
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export function BranchEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: 30,
  });

  const labelStr = typeof label === "string" ? label : String(label || "");
  const displayLabel = truncateLabel(labelStr);
  const labelLower = labelStr.toLowerCase();

  let labelColor = "#f97316";
  let bgRgba = "rgba(17, 17, 19, 0.95)";
  let borderRgba = "rgba(249, 115, 22, 0.3)";
  if (labelLower === "yes" || labelLower === "pass" || labelLower === "success") {
    labelColor = "#22c55e";
    borderRgba = "rgba(34, 197, 94, 0.3)";
  } else if (labelLower === "no" || labelLower === "fail" || labelLower === "error") {
    labelColor = "#ef4444";
    borderRgba = "rgba(239, 68, 68, 0.3)";
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: 1.5,
          stroke: labelColor,
          ...style,
        }}
        markerEnd={markerEnd}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute text-[10px] font-semibold px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap"
            style={{
              color: labelColor,
              backgroundColor: bgRgba,
              border: `1px solid ${borderRgba}`,
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 10}px)`,
            }}
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
