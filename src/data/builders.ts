import type {
  Architecture,
  FlowEdge,
  MetricKey,
  MetricSpec,
  ProviderGroupNode,
  RegionGroupNode,
  ServiceNode,
  ServiceNodeData,
  ServiceStatus,
} from "@/types/architecture";

let nodeSeq = 0;
let edgeSeq = 0;

type MetricInit = {
  key: MetricKey;
  label: string;
  unit: string;
  baseline: number;
  jitter: number;
  spikeChance?: number;
};

type ServiceInit = {
  morphKey: string;
  provider: ServiceNodeData["provider"];
  region: string;
  serviceKind: ServiceNodeData["serviceKind"];
  serviceName: string;
  instanceType: string;
  az: string;
  iconKey: string;
  status?: ServiceStatus;
  ports?: ServiceNodeData["config"]["ports"];
  securityGroup?: string;
  autoscaling?: ServiceNodeData["config"]["autoscaling"];
  storageGb?: number;
  hourly: number;
  monthly: number;
  breakdown: { label: string; amount: number }[];
  uptimePct: number;
  lastIncident?: string;
  metrics: MetricInit[];
};

export function emptyHistory(metrics: MetricSpec[]): Record<MetricKey, number[]> {
  const out = {} as Record<MetricKey, number[]>;
  for (const m of metrics) {
    out[m.key] = [];
  }
  return out;
}

export function makeServiceNode(init: ServiceInit): ServiceNode {
  const id = `svc-${++nodeSeq}`;
  const metrics: MetricSpec[] = init.metrics.map((m) => ({
    key: m.key,
    label: m.label,
    unit: m.unit,
    baseline: m.baseline,
    jitter: m.jitter,
    spikeChance: m.spikeChance ?? 0.04,
  }));
  return {
    id,
    type: "service",
    position: { x: 0, y: 0 },
    data: {
      kind: "service",
      morphKey: init.morphKey,
      provider: init.provider,
      region: init.region,
      serviceKind: init.serviceKind,
      serviceName: init.serviceName,
      instanceType: init.instanceType,
      instanceId: makeInstanceId(init.provider),
      az: init.az,
      iconKey: init.iconKey,
      status: init.status ?? "healthy",
      config: {
        ports: init.ports ?? [],
        securityGroup: init.securityGroup,
        autoscaling: init.autoscaling,
        storageGb: init.storageGb,
      },
      cost: {
        hourly: init.hourly,
        monthly: init.monthly,
        breakdown: init.breakdown,
      },
      uptime: {
        pct_30d: init.uptimePct,
        lastIncident: init.lastIncident ?? null,
      },
      metrics,
      costSoFarToday: 0,
      history: emptyHistory(metrics),
      events: [],
    },
  };
}

function makeInstanceId(provider: string): string {
  const prefix = provider === "aws" ? "i-" : provider === "azure" ? "az-" : provider === "gcp" ? "gcp-" : "gpu-";
  const hex = Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return `${prefix}${hex}`;
}

type EdgeInit = {
  source: string;
  target: string;
  ports?: ServiceNodeData["config"]["ports"];
  status?: "active" | "idle" | "degraded";
  throughput?: { current: number; peak: number };
  label?: string;
};

export function makeFlowEdge(init: EdgeInit): FlowEdge {
  return {
    id: `edge-${++edgeSeq}`,
    type: "flow",
    source: init.source,
    target: init.target,
    data: {
      kind: "flow",
      ports: init.ports ?? [],
      status: init.status ?? "active",
      throughput: init.throughput ?? { current: 0, peak: 0 },
      label: init.label ?? "",
    },
  };
}

export function makeProviderGroup(
  provider: ServiceNodeData["provider"],
  label: string,
  serviceCount: number,
  regionCount: number,
  position: { x: number; y: number },
): ProviderGroupNode {
  return {
    id: `grp-${provider}`,
    type: "providerGroup",
    position,
    data: { kind: "providerGroup", provider, label, serviceCount, regionCount },
  };
}

export function makeRegionGroup(
  provider: ServiceNodeData["provider"],
  region: string,
  azCount: number,
  serviceCount: number,
  position: { x: number; y: number },
): RegionGroupNode {
  return {
    id: `rgn-${provider}-${region}`,
    type: "regionGroup",
    parentId: `grp-${provider}`,
    position,
    data: { kind: "regionGroup", provider, region, azCount, serviceCount },
  };
}

export function collectArch(
  id: string,
  name: string,
  tagline: string,
  nodes: ServiceNode[],
  edges: FlowEdge[],
  providerGroups: ProviderGroupNode[],
  regionGroups: RegionGroupNode[],
): Architecture {
  return { id, name, tagline, nodes, edges, providerGroups, regionGroups };
}

export function resetSeq() {
  nodeSeq = 0;
  edgeSeq = 0;
}
