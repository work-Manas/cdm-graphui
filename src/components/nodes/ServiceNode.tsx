"use client";

import { Handle, Position } from "@xyflow/react";
import { memo } from "react";
import { PROVIDERS } from "@/lib/constants";
import { getGlyph } from "@/lib/iconRegistry";
import { useLiveStore } from "@/lib/store";
import { fmtMoney } from "@/lib/rng";
import type { ServiceNode as ServiceNodeType } from "@/types/architecture";

const STATUS_DOT: Record<string, string> = {
  healthy: "#10b981",
  degraded: "#f59e0b",
  down: "#ef4444",
};

type Props = {
  id: string;
  data: ServiceNodeType["data"];
  selected: boolean;
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) {
    return <svg className="h-3 w-full" preserveAspectRatio="none" />;
  }
  const w = 100;
  const h = 16;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPath = `M0,${h} L${points.split(" ").map((p) => p.replace(",", " ")).join(" L")} L${w},${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-3 w-full"
    >
      <path d={areaPath} fill={color} opacity={0.16} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = STATUS_DOT[status] ?? STATUS_DOT.healthy;
  return (
    <span className="relative inline-flex h-2 w-2 items-center justify-center">
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color, opacity: 0.25 }}
      />
      <span
        className="relative inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}

function ServiceNodeComponent({ id, data, selected }: Props) {
  const live = useLiveStore((s) => s.nodeStates[id]);
  const selectNode = useLiveStore((s) => s.selectNode);
  const liveState = live ?? null;

  const p = PROVIDERS[data.provider];
  const Glyph = getGlyph(data.iconKey);

  const status = liveState?.status ?? data.status;
  const dotColor = STATUS_DOT[status] ?? STATUS_DOT.healthy;

  const primaryMetric = data.metrics[0];
  const primaryValue = primaryMetric ? (liveState?.metrics?.[primaryMetric.key] ?? primaryMetric.baseline) : 0;
  const sparkData = primaryMetric ? (liveState?.history?.[primaryMetric.key] ?? []) : [];
  const costToday = liveState?.costSoFarToday ?? 0;

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: p.color, width: 8, height: 8, border: "none", opacity: 0.9 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: p.color, width: 8, height: 8, border: "none", opacity: 0.9 }}
      />
      <div
        onClick={onClick}
        className="group relative cursor-pointer select-none"
        style={{
          width: 192,
        }}
      >
        <div
          className="relative overflow-hidden border text-left transition-all duration-200"
          style={{
            borderRadius: 12,
            borderColor: selected ? p.color : "rgba(255,255,255,0.1)",
            borderWidth: selected ? 1.5 : 1,
            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            boxShadow: selected
              ? `0 0 0 3px ${p.color}22, 0 8px 24px rgba(0,0,0,0.5)`
              : "0 4px 12px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="absolute left-0 top-0 h-full"
            style={{ width: 3, background: p.color }}
          />
          <div className="px-3 py-2.5 pl-4">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                style={{
                  background: `${p.color}1a`,
                  color: p.color,
                }}
              >
                <Glyph size={13} weight="bold" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate text-[11.5px] font-medium leading-tight text-zinc-100">
                  {data.serviceName}
                </div>
                <div
                  className="truncate text-[9.5px] leading-none text-zinc-500"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {data.instanceType}
                </div>
              </div>
              <StatusDot status={status} />
            </div>

            <div
              className="mt-2 flex items-center justify-between text-[9.5px] text-zinc-500"
              style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
            >
              <span className="truncate">{data.instanceId}</span>
              <span
                className="ml-2 rounded px-1 py-0.5 text-[8.5px] uppercase tracking-wider"
                style={{ background: `${p.color}14`, color: p.color }}
              >
                {data.az}
              </span>
            </div>

            {primaryMetric && (
              <div className="mt-2">
                <Sparkline values={sparkData} color={p.color} />
                <div
                  className="mt-1 flex items-baseline justify-between text-[9.5px]"
                  style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
                >
                  <span style={{ color: dotColor }}>{primaryMetric.label}</span>
                  <span className="text-zinc-300">
                    {primaryValue.toFixed(1)}
                    <span className="ml-0.5 text-[8.5px] text-zinc-600">{primaryMetric.unit}</span>
                  </span>
                </div>
              </div>
            )}

            <div
              className="mt-2 flex items-baseline justify-between border-t border-white/5 pt-1.5 text-[9.5px]"
              style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
            >
              <span className="text-zinc-500">{fmtMoney(data.cost.hourly)}/hr</span>
              <span className="text-zinc-400">{fmtMoney(costToday)} today</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const ServiceNode = memo(ServiceNodeComponent);
