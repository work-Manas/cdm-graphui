import { collectArch, makeFlowEdge, makeProviderGroup, makeRegionGroup, makeServiceNode } from "../builders";
import type { Architecture, ServiceNodeData } from "@/types/architecture";

const SLOT_IDS = Array.from({ length: 8 }, (_, index) => `asg-instance-${index + 1}`);

function makeInstance(slot: number, current: number) {
  return makeServiceNode({
    id: SLOT_IDS[slot - 1],
    instanceId: `i-asg${String(slot).padStart(5, "0")}`,
    morphKey: SLOT_IDS[slot - 1],
    provider: "aws",
    region: "us-east-1",
    serviceName: `EC2 web ${slot}`,
    instanceType: "m7i.large",
    az: `us-east-1${["a", "b", "c"][(slot - 1) % 3]}`,
    iconKey: "cpu",
    ports: [{ protocol: "HTTP", port: 8080 }],
    securityGroup: "sg-asg-bench",
    autoscaling: { min: 2, max: 8, current },
    hourly: 0.1008,
    monthly: 73.58,
    breakdown: [{ label: "m7i.large Linux", amount: 73.58 }],
    uptimePct: 99.95,
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 35, jitter: 3 },
      { key: "requests", label: "req/s", unit: "rps", baseline: 600, jitter: 35 },
      { key: "memory", label: "Mem", unit: "%", baseline: 48, jitter: 4 },
    ],
  });
}

export function buildEc2Autoscaling(): Architecture {
  const traffic = makeServiceNode({
    id: "asg-traffic",
    instanceId: "load-generator",
    morphKey: "asg-traffic",
    provider: "aws",
    region: "us-east-1",
    serviceName: "Workload generator",
    instanceType: "synthetic traffic",
    az: "regional",
    iconKey: "cloud",
    ports: [{ protocol: "HTTPS", port: 443 }],
    hourly: 0,
    monthly: 0,
    breakdown: [],
    uptimePct: 100,
    metrics: [{ key: "requests", label: "Traffic", unit: "rps", baseline: 1200, jitter: 0 }],
  });

  const alb = makeServiceNode({
    id: "asg-alb",
    instanceId: "app/autoscaling-bench",
    morphKey: "asg-alb",
    provider: "aws",
    region: "us-east-1",
    serviceName: "Application Load Balancer",
    instanceType: "multi-AZ ALB",
    az: "multi-az",
    iconKey: "network",
    ports: [{ protocol: "HTTPS", port: 443 }, { protocol: "HTTP", port: 8080 }],
    securityGroup: "sg-alb-bench",
    hourly: 0.025,
    monthly: 18.25,
    breakdown: [{ label: "ALB base + LCUs", amount: 18.25 }],
    uptimePct: 99.99,
    metrics: [
      { key: "requests", label: "Requests", unit: "rps", baseline: 1200, jitter: 0 },
      { key: "throughput", label: "Throughput", unit: "Mbps", baseline: 24, jitter: 2 },
    ],
  });

  const database = makeServiceNode({
    id: "asg-database",
    instanceId: "autoscaling-bench-db",
    morphKey: "asg-database",
    provider: "aws",
    region: "us-east-1",
    serviceName: "Aurora PostgreSQL",
    instanceType: "db.r6g.large",
    az: "multi-az",
    iconKey: "database",
    ports: [{ protocol: "TCP", port: 5432 }],
    securityGroup: "sg-db-bench",
    hourly: 0.201,
    monthly: 146.73,
    breakdown: [{ label: "Aurora compute", amount: 146.73 }],
    uptimePct: 99.99,
    metrics: [
      { key: "cpu", label: "CPU", unit: "%", baseline: 24, jitter: 4 },
      { key: "iops", label: "IOPS", unit: "k/s", baseline: 8, jitter: 1 },
    ],
  });

  const instances = [makeInstance(1, 2), makeInstance(2, 2)];
  const edges = [
    makeFlowEdge({ id: "asg-traffic-alb", source: traffic.id, target: alb.id, ports: [{ protocol: "HTTPS", port: 443 }], label: "incoming traffic", throughput: 1200 }),
    ...instances.flatMap((instance) => [
      makeFlowEdge({ id: `asg-alb-${instance.id}`, source: alb.id, target: instance.id, ports: [{ protocol: "HTTP", port: 8080 }], label: "target group", throughput: 600 }),
      makeFlowEdge({ id: `${instance.id}-db`, source: instance.id, target: database.id, ports: [{ protocol: "TCP", port: 5432 }], label: "queries", throughput: 180 }),
    ]),
  ];
  const template = { ...instances[0].data, config: { ...instances[0].data.config } } as ServiceNodeData;

  return collectArch(
    "ec2-autoscaling",
    "EC2 Auto Scaling Bench",
    "Write policy conditions and watch capacity follow a recurring workload",
    [traffic, alb, ...instances, database],
    edges,
    [makeProviderGroup("aws", "AWS", 5, 1, { x: 0, y: 0 })],
    [makeRegionGroup("aws", "us-east-1", 3, 5, { x: 40, y: 60 })],
    {
      kind: "ec2-autoscaling",
      baseNodeIds: [traffic.id, alb.id, database.id],
      dynamicSlotIds: SLOT_IDS,
      template,
      ingressNodeId: alb.id,
      policy: {
        min: 2,
        max: 8,
        targetCpu: 50,
        cooldownTicks: 2,
        warmupTicks: 2,
        scheduled: [
          { tick: 8, desired: 4, label: "campaign starts" },
          { tick: 27, desired: 2, label: "campaign ends" },
        ],
        predictive: [
          { tick: 14, desired: 6, label: "forecast pre-warm" },
          { tick: 34, desired: 3, label: "forecast cool-down" },
        ],
      },
    },
  );
}
