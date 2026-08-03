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
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FlowEdge } from "@/components/edges/FlowEdge";
import { ProviderGroupNode } from "@/components/nodes/ProviderGroupNode";
import { RegionGroupNode } from "@/components/nodes/RegionGroupNode";
import { ServiceNode } from "@/components/nodes/ServiceNode";
import { useLiveEngine } from "@/lib/useLiveEngine";
import { useLiveStore } from "@/lib/store";
import { computeLayout } from "@/lib/layout";
import { getProvider } from "@/lib/constants";
import type { Architecture } from "@/types/architecture";

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

function InnerFlow({ arch, labelsVisible, minimal, viewport, onViewportChange }: {
  arch: Architecture;
  labelsVisible: boolean;
  minimal: boolean;
  viewport: Viewport | null;
  onViewportChange: (viewport: Viewport) => void;
}) {
  useLiveEngine();
  const tickNumber = useLiveStore((s) => s.tickNumber);
  const selectNode = useLiveStore((s) => s.selectNode);

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
      fitView={!viewport}
      fitViewOptions={{ padding: 0.2, maxZoom: 1.4 }}
      defaultViewport={viewport ?? { x: 0, y: 0, zoom: 1 }}
      onMoveEnd={(_, nextViewport) => onViewportChange(nextViewport)}
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
            return getProvider(String(n.data.provider)).color;
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
  const reduceMotion = useReducedMotion();
  const [viewport, setViewport] = useState<Viewport | null>(null);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={minimal ? "minimal" : "detailed"}
        className="absolute inset-0"
        initial={reduceMotion ? false : { opacity: 0, filter: "blur(7px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        exit={reduceMotion ? undefined : { opacity: 0, filter: "blur(7px)" }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        {arch.nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="rounded-lg border border-white/10 bg-zinc-950/80 px-5 py-4 text-center backdrop-blur-md">
              <div className="text-sm font-medium text-zinc-200">No architecture data</div>
              <div className="mt-1 text-xs text-zinc-500">Waiting for the inventory source to return resources.</div>
            </div>
          </div>
        )}
        <ReactFlowProvider>
          <InnerFlow
            arch={arch}
            labelsVisible={labelsVisible}
            minimal={minimal}
            viewport={viewport}
            onViewportChange={setViewport}
          />
        </ReactFlowProvider>
      </motion.div>
    </AnimatePresence>
  );
}
