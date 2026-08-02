import Dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type {
  AnyFlowNode,
  Architecture,
  FlowEdge,
  ProviderId,
  ServiceNode,
} from "@/types/architecture";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 132;

const GROUP_PAD_X = 32;
const GROUP_PAD_TOP = 44;
const GROUP_PAD_BOTTOM = 32;
const REGION_PAD_X = 22;
const REGION_PAD_TOP = 36;
const REGION_PAD_BOTTOM = 22;
const GROUP_GAP_X = 64;
const GROUP_GAP_Y = 64;

type RegionGroup = {
  id: string;
  provider: ProviderId;
  region: string;
  services: ServiceNode[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

type ProviderGroup = {
  id: string;
  provider: ProviderId;
  regions: RegionGroup[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

export function computeLayout(
  arch: Architecture,
): { nodes: Node[]; edges: Edge[] } {
  // Group service nodes by provider + region
  const providersMap = new Map<ProviderId, ProviderGroup>();
  for (const svc of arch.nodes) {
    const pid = svc.data.provider;
    const region = svc.data.region;
    if (!providersMap.has(pid)) {
      providersMap.set(pid, {
        id: `grp-${pid}`,
        provider: pid,
        regions: [],
        width: 0,
        height: 0,
        offsetX: 0,
        offsetY: 0,
      });
    }
    const pg = providersMap.get(pid)!;
    let rg = pg.regions.find((r) => r.region === region);
    if (!rg) {
      rg = {
        id: `rgn-${pid}-${region}`,
        provider: pid,
        region,
        services: [],
        width: 0,
        height: 0,
        offsetX: 0,
        offsetY: 0,
      };
      pg.regions.push(rg);
    }
    rg.services.push(svc);
  }

  // Compute per-region internal layout (dagre, LR)
  const nodesPerRegion = new Map<string, { id: string; x: number; y: number }[]>();
  const maxColPerRegion = new Map<string, number>();

  for (const [_, pg] of providersMap) {
    for (const rg of pg.regions) {
      const g = new Dagre.graphlib.Graph();
      g.setGraph({
        rankdir: "TB",
        nodesep: 24,
        ranksep: 64,
        marginx: 0,
        marginy: 0,
      });
      g.setDefaultEdgeLabel(() => ({}));
      const svcIds = rg.services.map((s) => s.id);
      const idToSvc = new Map(rg.services.map((s) => [s.id, s] as const));
      for (const id of svcIds) {
        g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      }
      for (const e of arch.edges) {
        if (svcIds.includes(e.source) && svcIds.includes(e.target)) {
          g.setEdge(e.source, e.target);
        }
      }
      Dagre.layout(g);

      const coords = svcIds.map((id) => {
        const n = g.node(id);
        return { id, x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 };
      });
      nodesPerRegion.set(rg.id, coords);

      const maxX = Math.max(...coords.map((c) => c.x + NODE_WIDTH));
      const maxY = Math.max(...coords.map((c) => c.y + NODE_HEIGHT));
      rg.width = maxX + REGION_PAD_X * 2;
      rg.height = maxY + REGION_PAD_TOP + REGION_PAD_BOTTOM;
    }
  }

  // Pack regions inside provider groups. Layout: regions stacked vertically with gap.
  for (const [_, pg] of providersMap) {
    let yCursor = 0;
    let regionMaxWidth = 0;
    for (const rg of pg.regions) {
      rg.offsetY = yCursor;
      rg.width = Math.max(rg.width, 320);
      regionMaxWidth = Math.max(regionMaxWidth, rg.width);
      yCursor += rg.height + 24;
    }
    pg.width = regionMaxWidth + GROUP_PAD_X * 2;
    pg.height = yCursor - 24 + GROUP_PAD_TOP + GROUP_PAD_BOTTOM;
  }

  // Pack provider groups horizontally with gaps
  let xCursor = 0;
  let maxBottom = 0;
  for (const [_, pg] of providersMap) {
    pg.offsetX = xCursor;
    pg.offsetY = 0;
    xCursor += pg.width + GROUP_GAP_X;
    maxBottom = Math.max(maxBottom, pg.height);
  }
  xCursor -= GROUP_GAP_X;

  // Initiate the React Flow node list. First the provider group nodes, then the region group nodes, then services.
  const flowNodes: Node[] = [];

  for (const [_, pg] of providersMap) {
    flowNodes.push({
      id: pg.id,
      type: "providerGroup",
      position: { x: pg.offsetX, y: pg.offsetY },
      data: {
        kind: "providerGroup",
        provider: pg.provider,
        label: pg.provider.toUpperCase(),
        serviceCount: pg.regions.reduce((acc, r) => acc + r.services.length, 0),
        regionCount: pg.regions.length,
      },
      style: { width: pg.width, height: pg.height },
      draggable: false,
      selectable: false,
    });
  }

  for (const [_, pg] of providersMap) {
    for (const rg of pg.regions) {
      flowNodes.push({
        id: rg.id,
        type: "regionGroup",
        parentId: pg.id,
        position: {
          x: GROUP_PAD_X,
          y: GROUP_PAD_TOP + rg.offsetY,
        },
        data: {
          kind: "regionGroup",
          provider: pg.provider,
          region: rg.region,
          azCount: countUniqueAzs(rg.services),
          serviceCount: rg.services.length,
        },
        style: { width: rg.width, height: rg.height },
        draggable: false,
        selectable: false,
      });
    }
  }

  for (const [_, pg] of providersMap) {
    for (const rg of pg.regions) {
      const coords = nodesPerRegion.get(rg.id) ?? [];
      for (const c of coords) {
        const svc = arch.nodes.find((n) => n.id === c.id)!;
        flowNodes.push({
          ...svc,
          id: svc.id,
          type: "service",
          parentId: rg.id,
          position: {
            x: REGION_PAD_X + c.x - (rg.width - REGION_PAD_X * 2 - NODE_WIDTH) / 2 + NODE_WIDTH / 2,
            y: REGION_PAD_TOP + c.y,
          },
          data: svc.data,
        });
      }
    }
  }

  const flowEdges: Edge[] = arch.edges.map((e) => ({
    ...e,
    type: "flow",
    data: e.data,
  }));

  return {
    nodes: flowNodes,
    edges: flowEdges,
  };
}

function countUniqueAzs(services: ServiceNode[]): number {
  const set = new Set(services.map((s) => s.data.az).filter((az) => az && az !== "global" && az !== "regional"));
  return Math.max(1, set.size);
}
