"use client";

import { useLiveStore } from "@/lib/store";
import { getProvider } from "@/lib/constants";
import { fmtMoney } from "@/lib/rng";
import { getGlyph } from "@/lib/iconRegistry";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createElement, useState, useMemo } from "react";
import type { MetricSpec, ServiceNode as ServiceNodeType } from "@/types/architecture";

const TABS = ["overview", "cost", "connections", "events"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  cost: "Cost",
  connections: "Connections",
  events: "Events",
};

export function DetailPanel() {
  const selectedId = useLiveStore((s) => s.selectedNodeId);
  const arch = useLiveStore((s) => s.arch);
  const selectNode = useLiveStore((s) => s.selectNode);
  const [tab, setTab] = useState<Tab>("overview");

  const node = useMemo<ServiceNodeType | null>(() => {
    if (!arch || !selectedId) return null;
    return arch.nodes.find((n) => n.id === selectedId) ?? null;
  }, [arch, selectedId]);

  const open = !!node;

  return (
    <aside
      className="relative shrink-0 overflow-hidden border-l border-white/10 bg-zinc-950/95 backdrop-blur-md transition-[width,transform,opacity] duration-300 ease-out"
      aria-hidden={!open}
      inert={!open}
      style={{
        width: open ? "min(400px, 100vw)" : 0,
        transform: open ? "translateX(0)" : "translateX(16px)",
        pointerEvents: open ? "auto" : "none",
        zIndex: 40,
      } as React.CSSProperties}
    >
      <AnimatePresence mode="popLayout">
        {node && (
          <motion.div
            key={node.id}
            initial={{ filter: "blur(8px)", opacity: 0, scale: 0.98 }}
            animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
            exit={{ filter: "blur(8px)", opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="h-full"
            style={{ width: "min(400px, 100vw)", transformOrigin: "right center" }}
          >
            <DetailContent node={node} tab={tab} onTab={setTab} onClose={() => selectNode(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

function DetailContent({
  node,
  tab,
  onTab,
  onClose,
}: {
  node: ServiceNodeType;
  tab: Tab;
  onTab: (t: Tab) => void;
  onClose: () => void;
}) {
  const live = useLiveStore((s) => s.nodeStates[node.id]);
  const liveHistory = live?.history ?? {};
  const events = live?.events ?? [];
  const p = getProvider(node.data.provider);
  const glyph = getGlyph(node.data.iconKey);
  const status = live?.status ?? node.data.status;

  const connections = useConnections(node.id);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex items-start gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
            style={{ background: `${p.color}1a`, color: p.color }}
          >
            {createElement(glyph, { size: 14, weight: "bold" })}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-zinc-100 truncate">
                {node.data.serviceName}
              </span>
              <span
                className="rounded px-1 py-px text-[8.5px] uppercase tracking-wider"
                style={{ background: `${p.color}14`, color: p.color }}
              >
                {p.label}
              </span>
            </div>
            <div
              className="mt-0.5 text-[10px] text-zinc-500 tnum"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {node.data.instanceId} · {node.data.az}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-white/5 hover:text-zinc-200 active:scale-95"
            aria-label="Close detail panel"
          >
            <X size={12} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${status === "degraded" ? "animate-pulse" : ""}`}
              style={{
                background: status === "healthy" ? "#10b981" : status === "degraded" ? "#f59e0b" : "#ef4444",
              }}
            />
            <span className="uppercase tracking-wider text-zinc-400" style={{ fontSize: 10 }}>
              {status}
            </span>
          </span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-400 tnum" style={{ fontFamily: "var(--font-mono)" }}>
            uptime {node.data.uptime.pct_30d.toFixed(2)}%
          </span>
        </div>
      </header>

      <nav className="flex border-b border-white/10 px-2">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => onTab(t)}
              className={`relative px-3 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {TAB_LABELS[t]}
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-px"
                  style={{ background: p.color }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "overview" && <OverviewTab node={node} history={liveHistory} />}
        {tab === "cost" && <CostTab node={node} costSoFarToday={live?.costSoFarToday ?? 0} />}
        {tab === "connections" && <ConnectionsTab connections={connections} />}
        {tab === "events" && <EventsTab events={events} />}
      </div>
    </div>
  );
}

function OverviewTab({
  node,
  history,
}: {
  node: ServiceNodeType;
  history: Record<string, number[]>;
}) {
  return (
    <div className="space-y-4">
      {node.data.metrics.map((m) => (
        <MetricRow key={m.key} m={m} history={history[m.key] ?? []} />
      ))}
      <ConfigBlock node={node} />
    </div>
  );
}

function MetricRow({ m, history }: { m: MetricSpec; history: number[] }) {
  const latest = history.length ? history[history.length - 1] : m.baseline;
  const max = Math.max(...history, 1);
  const min = Math.min(...history, 0);
  const range = max - min || 1;
  const points = history.map((value, index) =>
    `${(index / (history.length - 1 || 1)) * 100},${48 - ((value - min) / range) * 48}`,
  ).join(" ");
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">{m.label}</span>
        <span
          className="text-[12px] font-medium text-zinc-100 tnum"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {latest.toFixed(1)} <span className="text-[9px] text-zinc-600">{m.unit}</span>
        </span>
      </div>
      <div className="h-12 w-full">
        <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="h-full w-full">
          <polyline points={points} fill="none" stroke="#10b981" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

function ConfigBlock({ node }: { node: ServiceNodeType }) {
  const cfg = node.data.config;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">
        Configuration
      </div>
      <div
        className="space-y-1.5 text-[10.5px] tnum"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <ConfigRow label="instance type" value={node.data.instanceType} />
        {cfg.securityGroup && <ConfigRow label="security group" value={cfg.securityGroup} />}
        {cfg.autoscaling && (
          <ConfigRow
            label="autoscaling"
            value={`${cfg.autoscaling.min} → ${cfg.autoscaling.current} → ${cfg.autoscaling.max}`}
          />
        )}
        {cfg.storageGb && <ConfigRow label="storage" value={`${cfg.storageGb} GB`} />}
        {cfg.ports.length > 0 && (
          <ConfigRow
            label="ports"
            value={cfg.ports.map((p) => `${p.protocol}:${p.port}`).join(", ")}
          />
        )}
      </div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 text-right truncate">{value}</span>
    </div>
  );
}

function CostTab({
  node,
  costSoFarToday,
}: {
  node: ServiceNodeType;
  costSoFarToday: number;
}) {
  const breakdown = node.data.cost.breakdown;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <CostStat label="hourly" value={fmtMoney(node.data.cost.hourly)} />
        <CostStat label="today" value={fmtMoney(costSoFarToday)} />
        <CostStat label="monthly" value={fmtMoney(node.data.cost.monthly)} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Monthly breakdown
        </div>
        <div className="space-y-1.5">
          {breakdown.map((b) => {
            const pct = (b.amount / node.data.cost.monthly) * 100;
            return (
              <div key={b.label}>
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-zinc-300">{b.label}</span>
                  <span
                    className="text-zinc-400 tnum"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {fmtMoney(b.amount)}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CostStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <div className="text-[8.5px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div
        className="mt-1 text-[13px] font-medium text-zinc-100 tnum"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </div>
    </div>
  );
}

function ConnectionsTab({ connections }: { connections: ConnectionEntry[] }) {
  if (!connections.length) {
    return (
      <div className="pt-8 text-center text-[10.5px] text-zinc-600">
        No connections to display.
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {connections.map((c, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background:
                  c.status === "active"
                    ? "#10b981"
                    : c.status === "degraded"
                    ? "#f59e0b"
                    : "#71717a",
              }}
            />
            <span className="text-[10.5px] text-zinc-300">
              {c.direction === "out" ? "→" : "←"} {c.peerService}
            </span>
          </div>
          <span
            className="rounded px-1.5 py-0.5 text-[9px] tnum"
            style={{
              fontFamily: "var(--font-mono)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--color-text-secondary)",
            }}
          >
            {c.port}
          </span>
        </div>
      ))}
    </div>
  );
}

type ConnectionEntry = {
  peerService: string;
  direction: "in" | "out";
  status: string;
  port: string;
};

function useConnections(nodeId: string): ConnectionEntry[] {
  const arch = useLiveStore((s) => s.arch);
  const edgeStates = useLiveStore((s) => s.edgeStates);
  if (!arch) return [];
  const entries: ConnectionEntry[] = [];
  for (const e of arch.edges) {
    if (!e.data) continue;
    const portStr = e.data.ports.map((p) => `${p.protocol} :${p.port}`).join(" / ");
    if (e.source === nodeId) {
      const peer = arch.nodes.find((n) => n.id === e.target);
      if (peer) {
        entries.push({
          peerService: peer.data.serviceName,
          direction: "out",
          status: edgeStates[e.id]?.status ?? e.data.status,
          port: portStr,
        });
      }
    } else if (e.target === nodeId) {
      const peer = arch.nodes.find((n) => n.id === e.source);
      if (peer) {
        entries.push({
          peerService: peer.data.serviceName,
          direction: "in",
          status: edgeStates[e.id]?.status ?? e.data.status,
          port: portStr,
        });
      }
    }
  }
  return entries;
}

function EventsTab({
  events,
}: {
  events: { ts: string; type: string; message: string }[];
}) {
  if (!events.length) {
    return (
      <div className="pt-8 text-center text-[10.5px] text-zinc-600">
        No events in this session yet.
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {[...events].reverse().map((e, i) => (
        <div key={i} className="flex gap-2.5">
          <div className="flex flex-col items-center">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-500" />
            {i < events.length - 1 && <span className="flex-1 w-px bg-white/10 mt-1" />}
          </div>
          <div className="flex-1 pb-2">
            <div
              className="text-[9px] uppercase tracking-wider text-zinc-500 tnum"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {e.ts}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-zinc-400">
              {e.type}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-200">{e.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
