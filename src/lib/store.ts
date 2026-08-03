"use client";

import { create } from "zustand";
import type { Architecture, AutoscalingPolicy, FlowEdge, ServiceNode, ServiceStatus } from "@/types/architecture";
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
  autoscalingActivity: string;
  autoscalingWorkload: number;
  rng: RNG;
  setArch: (arch: Architecture) => void;
  start: () => void;
  pause: () => void;
  restart: () => void;
  toggleRunning: () => void;
  selectNode: (id: string | null) => void;
  updateAutoscalingPolicy: (policy: Partial<AutoscalingPolicy>) => void;
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

const AUTOSCALING_CYCLE_TICKS = 40;

function workloadAt(tick: number): number {
  const phase = tick % AUTOSCALING_CYCLE_TICKS;
  if (phase < 10) return 1200;
  if (phase < 18) return 4200;
  if (phase < 23) return 2200;
  if (phase < 31) return 5200;
  return 700;
}

function makeAutoscalingNode(arch: Architecture, slot: number, current: number): ServiceNode {
  const simulation = arch.simulation;
  if (!simulation || simulation.kind !== "ec2-autoscaling") throw new Error("Autoscaling simulation is not configured");
  const id = simulation.dynamicSlotIds[slot];
  const template = simulation.template;
  return {
    id,
    type: "service",
    position: { x: 0, y: 0 },
    data: {
      ...template,
      morphKey: id,
      serviceName: `EC2 web ${slot + 1}`,
      instanceId: `i-asg${String(slot + 1).padStart(5, "0")}`,
      az: `us-east-1${["a", "b", "c"][slot % 3]}`,
      config: { ...template.config, autoscaling: { min: simulation.policy.min, max: simulation.policy.max, current } },
    },
  };
}

