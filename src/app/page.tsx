"use client";

import { useEffect, useState } from "react";
import { ArchitectureView } from "@/components/canvas/ArchitectureView";
import { AppBar } from "@/components/chrome/AppBar";
import { LegendPanel } from "@/components/chrome/LegendPanel";
import { MetaPanel } from "@/components/chrome/MetaPanel";
import { DetailPanel } from "@/components/detail/DetailPanel";
import { ARCH_INDEX, ARCH_ORDER } from "@/data/architectures";
import { useLiveStore } from "@/lib/store";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import type { Architecture } from "@/types/architecture";

export default function Home() {
  const setArch = useLiveStore((s) => s.setArch);
  const start = useLiveStore((s) => s.start);
  const archId = useLiveStore((s) => s.archId);
  const [hydrated, setHydrated] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(false);

  useKeyboardShortcuts();

  useEffect(() => {
    if (!hydrated && ARCH_ORDER.length) {
      setArch(ARCH_INDEX[ARCH_ORDER[0]]);
      start();
      setHydrated(true);
    }
  }, [hydrated, setArch, start]);

  const arch: Architecture | null = archId ? ARCH_INDEX[archId] : null;

  if (!arch) {
    return (
      <main className="flex h-full w-full items-center justify-center text-zinc-500">
        <div className="font-mono text-xs">
          {hydrated ? "Loading architecture..." : "Initializing live engine..."}
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <AppBar />
      <main className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
           <ArchitectureView arch={arch} labelsVisible={labelsVisible} />
          <MetaPanel arch={arch} />
           <LegendPanel
             arch={arch}
             labelsVisible={labelsVisible}
             onToggleLabels={() => setLabelsVisible((visible) => !visible)}
           />
        </div>
        <DetailPanel />
      </main>
    </div>
  );
}
