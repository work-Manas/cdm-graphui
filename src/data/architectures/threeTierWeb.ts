import { collectArch, makeFlowEdge, makeProviderGroup, makeRegionGroup, makeServiceNode } from "../builders";
import type { Architecture } from "@/types/architecture";

export function buildThreeTierWeb(): Architecture {
  const cloudfront = makeServiceNode({
    morphKey: "edge-cdn",
    provider: "aws",
    region: "us-east-1",
    serviceName: "CloudFront",
    instanceType: "global edge",
    az: "global",
    iconKey: "cloud",
    ports: [{ protocol: "HTTPS", port: 443 }],
    hourly: 0.085,
    monthly: 62.0,
    breakdown: [
      { label: "Data transfer out (1 TB)", amount: 85 },
      { label: "HTTPS requests (10M)", amount: 10 },
      { label: "Edge locations", amount: 0 },
    ],
    uptimePct: 99.99,
    metrics: [
      { key: "requests", label: "req/s", unit: "rps", baseline: 4200, jitter: 380 },
      { key: "throughput", label: "egress", unit: "Mbps", baseline: 96, jitter: 18 },
    ],
  });

  const alb = makeServiceNode({
    morphKey: "web-alb",
    provider: "aws",
    region: "us-east-1",
    serviceName: "ALB",
    instanceType: "application LB",
    az: "multi-az",
    iconKey: "network",
    ports: [{ protocol: "HTTPS", port: 443 }, { protocol: "HTTP", port: 80 }],
    securityGroup: "sg-web-prod-01",
    hourly: 0.025,
    monthly: 18.25,
    breakdown: [
      { label: "LCU-hours", amount: 12.5 },
      { label: "Base LB", amount: 5.75 },
    ],
    uptimePct: 99.97,
    metrics: [
      { key: "requests", label: "req/s", unit: "rps", baseline: 3800, jitter: 320 },
      { key: "throughput", label: "throughput", unit: "Mbps", baseline: 84, jitter: 12 },
    ],
  });

  const webA = makeServiceNode({
    morphKey: "web-asg-1",
    provider: "aws",
    region: "us-east-1",
    serviceName: "EC2 · t3.medium",
    instanceType: "t3.medium",
    az: "us-east-1a",
    iconKey: "cpu",
    ports: [{ protocol: "HTTP", port: 8080 }],
    securityGroup: "sg-web-prod-01",
    autoscaling: { min: 3, max: 12, current: 4 },
    hourly: 0.0416,
    monthly: 30.36,
    breakdown: [
      { label: "Compute (4 × t3.medium)", amount: 121.44 },
      { label: "EBS gp3 50GB", amount: 16.0 },
    ],
    uptimePct: 99.95,
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 38, jitter: 12, spikeChance: 0.08 },
      { key: "memory", label: "Mem", unit: "%", baseline: 52, jitter: 8 },
      { key: "requests", label: "req/s", unit: "rps", baseline: 950, jitter: 140 },
    ],
  });

  const webB = makeServiceNode({
    morphKey: "web-asg-2",
    provider: "aws",
    region: "us-east-1",
    serviceName: "EC2 · t3.medium",
    instanceType: "t3.medium",
    az: "us-east-1b",
    iconKey: "cpu",
    ports: [{ protocol: "HTTP", port: 8080 }],
    securityGroup: "sg-web-prod-01",
    autoscaling: { min: 3, max: 12, current: 4 },
    hourly: 0.0416,
    monthly: 30.36,
    breakdown: [
      { label: "Compute (4 × t3.medium)", amount: 121.44 },
      { label: "EBS gp3 50GB", amount: 16.0 },
    ],
    uptimePct: 99.95,
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 41, jitter: 11, spikeChance: 0.06 },
      { key: "memory", label: "Mem", unit: "%", baseline: 49, jitter: 7 },
      { key: "requests", label: "req/s", unit: "rps", baseline: 910, jitter: 150 },
    ],
  });

  const webC = makeServiceNode({
    morphKey: "web-asg-3",
    provider: "aws",
    region: "us-east-1",
    serviceName: "EC2 · t3.medium",
    instanceType: "t3.medium",
    az: "us-east-1c",
    iconKey: "cpu",
    ports: [{ protocol: "HTTP", port: 8080 }],
    securityGroup: "sg-web-prod-01",
    autoscaling: { min: 3, max: 12, current: 4 },
    hourly: 0.0416,
    monthly: 30.36,
    breakdown: [
      { label: "Compute (4 × t3.medium)", amount: 121.44 },
      { label: "EBS gp3 50GB", amount: 16.0 },
    ],
    uptimePct: 99.96,
    status: "degraded",
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 71, jitter: 18, spikeChance: 0.12 },
      { key: "memory", label: "Mem", unit: "%", baseline: 68, jitter: 10 },
      { key: "requests", label: "req/s", unit: "rps", baseline: 600, jitter: 200 },
    ],
  });

  const aurora = makeServiceNode({
    morphKey: "db-aurora-writer",
    provider: "aws",
    region: "us-east-1",
    serviceName: "Aurora PostgreSQL writer",
    instanceType: "db.r6g.large",
    az: "us-east-1a",
    iconKey: "database",
    ports: [{ protocol: "TCP", port: 5432 }],
    securityGroup: "sg-db-prod-01",
    hourly: 0.201,
    monthly: 146.7,
    breakdown: [
      { label: "db.r6g.large writer", amount: 146.7 },
      { label: "Storage (200GB)", amount: 23.0 },
    ],
    uptimePct: 99.99,
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 28, jitter: 9 },
      { key: "iops", label: "IOPS", unit: "k/s", baseline: 9.8, jitter: 1.4 },
      { key: "throughput", label: "Throughput", unit: "Mbps", baseline: 18, jitter: 3 },
    ],
  });

  const auroraReader = makeServiceNode({
    morphKey: "db-aurora-reader",
    provider: "aws",
    region: "us-east-1",
    serviceName: "Aurora PostgreSQL reader",
    instanceType: "db.r6g.large",
    az: "us-east-1b",
    iconKey: "database",
    ports: [{ protocol: "TCP", port: 5432 }],
    securityGroup: "sg-db-prod-01",
    hourly: 0.201,
    monthly: 146.7,
    breakdown: [
      { label: "db.r6g.large reader", amount: 146.7 },
      { label: "Storage (200GB)", amount: 23.0 },
    ],
    uptimePct: 99.99,
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 18, jitter: 6 },
      { key: "iops", label: "IOPS", unit: "k/s", baseline: 6.2, jitter: 0.9 },
      { key: "throughput", label: "Throughput", unit: "Mbps", baseline: 11, jitter: 2 },
    ],
  });

  const redis = makeServiceNode({
    morphKey: "cache-redis",
    provider: "aws",
    region: "us-east-1",
    serviceName: "ElastiCache Redis",
    instanceType: "cache.r6g.large",
    az: "us-east-1a",
    iconKey: "stack",
    ports: [{ protocol: "TCP", port: 6379 }],
    securityGroup: "sg-cache-prod-01",
    hourly: 0.182,
    monthly: 132.86,
    breakdown: [
      { label: "cache.r6g.large", amount: 132.86 },
      { label: "Multi-AZ", amount: 0 },
    ],
    uptimePct: 99.95,
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 22, jitter: 7 },
      { key: "memory", label: "Mem", unit: "%", baseline: 47, jitter: 4 },
      { key: "throughput", label: "Ops/s", unit: "k/s", baseline: 14.3, jitter: 2.1 },
    ],
  });

  const s3 = makeServiceNode({
    morphKey: "storage-s3",
    provider: "aws",
    region: "us-east-1",
    serviceName: "S3 Standard",
    instanceType: "object storage",
    az: "regional",
    iconKey: "harddrives",
    storageGb: 1500,
    hourly: 0.005,
    monthly: 34.5,
    breakdown: [
      { label: "Storage (1.5 TB)", amount: 34.5 },
      { label: "PUT/GET (100M)", amount: 0.05 },
    ],
    uptimePct: 99.999999999,
    metrics: [
      { key: "storage_gb", label: "Used", unit: "GB", baseline: 1500, jitter: 4 },
      { key: "requests", label: "req/s", unit: "rps", baseline: 240, jitter: 80 },
    ],
  });

  const nodes = [cloudfront, alb, webA, webB, webC, aurora, auroraReader, redis, s3];

  const edges = [
    makeFlowEdge({
      source: cloudfront.id,
      target: alb.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "HTTPS :443",
      throughput: 820,
      status: "active",
    }),
    makeFlowEdge({
      source: alb.id,
      target: webA.id,
      ports: [{ protocol: "HTTP", port: 8080 }],
      label: "HTTP :8080",
      throughput: 280,
      status: "active",
    }),
    makeFlowEdge({
      source: alb.id,
      target: webB.id,
      ports: [{ protocol: "HTTP", port: 8080 }],
      label: "HTTP :8080",
      throughput: 290,
      status: "active",
    }),
    makeFlowEdge({
      source: alb.id,
      target: webC.id,
      ports: [{ protocol: "HTTP", port: 8080 }],
      label: "HTTP :8080",
      throughput: 180,
      status: "degraded",
    }),
    makeFlowEdge({
      source: webA.id,
      target: redis.id,
      ports: [{ protocol: "TCP", port: 6379 }],
      label: "TCP :6379",
      throughput: 320,
      status: "active",
    }),
    makeFlowEdge({
      source: webB.id,
      target: redis.id,
      ports: [{ protocol: "TCP", port: 6379 }],
      label: "TCP :6379",
      throughput: 295,
      status: "active",
    }),
    makeFlowEdge({
      source: webC.id,
      target: redis.id,
      ports: [{ protocol: "TCP", port: 6379 }],
      label: "TCP :6379",
      throughput: 95,
      status: "degraded",
    }),
    makeFlowEdge({
      source: webA.id,
      target: aurora.id,
      ports: [{ protocol: "TCP", port: 5432 }],
      label: "TCP :5432",
      throughput: 410,
      status: "active",
    }),
    makeFlowEdge({
      source: webB.id,
      target: auroraReader.id,
      ports: [{ protocol: "TCP", port: 5432 }],
      label: "TCP :5432",
      throughput: 380,
      status: "active",
    }),
    makeFlowEdge({
      source: webC.id,
      target: auroraReader.id,
      ports: [{ protocol: "TCP", port: 5432 }],
      label: "TCP :5432",
      throughput: 140,
      status: "degraded",
    }),
    makeFlowEdge({
      source: aurora.id,
      target: auroraReader.id,
      ports: [{ protocol: "TCP", port: 5432 }],
      label: "Replication :5432",
      throughput: 60,
      status: "active",
    }),
    makeFlowEdge({
      source: cloudfront.id,
      target: s3.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "Origin :443",
      throughput: 42,
      status: "active",
    }),
    makeFlowEdge({
      source: webA.id,
      target: s3.id,
      ports: [{ protocol: "HTTPS", port: 443 }],
      label: "S3 API :443",
      throughput: 18,
      status: "idle",
    }),
  ];

  const providerGroups = [
    makeProviderGroup("aws", "AWS", 9, 1, { x: 0, y: 0 }),
  ];

  const regionGroups = [
    makeRegionGroup("aws", "us-east-1", 3, 9, { x: 40, y: 60 }),
  ];

  return collectArch(
    "three-tier-web",
    "3-tier Web App",
    "Classic ALB + EC2 ASG + Aurora + Redis + S3",
    nodes,
    edges,
    providerGroups,
    regionGroups,
  );
}
