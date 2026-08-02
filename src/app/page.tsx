"use client";

import { useEffect, useState } from "react";
import { ArchitectureView } from "@/components/canvas/ArchitectureView";
import { ARCH_INDEX, ARCH_ORDER } from "@/data/architectures";
import { useLiveStore } from "@/lib/store";
import type { Architecture } from "@/types/architecture";

export default function Home() {
  const setArch = useLiveStore((s) => s.setArch);
  const start = useLiveStore((s) => s.start);
  const archId = useLiveStore((s) => s.archId);
  const [hydrated, setHydrated] = useState(false);

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
        <div className="font-mono text-xs">{hydrated ? "Loading architecture..." : "Initializing live engine..."}</div>
      </main>
    );
  }

  return (
    <main className="relative h-full w-full">
      <ArchitectureView arch={arch} />
    </main>
  );
}
