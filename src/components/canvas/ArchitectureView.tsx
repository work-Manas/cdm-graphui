"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { FlowEdge } from "@/components/edges/FlowEdge";
import { ProviderGroupNode } from "@/components/nodes/ProviderGroupNode";
import { RegionGroupNode } from "@/components/nodes/RegionGroupNode";
import { ServiceNode } from "@/components/nodes/ServiceNode";
import { useLiveEngine } from "@/lib/useLiveEngine";
import { useLiveStore } from "@/lib/store";
import { computeLayout } from "@/lib/layout";
import { PROVIDERS } from "@/lib/constants";
import type { Architecture, ProviderId } from "@/types/architecture";

const NODE_TYPES = {
  service: ServiceNode,
  providerGroup: ProviderGroupNode,
  regionGroup: RegionGroupNode,
};

const EDGE_TYPES = {
  flow: FlowEdge,
};

const DEFAULT_EDGE_OPTIONS = {
  type: "flow",
};

function InnerFlow({ arch, labelsVisible, minimal }: {
  arch: Architecture;
  labelsVisible: boolean;
  minimal: boolean;
}) {
  useLiveEngine();
  const running = useLiveStore((s) => s.running);
  const tickNumber = useLiveStore((s) => s.tickNumber);
  const selectNode = useLiveStore((s) => s.selectNode);
  const selectedNodeId = useLiveStore((s) => s.selectedNodeId);

  const layouted = useMemo(() => computeLayout(arch, minimal), [arch, minimal]);

  // Force re-render of node components on each tick by lightly patching data ref
  // (the inner ServiceNode subscribes to liveStore itself, but this also keeps
  // edge throughput values fresh on the FlowEdge.)
  const nodesLive = useMemo<Node[]>(() => {
    return layouted.nodes.map((n) => ({
      ...n,
      // bump data to trigger memoized node re-render on tick
      data: { ...n.data, __tick: tickNumber },
    }));
  }, [layouted, tickNumber]);

  const edgesLive = useMemo<Edge[]>(() => {
    return layouted.edges.map((e) => ({
      ...e,
      data: { ...(e.data as object), __tick: tickNumber, labelsVisible },
    }));
  }, [layouted, labelsVisible, tickNumber]);

  const onPaneClick = () => selectNode(null);
  const onNodeClick: NodeMouseHandler = (_e, node) => {
    if (node.type === "service") {
      selectNode(node.id);
    }
  };

  return (
    <ReactFlow
      key={minimal ? "minimal" : "detailed"}
      nodes={nodesLive}
      edges={edgesLive}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      onPaneClick={onPaneClick}
      onNodeClick={onNodeClick}
      elementsSelectable
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1.4 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="bg-[var(--color-canvas)]"
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.05)" />
      <Controls
        className="!border-white/10 !bg-zinc-900/80 !backdrop-blur-md [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button]:!text-zinc-300 [&>button:hover]:!bg-white/5"
        showInteractive={false}
        position="bottom-left"
      />
      <MiniMap
        pannable
        zoomable
        className="!border !border-white/10 !bg-zinc-900/80 !backdrop-blur-md [&>svg>rect:first-child]:!fill-zinc-800"
        nodeColor={(n) => {
          if (n.type === "service" && n.data?.provider) {
            return PROVIDERS[n.data.provider as ProviderId].color;
          }
          return "#a1a1aa";
        }}
        nodeStrokeWidth={0}
        maskColor="rgba(9,9,11,0.85)"
        position="bottom-right"
      />
    </ReactFlow>
  );
}

export function ArchitectureView({ arch, labelsVisible, minimal }: {
  arch: Architecture;
  labelsVisible: boolean;
  minimal: boolean;
}) {
  return (
    <ReactFlowProvider>
      <InnerFlow arch={arch} labelsVisible={labelsVisible} minimal={minimal} />
    </ReactFlowProvider>
  );
}
