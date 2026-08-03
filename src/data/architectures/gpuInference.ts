import { collectArch, makeFlowEdge, makeProviderGroup, makeRegionGroup, makeServiceNode } from "../builders";
import type { Architecture } from "@/types/architecture";

export function buildGpuInference(): Architecture {
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
    hourly: 0.22,
    monthly: 160.6,
    breakdown: [
      { label: "Requests (60M)", amount: 105 },
      { label: "Cache", amount: 18 },
      { label: "Base endpoint", amount: 37.6 },
    ],
    uptimePct: 99.95,
    metrics: [
      { key: "requests", label: "req/s", unit: "rps", baseline: 6200, jitter: 520 },
      { key: "throughput", label: "throughput", unit: "Mbps", baseline: 88, jitter: 13 },
    ],
  });

  const sqs = makeServiceNode({
    morphKey: "queue-sqs",
    provider: "aws",
    region: "us-east-1",
    serviceName: "SQS · inference-queue",
    instanceType: "FIFO",
    az: "regional",
    iconKey: "queue",
    ports: [{ protocol: "HTTPS", port: 443 }],
    securityGroup: "sg-sqs-prod",
    hourly: 0.008,
    monthly: 5.84,
    breakdown: [
      { label: "Requests (10M)", amount: 4.4 },
      { label: "Storage", amount: 1.44 },
    ],
    uptimePct: 99.95,
    metrics: [
      { key: "queue_depth", label: "Depth", unit: "msg", baseline: 140, jitter: 38, spikeChance: 0.06 },
      { key: "throughput", label: "Sent/s", unit: "msg/s", baseline: 28, jitter: 6 },
    ],
  });

  const h100A = makeServiceNode({
    morphKey: "gpu-h100-a",
    provider: "nvidia",
    region: "us-east",
    serviceName: "SkyPilot · H100 80GB",
    instanceType: "H100 80GB · 8 vCPU",
    az: "us-east-pool-a",
    iconKey: "gpu",
    ports: [{ protocol: "gRPC", port: 8470 }],
    securityGroup: "sg-gpu-inference",
    hourly: 2.39,
    monthly: 1743.6,
    breakdown: [
      { label: "GPU compute hour", amount: 1743.6 },
      { label: "Container registry", amount: 12 },
    ],
    uptimePct: 99.9,
    metrics: [
      { key: "gpu", label: "GPU", unit: "%", baseline: 78, jitter: 14, spikeChance: 0.1 },
      { key: "memory", label: "VRAM", unit: "%", baseline: 64, jitter: 6 },
      { key: "requests", label: "inferences/s", unit: "inf/s", baseline: 42, jitter: 8 },
    ],
  });

  const h100B = makeServiceNode({
    morphKey: "gpu-h100-b",
    provider: "nvidia",
    region: "us-east",
    serviceName: "SkyPilot · H100 80GB",
    instanceType: "H100 80GB · 8 vCPU",
    az: "us-east-pool-b",
    iconKey: "gpu",
    ports: [{ protocol: "gRPC", port: 8470 }],
    securityGroup: "sg-gpu-inference",
    hourly: 2.39,
    monthly: 1743.6,
    breakdown: [
      { label: "GPU compute hour", amount: 1743.6 },
      { label: "Container registry", amount: 12 },
    ],
    uptimePct: 99.9,
    status: "degraded",
    metrics: [
      { key: "gpu", label: "GPU", unit: "%", baseline: 92, jitter: 6, spikeChance: 0.18 },
      { key: "memory", label: "VRAM", unit: "%", baseline: 89, jitter: 4 },
      { key: "requests", label: "inferences/s", unit: "inf/s", baseline: 35, jitter: 12 },
    ],
  });

  const s3 = makeServiceNode({
    morphKey: "storage-s3",
    provider: "aws",
    region: "us-east-1",
    serviceName: "S3 · model artifacts",
    instanceType: "object storage",
    az: "regional",
    iconKey: "harddrives",
    storageGb: 980,
    hourly: 0.022,
    monthly: 22.54,
    breakdown: [
      { label: "Storage (980 GB)", amount: 22.54 },
      { label: "GET (20M)", amount: 0.1 },
    ],
    uptimePct: 99.999999999,
    metrics: [
      { key: "storage_gb", label: "Used", unit: "GB", baseline: 980, jitter: 2 },
      { key: "requests", label: "req/s", unit: "rps", baseline: 180, jitter: 60 },
    ],
  });

  const ddb = makeServiceNode({
    morphKey: "db-ddb-cache",
    provider: "aws",
    region: "us-east-1",
    serviceName: "DynamoDB · inference cache",
    instanceType: "on-demand",
    az: "regional",
    iconKey: "database",
    ports: [{ protocol: "HTTPS", port: 443 }],
    securityGroup: "sg-ddb-prod",
    hourly: 0.046,
    monthly: 33.58,
    breakdown: [
      { label: "Write (8M)", amount: 12.4 },
      { label: "Read (40M)", amount: 6.2 },
    ],
    uptimePct: 99.99,
    metrics: [
      { key: "requests", label: "req/s", unit: "rps", baseline: 540, jitter: 90 },
      { key: "throughput", label: "Throughput", unit: "Mbps", baseline: 22, jitter: 4 },
    ],
  });

  const nodes = [apiGw, sqs, h100A, h100B, s3, ddb];

  const edges = [
    makeFlowEdge({
      source: apiGw.id,
      target: sqs.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Enqueue :443",
      throughput: 720,
      status: "active",
    }),
    makeFlowEdge({
      source: apiGw.id,
      target: h100A.id,
      ports: [{ protocol: "gRPC", port: 8470 }],
      label: "gRPC :8470 (sync)",
      throughput: 320,
      status: "active",
    }),
    makeFlowEdge({
      source: apiGw.id,
      target: h100B.id,
      ports: [{ protocol: "gRPC", port: 8470 }],
      label: "gRPC :8470 (sync)",
      throughput: 240,
      status: "degraded",
    }),
    makeFlowEdge({
      source: sqs.id,
      target: h100A.id,
      ports: [{ protocol: "gRPC", port: 8470 }],
      label: "Async dequeue",
      throughput: 280,
      status: "active",
    }),
    makeFlowEdge({
      source: sqs.id,
      target: h100B.id,
      ports: [{ protocol: "gRPC", port: 8470 }],
      label: "Async dequeue",
      throughput: 180,
      status: "degraded",
    }),
    makeFlowEdge({
      source: h100A.id,
      target: s3.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Pull weights :443",
      throughput: 12,
      status: "idle",
    }),
    makeFlowEdge({
      source: h100B.id,
      target: s3.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Pull weights :443",
      throughput: 8,
      status: "idle",
    }),
    makeFlowEdge({
      source: h100A.id,
      target: ddb.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Cache write",
      throughput: 240,
      status: "active",
    }),
    makeFlowEdge({
      source: h100B.id,
      target: ddb.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Cache write",
      throughput: 140,
      status: "degraded",
    }),
  ];

  const providerGroups = [
    makeProviderGroup("aws", "AWS", 4, 1, { x: 0, y: 0 }),
    makeProviderGroup("nvidia", "NVIDIA (via SkyPilot)", 2, 1, { x: 460, y: 0 }),
  ];

  const regionGroups = [
    makeRegionGroup("aws", "us-east-1", 3, 4, { x: 40, y: 60 }),
    makeRegionGroup("nvidia", "us-east", 1, 2, { x: 40, y: 60 }),
  ];

  return collectArch(
    "gpu-inference",
    "GPU Inference",
    "API GW + SQS + SkyPilot H100 + S3 + DynamoDB cache",
    nodes,
    edges,
    providerGroups,
    regionGroups,
  );
}
