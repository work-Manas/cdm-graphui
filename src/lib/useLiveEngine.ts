"use client";

import { useEffect } from "react";
import { useLiveStore } from "@/lib/store";
import { TICK_MS } from "@/lib/constants";

export function useLiveEngine() {
  const running = useLiveStore((s) => s.running);
  const tick = useLiveStore((s) => s.tick);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      tick();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, tick]);
}
