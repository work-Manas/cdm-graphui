import type { Edge, Node } from "@xyflow/react";

export type ProviderId = "aws" | "azure" | "gcp" | "nvidia";

export type Protocol = "HTTPS" | "HTTP" | "gRPC" | "TCP" | "TLS" | "SSH" | "AMQP" | "NFS";

export type PortSpec = {
  protocol: Protocol;
  port: number;
};

export type ServiceStatus = "healthy" | "degraded" | "down";

export type MetricKey =
  | "cpu"
  | "memory"
  | "requests"
  | "gpu"
  | "throughput"
  | "iops"
  | "storage_gb"
  | "queue_depth";

export type MetricSpec = {
  key: MetricKey;
  label: string;
  unit: string;
  baseline: number;
  jitter: number;
  spikeChance: number;
};

export type ServiceNodeData = {
  kind: "service";
  morphKey: string;
  provider: ProviderId;
  region: string;
  serviceName: string;
  instanceType: string;
  instanceId: string;
  az: string;
  iconKey: string;
  status: ServiceStatus;
  config: {
    ports: PortSpec[];
    securityGroup?: string;
    autoscaling?: { min: number; max: number; current: number };
    storageGb?: number;
  };
  cost: {
    hourly: number;
    monthly: number;
    breakdown: { label: string; amount: number }[];
  };
  uptime: {
    pct_30d: number;
  };
  metrics: MetricSpec[];
  minimal?: boolean;
};

export type EdgeStatus = "active" | "idle" | "degraded";

export type FlowEdgeData = {
  kind: "flow";
  ports: PortSpec[];
  status: EdgeStatus;
  throughput: number;
  label: string;
};

export type ProviderGroupData = {
  kind: "providerGroup";
  provider: ProviderId;
  label: string;
  serviceCount: number;
  regionCount: number;
};

export type RegionGroupData = {
  kind: "regionGroup";
  provider: ProviderId;
  region: string;
  azCount: number;
  serviceCount: number;
};

export type ServiceNode = Node<ServiceNodeData, "service">;
export type ProviderGroupNode = Node<ProviderGroupData, "providerGroup">;
export type RegionGroupNode = Node<RegionGroupData, "regionGroup">;
export type FlowEdge = Edge<FlowEdgeData, "flow">;

export type Architecture = {
  id: string;
  name: string;
  tagline: string;
  nodes: ServiceNode[];
  edges: FlowEdge[];
  providerGroups: ProviderGroupNode[];
  regionGroups: RegionGroupNode[];
};
