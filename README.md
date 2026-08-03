# CDM GraphUI

Interactive cloud architecture visualization for exploring service topology,
cross-provider relationships, runtime status, cost, metrics, and autoscaling
behavior in a single graph.

> **Current status:** CDM GraphUI is a polished demo and visualization shell.
> Its built-in "live" mode is a deterministic local simulation. It does not yet
> connect to AWS, Azure, GCP, Kubernetes, or another inventory/observability
> source.

![CDM GraphUI preview](https://placehold.co/1600x900/09090b/a1a1aa?text=CDM+GraphUI)

## Contents

- [What It Does](#what-it-does)
- [Features](#features)
- [Demo Architectures](#demo-architectures)
- [Quick Start](#quick-start)
- [Using the Interface](#using-the-interface)
- [Project Structure](#project-structure)
- [How the Graph Works](#how-the-graph-works)
- [Data Model](#data-model)
- [Real Data Ingestion](#real-data-ingestion)
- [Development](#development)
- [Validation](#validation)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

## What It Does

CDM GraphUI turns a normalized architecture description into a navigable,
animated graph:

```text
provider
  └── region
        └── service nodes
              └── flow edges
```

Each service node can show:

- Provider, region, availability zone, and instance identity
- Service type and icon
- Health status
- Primary metric and history sparkline
- Hourly cost and accumulated simulated daily cost
- Ports, security group, autoscaling, storage, uptime, connections, and events

The graph layout is calculated from the service nodes and edges. Provider and
region group metadata is accepted for compatibility, but the layout derives
the visible groups from the node data.

## Features

- Multi-provider diagrams with built-in AWS, Azure, GCP, and NVIDIA styling
- Generic fallback styling for unknown provider identifiers
- Provider and region grouping
- Orthogonal edge routing with optional connection labels
- Full and minimal diagram modes
- Selectable service details panel
- Health states: `healthy`, `degraded`, and `down`
- Synthetic metric updates, event generation, and cost accumulation
- EC2 autoscaling simulation with reactive, scheduled, and predictive policies
- Keyboard shortcuts for switching examples and controlling the simulation
- Graceful rendering of an empty architecture
- TypeScript contracts that can be extended by a future ingestion adapter

## Demo Architectures

The application loads four examples from `src/data/architectures/`:

| Shortcut | Example | Demonstrates |
| --- | --- | --- |
| `1` | Three-Tier Web | CloudFront, ALB, EC2, Aurora, Redis, and S3 |
| `2` | Hybrid Multi-Cloud | Azure Front Door, AWS API Gateway/Lambda, GCP Cloud Run, Aurora, and Cosmos DB |
| `3` | GPU Inference | API Gateway, SQS, SkyPilot H100 workers, S3, and DynamoDB |
| `4` | EC2 Auto Scaling Bench | A simulated workload with editable scaling policy conditions |

The examples are assembled in `src/data/architectures/index.ts` and use the
builders in `src/data/builders.ts`.

## Quick Start

### Requirements

- Node.js 20 or newer
- npm 10 or newer

### Install

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Create a production build

```bash
npm run build
npm run start
```

## Using the Interface

### Mouse and touch

- Click a service node to open its detail panel.
- Click the canvas to clear the selection.
- Use the React Flow controls to zoom and pan.
- Use the legend to switch between `FULL` and `MINIMAL` diagram detail.
- Use `Connection labels` to show or hide edge labels.
- On the autoscaling example, edit the policy fields directly.

### Keyboard

| Key | Action |
| --- | --- |
| `1` to `9` | Select the corresponding architecture example |
| `Space` | Pause or resume the local simulation |
| `Escape` | Close the selected node detail panel |

The top bar also includes restart and pause/resume controls. The status label
in the top bar is simulation status, not a connection to production telemetry.

## Project Structure

```text
.
├── README.md
├── ARCHITECTURE-INGESTION.md       # Future real-data normalization contract
├── package.json
├── next.config.*
├── src
│   ├── app
│   │   ├── globals.css              # Global theme and layout styles
│   │   ├── layout.tsx               # Root metadata and fonts
│   │   └── page.tsx                 # Application entry point
│   ├── components
│   │   ├── canvas                    # React Flow canvas and minimap
│   │   ├── chrome                    # Top bar, legend, metadata, autoscaling UI
│   │   ├── detail                    # Selected service detail panel
│   │   ├── edges                     # Custom flow edge renderer
│   │   ├── icons                     # Provider logo rendering
│   │   └── nodes                     # Service, region, and provider nodes
│   ├── data
│   │   ├── architectures             # Built-in demo architectures
│   │   └── builders.ts                # Typed node, edge, and group builders
│   ├── lib
│   │   ├── constants.ts               # Provider metadata and runtime constants
│   │   ├── layout.ts                  # Grouping, Dagre layout, and routing
│   │   ├── rng.ts                     # Deterministic simulation helpers
│   │   ├── store.ts                   # Zustand runtime state and simulation
│   │   └── useLiveEngine.ts           # Simulation timer hook
│   └── types
│       └── architecture.ts            # Architecture and React Flow contracts
└── public
    └── ...
```

## How the Graph Works

The runtime path is:

```text
demo architecture
  → useLiveStore.setArch()
  → seed node and edge live state
  → computeLayout()
  → React Flow nodes and edges
  → useLiveEngine() ticks the local simulation
```

### Architecture selection

`src/app/page.tsx` selects the first built-in architecture on startup. The
architecture switcher and keyboard shortcuts select entries from `ARCH_INDEX`.

### Layout

`computeLayout()` in `src/lib/layout.ts`:

1. Groups service nodes by provider and region.
2. Uses Dagre to lay out services within each region from left to right.
3. Packs regions into provider containers.
4. Routes edges around service rectangles.
5. Returns the React Flow node and edge lists.

Edges whose endpoints do not resolve to visible service nodes remain valid graph
edges but do not receive custom route geometry. A real ingestion adapter should
validate edge references before calling `setArch()`.

### Simulation

The local engine ticks every 1.5 seconds. It uses a seeded random generator to:

- Jitter metric values around each metric baseline
- Maintain a rolling history of 60 samples
- Accumulate simulated hourly cost
- Generate example events
- Toggle some service and edge states
- Reconcile EC2 capacity for the autoscaling example

This behavior is intentionally useful for demonstrating the UI. It must not be
treated as production health data.
## Data Model

The main contract is defined in `src/types/architecture.ts`:

```ts
type Architecture = {
  id: string;
  name: string;
  tagline: string;
  nodes: ServiceNode[];
  edges: FlowEdge[];
  providerGroups: ProviderGroupNode[];
  regionGroups: RegionGroupNode[];
  simulation?: Ec2AutoscalingSimulation;
};
```

### Service node essentials

Every service node needs:

| Field | Purpose |
| --- | --- |
| `id` | Unique graph identity |
| `data.morphKey` | Stable identity used for animated transitions |
| `data.provider` | Provider or platform identifier |
| `data.region` | Region, zone, or `global`/`regional` scope |
| `data.serviceName` | Human-readable label |
| `data.instanceType` | Resource or workload type |
| `data.instanceId` | Provider-native or logical resource identity |
| `data.az` | Availability zone or placement label |
| `data.iconKey` | Icon registry key, with CPU fallback |
| `data.status` | `healthy`, `degraded`, or `down` |
| `data.cost` | Hourly, monthly, and breakdown values |
| `data.uptime` | 30-day uptime percentage |
| `data.metrics` | Zero or more metric definitions |

Metrics may be empty. When they are empty, the service card omits its sparkline
instead of failing.

### Flow edge essentials

Every edge needs:

```ts
{
  id: string;
  type: "flow";
  source: string;
  target: string;
  data: {
    kind: "flow";
    ports: PortSpec[];
    status: "active" | "idle" | "degraded";
    throughput: number;
    label: string;
  };
}
```

`source` and `target` must reference existing service node IDs. Keep provider,
account, project, native resource ID, relationship type, and other source data
in the optional `scope` and `metadata` fields.

## Real Data Ingestion

There is currently no upload control, API route, WebSocket, polling adapter, or
provider SDK integration in this repository. To connect real data, add an
adapter that normalizes inventory and telemetry into the existing architecture
contract before calling:

```ts
useLiveStore.getState().setArch(normalizedArchitecture);
```

For real data:

1. Parse the source payload.
2. Validate unique node and edge IDs.
3. Validate that every edge endpoint exists.
4. Validate finite numeric values such as cost, uptime, metric baselines, and throughput.
5. Preserve unknown provider-native fields in `metadata`.
6. Drop or report invalid records instead of crashing the graph.
7. Omit `simulation` unless the user explicitly selected demo simulation mode.
8. Preserve the last known telemetry value when a source temporarily has no update.
9. Mark stale or unavailable telemetry as degraded/stale in source metadata.
10. Render an empty state when the source returns no resources.

The complete payload example and field-level rules are in
[`ARCHITECTURE-INGESTION.md`](./ARCHITECTURE-INGESTION.md).

### Supported representation scope

The extensible data contract can describe resources from:

- Public cloud providers and managed services
- Private cloud and on-premises infrastructure
- Hybrid and multi-cloud deployments
- Kubernetes clusters, namespaces, workloads, services, and ingress
- Virtual machines, containers, functions, queues, event buses, and databases
- GPU platforms, bare metal, edge resources, and external SaaS dependencies

The current visual hierarchy is still provider → region → service. It does not
yet render arbitrary nested organization, account, VPC/VNet, subnet, cluster,
namespace, or security-boundary containers as first-class graph groups.

## Development

### Add a demo architecture

1. Create `src/data/architectures/myArchitecture.ts`.
2. Build nodes with `makeServiceNode()`.
3. Build edges with `makeFlowEdge()`.
4. Build provider and region metadata with the group builders.
5. Return the result from `collectArch()`.
6. Import it and add it to `buildAllArchitectures()` in `src/data/architectures/index.ts`.

Reset generated builder IDs with `resetSeq()` before rebuilding the complete
demo set. Use stable explicit IDs when an architecture needs predictable
references.

### Add a provider

Provider identifiers are open strings. To give a provider a custom color and
label, add it to `PROVIDERS` in `src/lib/constants.ts`. Add provider logo
fallbacks in `src/components/icons/ProviderLogo.tsx` if a matching Iconify
asset exists. Unknown providers already receive a generic gray fallback.

### Add an icon

Add a key and Phosphor icon component to `ICON_KEYS` in
`src/lib/iconRegistry.ts`. Unknown icon keys fall back to `Cpu` so malformed
icon data does not break rendering.

## Validation

Run these checks before opening a pull request:

```bash
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

For UI changes, also run the development server and verify:

- The first architecture renders without console errors.
- All four demo architectures switch correctly.
- Empty metrics do not break service cards.
- Unknown providers receive fallback styling.
- Selecting and closing service details works.
- The autoscaling panel only appears for the autoscaling demo.
- Pausing, restarting, and switching architectures do not leave stale state.
- The graph remains usable at desktop and narrow viewport widths.

## Known Limitations

- No live cloud inventory or telemetry integration yet
- No authentication, tenant isolation, or authorization layer
- No runtime schema validator at the ingestion boundary yet
- Provider and region are the only rendered grouping levels
- Metrics use a fixed display-oriented key set, although custom string keys are accepted by the type contract
- Edge live state tracks status, not live throughput history
- The EC2 autoscaling behavior is a specialized demo, not a generic autoscaler
- Provider logos use Iconify network assets with generic fallback behavior
- Cost values in the built-in examples are illustrative

## Contributing

Keep changes small and aligned with the existing visual language. Before
submitting a change:

1. Read the relevant type, store, renderer, and builder files end to end.
2. Reuse existing builders, constants, and UI patterns.
3. Add the smallest useful regression check for non-trivial logic.
4. Update this README when behavior, commands, or supported data changes.
5. Update `ARCHITECTURE-INGESTION.md` when the normalized payload changes.
6. Run the validation commands listed above.

Do not describe simulated values as production telemetry. If a new integration
is added, document its authentication, failure behavior, refresh model, and
empty-data behavior explicitly.

## License

No license file is currently included. Treat the repository as all rights
reserved until the project owner adds a license.
