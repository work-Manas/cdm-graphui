"use client";

import { useEffect } from "react";
import { useLiveStore } from "@/lib/store";
import { ARCH_INDEX, ARCH_ORDER } from "@/data/architectures";

export function useKeyboardShortcuts() {
  const selectNode = useLiveStore((s) => s.selectNode);
  const toggleRunning = useLiveStore((s) => s.toggleRunning);
  const setArch = useLiveStore((s) => s.setArch);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") selectNode(null);
      else if (e.code === "Space") {
        e.preventDefault();
        toggleRunning();
      } else if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < ARCH_ORDER.length) setArch(ARCH_INDEX[ARCH_ORDER[idx]]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectNode, toggleRunning, setArch]);
}
