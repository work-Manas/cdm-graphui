import { collectArch, makeFlowEdge, makeProviderGroup, makeRegionGroup, makeServiceNode } from "../builders";
import type { Architecture } from "@/types/architecture";

export function buildHybridMulti(): Architecture {
  const frontDoor = makeServiceNode({
    morphKey: "edge-frontdoor",
    provider: "azure",
    region: "eastus",
    serviceName: "Front Door",
    instanceType: "AFD Premium",
    az: "global",
    iconKey: "cloud",
    ports: [{ protocol: "HTTPS", port: 443 }],
    hourly: 0.31,
    monthly: 226.3,
    breakdown: [
      { label: "Outbound data (1 TB)", amount: 87 },
      { label: "Routing rules", amount: 120 },
      { label: "Web Application Firewall", amount: 19.3 },
    ],
    uptimePct: 99.99,
    metrics: [
      { key: "requests", label: "req/s", unit: "rps", baseline: 5400, jitter: 420 },
      { key: "throughput", label: "egress", unit: "Mbps", baseline: 112, jitter: 22 },
    ],
  });

  const apiGw = makeServiceNode({
    morphKey: "edge-apigw",
    provider: "aws",
    region: "us-east-1",
    serviceName: "API Gateway",
    instanceType: "REST + HTTP",
    az: "regional",
    iconKey: "network",
    ports: [{ protocol: "HTTPS", port: 443 }],
    securityGroup: "sg-api-prod-01",
    hourly: 0.18,
    monthly: 131.4,
    breakdown: [
      { label: "Request count (40M)", amount: 70 },
      { label: "Cache (0.5 GB)", amount: 13 },
      { label: "Base endpoint", amount: 48.4 },
    ],
    uptimePct: 99.95,
    metrics: [
      { key: "requests", label: "req/s", unit: "rps", baseline: 4900, jitter: 380 },
      { key: "throughput", label: "throughput", unit: "Mbps", baseline: 78, jitter: 11 },
    ],
  });

  const lambdaOrder = makeServiceNode({
    morphKey: "fn-order",
    provider: "aws",
    region: "us-east-1",
    serviceName: "Lambda · order-svc",
    instanceType: "256MB · 1s",
    az: "regional",
    iconKey: "function",
    ports: [{ protocol: "HTTPS", port: 443 }],
    securityGroup: "sg-lambda-order",
    hourly: 0.024,
    monthly: 17.5,
    breakdown: [
      { label: "Invocations (40M)", amount: 8 },
      { label: "Compute (GB-s)", amount: 9.5 },
    ],
    uptimePct: 99.97,
    metrics: [
      { key: "requests", label: "inv/s", unit: "rps", baseline: 1700, jitter: 240 },
      { key: "cpu", label: "Duration", unit: "ms", baseline: 380, jitter: 60 },
    ],
  });

  const cloudRunUser = makeServiceNode({
    morphKey: "fn-user-cr",
    provider: "gcp",
    region: "us-central1",
    serviceName: "Cloud Run · user-svc",
    instanceType: "1 vCPU · 512MB",
    az: "regional",
    iconKey: "container",
    ports: [{ protocol: "HTTPS", port: 443 }],
    hourly: 0.039,
    monthly: 28.5,
    breakdown: [
      { label: "vCPU-seconds (1.4M)", amount: 18.2 },
      { label: "Memory GiB-seconds", amount: 10.3 },
    ],
    uptimePct: 99.95,
    metrics: [
      { key: "requests", label: "req/s", unit: "rps", baseline: 1400, jitter: 180 },
      { key: "cpu", label: "CPU", unit: "%", baseline: 34, jitter: 11 },
    ],
  });

  const aurora = makeServiceNode({
    morphKey: "db-aurora-writer",
    provider: "aws",
    region: "us-east-1",
    serviceName: "Aurora PostgreSQL",
    instanceType: "db.r6g.xlarge",
    az: "us-east-1a",
    iconKey: "database",
    ports: [{ protocol: "TCP", port: 5432 }],
    securityGroup: "sg-db-prod-01",
    hourly: 0.402,
    monthly: 293.4,
    breakdown: [
      { label: "db.r6g.xlarge writer", amount: 293.4 },
      { label: "Storage (400 GB)", amount: 46 },
    ],
    uptimePct: 99.99,
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 41, jitter: 12 },
      { key: "iops", label: "IOPS", unit: "k/s", baseline: 11.2, jitter: 1.6 },
    ],
  });

  const cosmos = makeServiceNode({
    morphKey: "db-cosmos",
    provider: "azure",
    region: "eastus",
    serviceName: "CosmosDB · sessions",
    instanceType: "4000 RU/s",
    az: "eastus-1",
    iconKey: "database",
    ports: [{ protocol: "HTTPS", port: 443 }],
    hourly: 0.064,
    monthly: 46.72,
    breakdown: [
      { label: "RU/s provisioned", amount: 32 },
      { label: "Storage (50 GB)", amount: 14.72 },
    ],
    uptimePct: 99.999,
    metrics: [
      { key: "requests", label: "RU/s", unit: "ru/s", baseline: 3200, jitter: 480 },
      { key: "throughput", label: "Throughput", unit: "Mbps", baseline: 14, jitter: 3 },
    ],
  });

  const nodes = [frontDoor, apiGw, lambdaOrder, cloudRunUser, aurora, cosmos];

  const edges = [
    makeFlowEdge({
      source: frontDoor.id,
      target: apiGw.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Cross-cloud HTTPS",
      throughput: 880,
      status: "active",
    }),
    makeFlowEdge({
      source: apiGw.id,
      target: lambdaOrder.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Invoke :443",
      throughput: 420,
      status: "active",
    }),
    makeFlowEdge({
      source: apiGw.id,
      target: cloudRunUser.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Cross-cloud invoke",
      throughput: 360,
      status: "active",
    }),
    makeFlowEdge({
      source: lambdaOrder.id,
      target: aurora.id,
      ports: [{ protocol: "TCP", port: 5432 }],
      label: "PG :5432 (Direct Connect)",
      throughput: 290,
      status: "active",
    }),
    makeFlowEdge({
      source: cloudRunUser.id,
      target: cosmos.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "HTTPS :443",
      throughput: 410,
      status: "active",
    }),
    makeFlowEdge({
      source: aurora.id,
      target: cosmos.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "VNet-gateway (private link)",
      throughput: 95,
      status: "idle",
    }),
  ];

  const providerGroups = [
    makeProviderGroup("azure", "Azure", 2, 1, { x: 0, y: 0 }),
    makeProviderGroup("aws", "AWS", 3, 1, { x: 460, y: 0 }),
    makeProviderGroup("gcp", "GCP", 1, 1, { x: 920, y: 0 }),
  ];

  const regionGroups = [
    makeRegionGroup("azure", "eastus", 3, 2, { x: 40, y: 60 }),
    makeRegionGroup("aws", "us-east-1", 3, 3, { x: 40, y: 60 }),
    makeRegionGroup("gcp", "us-central1", 1, 1, { x: 40, y: 60 }),
  ];

  return collectArch(
    "hybrid-multi",
    "Hybrid Multi-Cloud",
    "Front Door + API GW + Lambda + Cloud Run + Aurora + CosmosDB",
    nodes,
    edges,
    providerGroups,
    regionGroups,
  );
}
