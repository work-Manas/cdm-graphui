"use client";

import { create } from "zustand";
import type { Architecture, FlowEdge, ServiceNode, ServiceStatus } from "@/types/architecture";
import { chance, jitter, mulberry32, pick, type RNG } from "@/lib/rng";
import { useMorphStore } from "@/lib/morphStore";
import { HISTORY_LEN, TICK_MS } from "@/lib/constants";

export type NodeLiveState = {
  metrics: Record<string, number>;
  costSoFarToday: number;
  status: ServiceStatus;
  history: Record<string, number[]>;
  events: { ts: string; type: string; message: string }[];
};

export type EdgeLiveState = {
  status: "active" | "idle" | "degraded";
};

type LiveStore = {
  archId: string | null;
  arch: Architecture | null;
  running: boolean;
  tickNumber: number;
  tickElapsedMs: number;
  selectedNodeId: string | null;
  nodeStates: Record<string, NodeLiveState>;
  edgeStates: Record<string, EdgeLiveState>;
  rng: RNG;
  setArch: (arch: Architecture) => void;
  start: () => void;
  pause: () => void;
  toggleRunning: () => void;
  selectNode: (id: string | null) => void;
  tick: () => void;
};

const EVENT_SAMPLES = {
  healthy: [
    { type: "deploy", message: "deployed v1.4.2-rc.1" },
    { type: "autoscale", message: "scale out: 4 -> 6 instances" },
    { type: "health", message: "healthcheck ok after restart" },
  ],
  degraded: [
    { type: "latency", message: "p95 latency 412ms (target 200ms)" },
    { type: "throttle", message: "throttling requests at 80%" },
    { type: "alert", message: "elevated error rate 0.62%" },
  ],
  down: [{ type: "incident", message: "instance unreachable in az-1c" }],
};

function makeEventTs(elapsedMs: number): string {
  const totalSec = Math.floor(elapsedMs / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `T+${h}:${m}:${s}`;
}

function seedNode(rng: RNG, n: ServiceNode): NodeLiveState {
  const metrics: Record<string, number> = {};
  const history: Record<string, number[]> = {};
  for (const m of n.data.metrics) {
    const v = jitter(rng, m.baseline, m.jitter);
    metrics[m.key] = v;
    history[m.key] = Array(HISTORY_LEN).fill(v);
  }
  return {
    metrics,
    costSoFarToday: 0,
    status: n.data.status,
    history,
    events: [],
  };
}

function seedEdge(rng: RNG, e: FlowEdge): EdgeLiveState {
  const d = e.data;
  return { status: d?.status ?? "idle" };
}

export const useLiveStore = create<LiveStore>((set, get) => ({
  archId: null,
  arch: null,
  running: false,
  tickNumber: 0,
  tickElapsedMs: 0,
  selectedNodeId: null,
  nodeStates: {},
  edgeStates: {},
  rng: mulberry32(0xc0ffee),

  setArch: (arch) => {
    const prev = get().arch;
    const prevKeys = new Set<string>();
    const nextKeys = new Set<string>();
    if (prev) {
      for (const n of prev.nodes) prevKeys.add(n.data.morphKey);
    }
    for (const n of arch.nodes) nextKeys.add(n.data.morphKey);

    const enteringKeys = new Set<string>();
    const exitingKeys = new Set<string>();
    for (const k of nextKeys) if (!prevKeys.has(k)) enteringKeys.add(k);
    for (const k of prevKeys) if (!nextKeys.has(k)) exitingKeys.add(k);

    if (prev) {
      // Compute provider and region group entering/exiting sets separately
      // (those keys are the group node ids, which are stable per-arch by construction.)
      const prevGroupKeys = new Set<string>();
      const nextGroupKeys = new Set<string>();
      for (const g of prev.providerGroups) prevGroupKeys.add(g.id);
      for (const g of prev.regionGroups) prevGroupKeys.add(g.id);
      for (const g of arch.providerGroups) nextGroupKeys.add(g.id);
      for (const g of arch.regionGroups) nextGroupKeys.add(g.id);
      for (const k of nextGroupKeys) if (!prevGroupKeys.has(k)) enteringKeys.add(k);
      for (const k of prevGroupKeys) if (!nextGroupKeys.has(k)) exitingKeys.add(k);
    } else {
      for (const n of arch.nodes) enteringKeys.add(n.data.morphKey);
      for (const g of arch.providerGroups) enteringKeys.add(g.id);
      for (const g of arch.regionGroups) enteringKeys.add(g.id);
    }

    useMorphStore.getState().beginMorph(Array.from(enteringKeys), Array.from(exitingKeys));
    window.setTimeout(() => useMorphStore.getState().finishMorph(), 700);

    const rng = mulberry32(0xc0ffee);
    const nodeStates: Record<string, NodeLiveState> = {};
    const edgeStates: Record<string, EdgeLiveState> = {};
    for (const n of arch.nodes) nodeStates[n.id] = seedNode(rng, n);
    for (const e of arch.edges) edgeStates[e.id] = seedEdge(rng, e);
    set({
      arch,
      archId: arch.id,
      nodeStates,
      edgeStates,
      tickNumber: 0,
      tickElapsedMs: 0,
      selectedNodeId: null,
      rng,
    });
  },

  start: () => set({ running: true }),
  pause: () => set({ running: false }),
  toggleRunning: () => set((s) => ({ running: !s.running })),
  selectNode: (id) => set({ selectedNodeId: id }),

  tick: () => {
    const state = get();
    const arch = state.arch;
    if (!arch) return;
    const rng = state.rng;
    const tickNumber = state.tickNumber + 1;
    const tickElapsedMs = state.tickElapsedMs + TICK_MS;

    const nodeStates: Record<string, NodeLiveState> = {};
    for (const n of arch.nodes) {
      const prev = state.nodeStates[n.id];
      if (!prev) continue;
      const metrics: Record<string, number> = {};
      const history: Record<string, number[]> = {};
      for (const m of n.data.metrics) {
        const v = jitter(rng, m.baseline, m.jitter, m.spikeChance);
        metrics[m.key] = v;
        const h = [...prev.history[m.key] ?? [], v];
        if (h.length > HISTORY_LEN) h.shift();
        history[m.key] = h;
      }
      const costSoFarToday = prev.costSoFarToday + n.data.cost.hourly * (TICK_MS / 3_600_000);
      let status = prev.status;
      let events = prev.events;
      if (chance(rng, 0.012)) {
        const pool = EVENT_SAMPLES[status];
        const evt = pick(rng, pool);
        events = [
          ...prev.events.slice(-4),
          { ts: makeEventTs(tickElapsedMs), type: evt.type, message: `${n.data.instanceId} ${evt.message}` },
        ];
      }
      if (status === "degraded" && chance(rng, 0.04)) status = "healthy";
      if (status === "healthy" && chance(rng, 0.02)) status = "degraded";
      nodeStates[n.id] = { metrics, costSoFarToday, status, history, events };
    }

    const edgeStates: Record<string, EdgeLiveState> = {};
    for (const e of arch.edges) {
      const prev = state.edgeStates[e.id];
      if (!prev) continue;
      const d = e.data;
      if (!d) continue;
      let status = prev.status;
      if (chance(rng, 0.01)) {
        status = status === "active" ? "degraded" : "active";
      }
      edgeStates[e.id] = { status };
    }

    set({ tickNumber, tickElapsedMs, nodeStates, edgeStates, rng });
  },
}));
