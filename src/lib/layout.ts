import Dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type {
  Architecture,
  FlowEdge,
  ProviderId,
  ServiceNode,
} from "@/types/architecture";

const DETAIL_NODE = { width: 192, height: 132 };
const MINIMAL_NODE = { width: 108, height: 72 };

const GROUP_PAD_X = 32;
const GROUP_PAD_TOP = 44;
const GROUP_PAD_BOTTOM = 32;
const REGION_PAD_X = 22;
const REGION_PAD_TOP = 54;
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
  layoutWidth: number;
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

type ServiceRect = { x: number; y: number; width: number; height: number };
type RoutePoint = { x: number; y: number };

export function computeLayout(
  arch: Architecture,
  minimal = false,
): { nodes: Node[]; edges: Edge[] } {
  const { width: nodeWidth, height: nodeHeight } = minimal ? MINIMAL_NODE : DETAIL_NODE;
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
        layoutWidth: 0,
        offsetX: 0,
        offsetY: 0,
      };
      pg.regions.push(rg);
    }
    rg.services.push(svc);
  }

  // Compute per-region internal layout (dagre, LR). This matches the service
  // handles and leaves clear horizontal lanes for orthogonal edge routing.
  const nodesPerRegion = new Map<string, { id: string; x: number; y: number }[]>();

  for (const [_, pg] of providersMap) {
    for (const rg of pg.regions) {
      const g = new Dagre.graphlib.Graph();
      g.setGraph({
        rankdir: "LR",
        nodesep: minimal ? 36 : 48,
        ranksep: minimal ? 76 : 96,
        marginx: 0,
        marginy: 0,
      });
      g.setDefaultEdgeLabel(() => ({}));
      const svcIds = rg.services.map((s) => s.id);
      const idToSvc = new Map(rg.services.map((s) => [s.id, s] as const));
      for (const id of svcIds) {
        g.setNode(id, { width: nodeWidth, height: nodeHeight });
      }
      for (const e of arch.edges) {
        if (svcIds.includes(e.source) && svcIds.includes(e.target)) {
          g.setEdge(e.source, e.target);
        }
      }
      Dagre.layout(g);

      const coords = svcIds.map((id) => {
        const n = g.node(id);
        return { id, x: n.x - nodeWidth / 2, y: n.y - nodeHeight / 2 };
      });
      nodesPerRegion.set(rg.id, coords);

      const maxX = Math.max(...coords.map((c) => c.x + nodeWidth));
      const maxY = Math.max(...coords.map((c) => c.y + nodeHeight));
      rg.layoutWidth = maxX;
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
  const serviceRects = new Map<string, ServiceRect>();

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
            x: REGION_PAD_X + Math.max(0, (rg.width - REGION_PAD_X * 2 - rg.layoutWidth) / 2) + c.x,
            y: REGION_PAD_TOP + c.y,
          },
          data: { ...svc.data, minimal },
        });
        serviceRects.set(svc.id, {
          x: pg.offsetX + GROUP_PAD_X + REGION_PAD_X + Math.max(0, (rg.width - REGION_PAD_X * 2 - rg.layoutWidth) / 2) + c.x,
          y: GROUP_PAD_TOP + rg.offsetY + REGION_PAD_TOP + c.y,
          width: nodeWidth,
          height: nodeHeight,
        });
      }
    }
  }

  const routedEdges = new Set<string>();
  const flowEdges: Edge[] = arch.edges.map((e) => ({
    ...e,
    type: "flow",
    data: {
      ...e.data,
      route: makeRoute(e, serviceRects, routedEdges),
    },
  }));

  return {
    nodes: flowNodes,
    edges: flowEdges,
  };
}

function makeRoute(
  edge: FlowEdge,
  rects: Map<string, ServiceRect>,
  routedEdges: Set<string>,
): RoutePoint[] | undefined {
  const source = rects.get(edge.source);
  const target = rects.get(edge.target);
  if (!source || !target) return undefined;

  const sourcePoint = { x: source.x + source.width, y: source.y + source.height / 2 };
  const targetPoint = { x: target.x, y: target.y + target.height / 2 };
  const midX = (sourcePoint.x + targetPoint.x) / 2;
  const blocked = [...rects.entries()].some(([id, rect]) => {
    if (id === edge.source || id === edge.target) return false;
    return segmentHitsRect(sourcePoint.x, sourcePoint.y, midX, sourcePoint.y, rect) ||
      segmentHitsRect(midX, sourcePoint.y, midX, targetPoint.y, rect) ||
      segmentHitsRect(midX, targetPoint.y, targetPoint.x, targetPoint.y, rect);
  });

  if (!blocked && sourcePoint.x < targetPoint.x) return undefined;

  const allRects = [...rects.values()];
  const laneIndex = routedEdges.size;
  routedEdges.add(edge.id);
  const laneY = sourcePoint.x < targetPoint.x
    ? Math.min(...allRects.map((r) => r.y)) - 48 - laneIndex * 14
    : Math.max(...allRects.map((r) => r.y + r.height)) + 48 + laneIndex * 14;
  const sourceLaneX = sourcePoint.x + 16;
  const targetLaneX = targetPoint.x - 16;

  return [
    sourcePoint,
    { x: sourceLaneX, y: sourcePoint.y },
    { x: sourceLaneX, y: laneY },
    { x: targetLaneX, y: laneY },
    { x: targetLaneX, y: targetPoint.y },
    targetPoint,
  ];
}

function segmentHitsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: ServiceRect,
): boolean {
  const clearance = 10;
  const left = rect.x - clearance;
  const right = rect.x + rect.width + clearance;
  const top = rect.y - clearance;
  const bottom = rect.y + rect.height + clearance;

  if (y1 === y2) {
    return y1 > top && y1 < bottom && Math.max(x1, x2) > left && Math.min(x1, x2) < right;
  }
  return x1 > left && x1 < right && Math.max(y1, y2) > top && Math.min(y1, y2) < bottom;
}

function countUniqueAzs(services: ServiceNode[]): number {
  const set = new Set(services.map((s) => s.data.az).filter((az) => az && az !== "global" && az !== "regional"));
  return Math.max(1, set.size);
}
