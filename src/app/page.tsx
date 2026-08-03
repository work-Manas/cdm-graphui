"use client";

import { useEffect, useState } from "react";
import { ArchitectureView } from "@/components/canvas/ArchitectureView";
import { AppBar } from "@/components/chrome/AppBar";
import { LegendPanel } from "@/components/chrome/LegendPanel";
import { MetaPanel } from "@/components/chrome/MetaPanel";
import { AutoscalingPanel } from "@/components/chrome/AutoscalingPanel";
import { DetailPanel } from "@/components/detail/DetailPanel";
import { ARCH_INDEX, ARCH_ORDER } from "@/data/architectures";
import { useLiveStore } from "@/lib/store";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";

export default function Home() {
  const setArch = useLiveStore((s) => s.setArch);
  const start = useLiveStore((s) => s.start);
  const arch = useLiveStore((s) => s.arch);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [minimal, setMinimal] = useState(false);

  useKeyboardShortcuts();

  useEffect(() => {
    if (!arch && ARCH_ORDER.length) {
      setArch(ARCH_INDEX[ARCH_ORDER[0]]);
      start();
    }
  }, [arch, setArch, start]);

  if (!arch) {
    return (
      <main className="flex h-full w-full items-center justify-center text-zinc-500">
        <div className="font-mono text-xs">
          Initializing live engine...
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <AppBar />
      <main className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
           <ArchitectureView
             arch={arch}
             labelsVisible={labelsVisible}
             minimal={minimal}
           />
          <MetaPanel arch={arch} />
          <AutoscalingPanel />
           <LegendPanel
             arch={arch}
             labelsVisible={labelsVisible}
             onToggleLabels={() => setLabelsVisible((visible) => !visible)}
             minimal={minimal}
             onToggleMinimal={() => setMinimal((value) => !value)}
           />
        </div>
        <DetailPanel />
      </main>
    </div>
  );
}
