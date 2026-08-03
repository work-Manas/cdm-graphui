# Architecture Ingestion Contract

CDM GraphUI currently ships with four static demo architectures. There is no
real-data upload or API adapter yet. The payload below is the format a future
ingestion adapter must normalize before calling `useLiveStore.getState().setArch`.
Do not describe the current application as production ingestion until that
adapter and runtime validation exist.

## Coverage

The current renderer can show a service topology grouped by provider and
region. It is provider-agnostic at the data boundary only after the provider
display metadata is registered. This shape can represent:

- IaaS virtual machines, bare metal, autoscaling groups, load balancers, and databases
- containers, Kubernetes workloads, nodes, namespaces, ingress, and service meshes
- serverless functions, managed services, queues, event buses, and data pipelines
- public cloud, private cloud, on-premises, edge, hybrid, and multi-cloud deployments
- multi-account/subscription/project and multi-region layouts by encoding them in `scope` and `region`
- deployment, health, cost, capacity, and arbitrary provider-native metadata

It does not currently render arbitrary nested scopes or custom relationship
styles. Unknown fields are retained by the adapter for detail views, but the
existing UI only uses the fields listed below. Provider logos/icons fall back
to generic visuals.

## Required JSON

```json
{
  "id": "prod-platform",
  "name": "Production platform",
  "tagline": "Normalized from the live inventory",
  "nodes": [
    {
      "id": "aws-prod-orders-api",
      "type": "service",
      "position": { "x": 0, "y": 0 },
      "data": {
        "kind": "service",
        "morphKey": "aws-prod-orders-api",
        "provider": "aws",
        "scope": { "organization": "acme", "account": "123456789012", "project": "prod" },
        "region": "us-east-1",
        "serviceName": "Orders API",
        "instanceType": "EKS deployment",
        "instanceId": "deployment/orders-api",
        "az": "regional",
        "iconKey": "container",
        "status": "healthy",
        "config": { "ports": [{ "protocol": "HTTPS", "port": 443 }], "autoscaling": { "min": 2, "max": 12, "current": 4 } },
        "cost": { "hourly": 0, "monthly": 0, "breakdown": [] },
        "uptime": { "pct_30d": 99.95 },
        "metrics": [{ "key": "requests", "label": "Requests", "unit": "req/s", "baseline": 120, "jitter": 12, "spikeChance": 0 }],
        "metadata": { "resourceType": "deployment", "nativeId": "arn:aws:eks:..." }
      }
    }
  ],
  "edges": [
    {
      "id": "alb-to-orders-api",
      "type": "flow",
      "source": "aws-prod-alb",
      "target": "aws-prod-orders-api",
      "data": { "kind": "flow", "ports": [{ "protocol": "HTTPS", "port": 443 }], "status": "active", "throughput": 120, "label": "routes" }
    }
  ],
  "providerGroups": [],
  "regionGroups": []
}
```

## Field rules

- `id`, node IDs, and edge IDs are non-empty and unique.
- Every edge `source` and `target` must reference a node ID. Do not send group IDs as edge endpoints.
- `provider` is a stable lowercase identifier. The current built-in display map includes `aws`, `azure`, `gcp`, and `nvidia`; register other providers or use a generic fallback.
- `region` and `az` may be `global`, `regional`, or a provider-native value.
- `metrics` may be empty for inventory-only data. Use `[]`, never `null`; the card simply omits the sparkline.
- Set `cost` and `uptime` to zero when unavailable. Do not invent live values in a real-data payload.
- Use `status: "healthy"` only when the source has evidence. Use `degraded` for known impairment and retain unknown/stale source state in `metadata`; do not turn missing data into a healthy signal.
- `providerGroups` and `regionGroups` are accepted for compatibility but are derived from `nodes` by the layout and may be empty.
- Omit `simulation` for real data. The EC2 simulation is demo-only and must not be combined with live telemetry.
- Metric keys can use the built-in keys (`cpu`, `memory`, `requests`, `gpu`, `throughput`, `iops`, `storage_gb`, `queue_depth`). A future adapter should map provider-native metrics to these keys and retain the original name in `metadata`.

## Real telemetry policy

The current live engine is synthetic. A real adapter should replace `tick()`
with timestamped source updates and keep the same `nodeStates`/`edgeStates`
shape. Missing telemetry means: preserve the last known value, mark the source
stale/degraded, and never throw. An entirely empty or invalid payload should
produce the UI empty state, not start the synthetic engine.

Minimum adapter sequence:

1. Parse JSON.
2. Validate IDs, finite numbers, provider metadata, and edge references.
3. Drop invalid edges and report their count; keep valid nodes.
4. Call `setArch(normalizedArchitecture)` only after validation.
5. Call `start()` only for an explicitly selected simulation mode.

The adapter should return `{ architecture, warnings }` so operators can see
what was omitted instead of silently receiving a misleading graph.