function makeAutoscalingEdges(arch: Architecture, nodes: ServiceNode[]): FlowEdge[] {
  const simulation = arch.simulation;
  if (!simulation || simulation.kind !== "ec2-autoscaling") return [];
  const databaseId = simulation.baseNodeIds[simulation.baseNodeIds.length - 1];
  if (!databaseId) return [];
  const trafficEdge = arch.edges.find((edge) => edge.id === "asg-traffic-alb");
  return [
    ...(trafficEdge ? [trafficEdge] : []),
    ...nodes.flatMap((node) => [
      {
        id: `asg-alb-${node.id}`,
        type: "flow" as const,
        source: simulation.ingressNodeId,
        target: node.id,
        data: { kind: "flow" as const, ports: [{ protocol: "HTTP" as const, port: 8080 }], status: "active" as const, throughput: 600, label: "target group" },
      },
      {
        id: `${node.id}-db`,
        type: "flow" as const,
        source: node.id,
        target: databaseId,
        data: { kind: "flow" as const, ports: [{ protocol: "TCP" as const, port: 5432 }], status: "active" as const, throughput: 180, label: "queries" },
      },
    ]),
  ];
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
  autoscalingActivity: "Waiting for workload",
  autoscalingWorkload: 0,
  rng: mulberry32(0xc0ffee),

  setArch: (arch) => {
    arch = {
      ...arch,
      nodes: Array.isArray(arch.nodes) ? arch.nodes : [],
      edges: Array.isArray(arch.edges) ? arch.edges.filter((edge) => edge?.source && edge?.target) : [],
      providerGroups: Array.isArray(arch.providerGroups) ? arch.providerGroups : [],
      regionGroups: Array.isArray(arch.regionGroups) ? arch.regionGroups : [],
    };
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
      autoscalingActivity: arch.simulation ? "Minimum capacity ready" : "Waiting for workload",
      autoscalingWorkload: arch.simulation ? workloadAt(0) : 0,
      rng,
    });
  },

  start: () => set({ running: true }),
  pause: () => set({ running: false }),
  restart: () => {
    let arch = get().arch;
    if (arch) {
      if (arch.simulation?.kind === "ec2-autoscaling") {
        const dynamicNodes = Array.from({ length: arch.simulation.policy.min }, (_, index) => makeAutoscalingNode(arch!, index, arch!.simulation!.policy.min));
        const baseNodes = arch.nodes.filter((node) => arch!.simulation!.baseNodeIds.includes(node.id));
        arch = { ...arch, nodes: [...baseNodes.slice(0, 2), ...dynamicNodes, ...baseNodes.slice(2)], edges: makeAutoscalingEdges(arch, dynamicNodes) };
      }
      get().setArch(arch);
      set({ running: true });
    }
  },
  toggleRunning: () => set((s) => ({ running: !s.running })),
  selectNode: (id) => set({ selectedNodeId: id }),
  updateAutoscalingPolicy: (patch) => set((state) => {
    const arch = state.arch;
    if (!arch?.simulation) return state;
    const policy = { ...arch.simulation.policy, ...patch };
    policy.min = Math.max(1, Math.min(Number.isFinite(policy.min) ? policy.min : 1, policy.max));
    policy.max = Math.max(policy.min, Math.min(Number.isFinite(policy.max) ? policy.max : policy.min, arch.simulation.dynamicSlotIds.length));
    policy.targetCpu = Math.max(10, Math.min(Number.isFinite(policy.targetCpu) ? policy.targetCpu : 50, 90));
    policy.cooldownTicks = Math.max(0, Number.isFinite(policy.cooldownTicks) ? policy.cooldownTicks : 0);
    policy.warmupTicks = Math.max(0, Number.isFinite(policy.warmupTicks) ? policy.warmupTicks : 0);
    return { arch: { ...arch, simulation: { ...arch.simulation, policy } } };
  }),

  tick: () => {
    const state = get();
    let arch = state.arch;
    if (!arch) return;
    const rng = state.rng;
    const tickNumber = state.tickNumber + 1;
    const tickElapsedMs = state.tickElapsedMs + TICK_MS;

    let autoscalingActivity = state.autoscalingActivity;
    let autoscalingWorkload = state.autoscalingWorkload;
    let seededNodeStates = state.nodeStates;
    let seededEdgeStates = state.edgeStates;
    if (arch.simulation?.kind === "ec2-autoscaling") {
      const simulation = arch.simulation;
      const policy = simulation.policy;
      const phase = tickNumber % AUTOSCALING_CYCLE_TICKS;
      autoscalingWorkload = workloadAt(tickNumber);
      const active = arch.nodes.filter((node) => simulation.dynamicSlotIds.includes(node.id) && !node.data.retiring);
      const cpu = Math.min(100, autoscalingWorkload / Math.max(active.length * 12, 1));
      const scheduled = policy.scheduled.find((action) => action.tick === phase);
      const predictive = policy.predictive.find((action) => action.tick === phase);
      const lastScaleTick = Number(autoscalingActivity.match(/@([0-9]+)$/)?.[1] ?? -999);
      const cooldownReady = tickNumber - lastScaleTick > Math.max(policy.cooldownTicks, policy.warmupTicks);
      let desired = active.length;
      let reason = "";

      if (scheduled) {
        desired = scheduled.desired;
        reason = `Scheduled: ${scheduled.label}`;
      } else if (predictive) {
        desired = predictive.desired;
        reason = `Predictive: ${predictive.label}`;
      } else if (cooldownReady && cpu > policy.targetCpu * 1.1) {
        desired = Math.ceil(active.length * cpu / policy.targetCpu);
        reason = `Reactive: CPU ${cpu.toFixed(0)}% above ${policy.targetCpu}% target`;
      } else if (cooldownReady && cpu < policy.targetCpu * 0.65) {
        desired = Math.floor(active.length * cpu / policy.targetCpu);
        reason = `Reactive: CPU ${cpu.toFixed(0)}% below ${policy.targetCpu}% target`;
      }
      desired = Math.max(policy.min, Math.min(policy.max, desired));

      if (desired !== active.length) {
        const dynamicNodes = Array.from({ length: desired }, (_, index) =>
          active.find((node) => node.id === simulation.dynamicSlotIds[index]) ?? makeAutoscalingNode(arch!, index, desired),
        ).map((node) => ({
          ...node,
          data: { ...node.data, config: { ...node.data.config, autoscaling: { min: policy.min, max: policy.max, current: desired } } },
        }));
        const baseNodes = arch.nodes.filter((node) => simulation.baseNodeIds.includes(node.id));
        const nextEdges = makeAutoscalingEdges(arch, dynamicNodes);
        const entering = dynamicNodes.filter((node) => !active.some((old) => old.id === node.id));
        const exiting = active.filter((node) => !dynamicNodes.some((next) => next.id === node.id));
        const retiring = exiting.map((node) => ({ ...node, data: { ...node.data, retiring: true } }));
        const nextNodes = [...baseNodes.slice(0, 2), ...dynamicNodes, ...retiring, ...baseNodes.slice(2)];
        const exitingIds = new Set(exiting.map((node) => node.id));
        const displayEdges = [...nextEdges, ...arch.edges.filter((edge) =>
          (exitingIds.has(edge.source) || exitingIds.has(edge.target)) && !nextEdges.some((next) => next.id === edge.id),
        )];
        useMorphStore.getState().beginMorph(entering.map((node) => node.data.morphKey), exiting.map((node) => node.data.morphKey));
        window.setTimeout(() => {
          set((current) => {
            const currentArch = current.arch;
            if (!currentArch || currentArch.id !== arch?.id) return {};
            const nodeStates = { ...current.nodeStates };
            const edgeStates = { ...current.edgeStates };
            for (const id of exitingIds) delete nodeStates[id];
            for (const edge of displayEdges) {
              if (exitingIds.has(edge.source) || exitingIds.has(edge.target)) delete edgeStates[edge.id];
            }
            return {
              arch: { ...currentArch, nodes: currentArch.nodes.filter((node) => !exitingIds.has(node.id)), edges: currentArch.edges.filter((edge) => !exitingIds.has(edge.source) && !exitingIds.has(edge.target)) },
              nodeStates,
              edgeStates,
              selectedNodeId: current.selectedNodeId && exitingIds.has(current.selectedNodeId) ? null : current.selectedNodeId,
            };
          });
          useMorphStore.getState().finishMorph();
        }, 500);
        seededNodeStates = { ...state.nodeStates };
        for (const node of entering) seededNodeStates[node.id] = seedNode(rng, node);
        seededEdgeStates = {};
        for (const edge of displayEdges) seededEdgeStates[edge.id] = state.edgeStates[edge.id] ?? seedEdge(rng, edge);
        arch = { ...arch, nodes: nextNodes, edges: displayEdges };
        autoscalingActivity = `${reason}; ${active.length} -> ${desired} @${tickNumber}`;
      } else if (reason) {
        autoscalingActivity = `${reason}; capacity remains ${active.length} @${tickNumber}`;
      }
    }

    const nodeStates: Record<string, NodeLiveState> = {};
    for (const n of arch.nodes) {
      const prev = seededNodeStates[n.id];
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

    if (arch.simulation) {
      const activeIds = arch.nodes
        .filter((node) => arch!.simulation!.dynamicSlotIds.includes(node.id) && !node.data.retiring)
        .map((node) => node.id);
      const cpu = Math.min(100, autoscalingWorkload / Math.max(activeIds.length * 12, 1));
      const requests = autoscalingWorkload / Math.max(activeIds.length, 1);
      for (const id of activeIds) {
        if (!nodeStates[id]) continue;
        nodeStates[id].metrics.cpu = cpu;
        nodeStates[id].metrics.requests = requests;
        nodeStates[id].history.cpu = [...(nodeStates[id].history.cpu ?? []).slice(1), cpu];
        nodeStates[id].history.requests = [...(nodeStates[id].history.requests ?? []).slice(1), requests];
      }
      for (const id of ["asg-traffic", arch.simulation.ingressNodeId]) {
        if (!nodeStates[id]) continue;
        nodeStates[id].metrics.requests = autoscalingWorkload;
        nodeStates[id].history.requests = [...nodeStates[id].history.requests.slice(1), autoscalingWorkload];
      }
      if (autoscalingActivity !== state.autoscalingActivity) {
        const controller = nodeStates[arch.simulation.ingressNodeId];
        if (controller) controller.events = [...controller.events.slice(-4), { ts: makeEventTs(tickElapsedMs), type: "autoscaling", message: autoscalingActivity.replace(/ @[0-9]+$/, "") }];
      }
    }

    const edgeStates: Record<string, EdgeLiveState> = {};
    for (const e of arch.edges) {
      const prev = seededEdgeStates[e.id];
      if (!prev) continue;
      const d = e.data;
      if (!d) continue;
      let status = prev.status;
      if (chance(rng, 0.01)) {
        status = status === "active" ? "degraded" : "active";
      }
      edgeStates[e.id] = { status };
    }

    set({ arch, tickNumber, tickElapsedMs, nodeStates, edgeStates, rng, autoscalingActivity, autoscalingWorkload });
  },
}));
