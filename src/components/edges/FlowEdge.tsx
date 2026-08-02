"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { STATUS_COLORS } from "@/lib/constants";

const STATUS_TO_COLOR: Record<string, string> = {
  active: STATUS_COLORS.active,
  degraded: STATUS_COLORS.degraded,
  idle: STATUS_COLORS.idle,
};

type FlowEdgeData = {
  kind: "flow";
  ports: { protocol: string; port: number }[];
  status: "active" | "idle" | "degraded";
  throughput: { current: number; peak: number };
  label: string;
};

type FlowEdgeProps = Omit<EdgeProps, "data"> & { data?: FlowEdgeData };

function FlowEdgeComponent({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }: FlowEdgeProps) {
  const [hovered, setHovered] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const status = data?.status ?? "active";
  const color = STATUS_TO_COLOR[status] ?? STATUS_COLORS.active;
  const dimmed = status === "idle";

  const trackWidth = hovered ? 5 : 3;
  const flowWidth = hovered ? 2.5 : 1.5;
  const dashAnim = reduceMotion
    ? "none"
    : status === "active"
    ? "flow-dash 1s linear infinite"
    : status === "degraded"
    ? "flow-dash 3s ease-in-out infinite"
    : "none";
  const strokeDasharray = reduceMotion && status !== "idle" ? "0" : "6 6";

  const onEnter = () => setHovered(true);
  const onLeave = () => setHovered(false);

  return (
    <>
      <g
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="group"
      >
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={trackWidth}
          strokeOpacity={dimmed ? 0.08 : hovered ? 0.22 : 0.16}
          style={{ transition: "stroke-opacity 200ms, stroke-width 200ms" }}
        />
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={flowWidth}
          strokeOpacity={dimmed ? 0.35 : hovered ? 1 : 0.85}
          strokeDasharray={strokeDasharray}
          style={{
            animation: dashAnim,
            strokeLinecap: "round",
          }}
          markerEnd={markerEnd}
        />
        <path
          d={edgePath}
          fill="transparent"
          stroke="transparent"
          strokeWidth={14}
          pointerEvents="stroke"
        />
      </g>
      {(hovered || status === "degraded") && data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
            className="nodrag nopan"
          >
            <div
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-none backdrop-blur-md"
              style={{
                background: "rgba(9, 9, 11, 0.78)",
                borderColor: status === "degraded"
                  ? `${STATUS_COLORS.degraded}55`
                  : "rgba(255,255,255,0.12)",
                color: status === "degraded" ? STATUS_COLORS.degraded : "var(--color-text-secondary)",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: color, opacity: dimmed ? 0.4 : 1 }}
              />
              <span>{data.label}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
      <BaseEdge id={id} path={edgePath} style={{ display: "none" }} />
    </>
  );
}

export const FlowEdge = memo(FlowEdgeComponent);
