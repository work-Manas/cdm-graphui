"use client";

import { useLiveStore } from "@/lib/store";
import { PROVIDERS } from "@/lib/constants";
import { fmtTick } from "@/lib/rng";
import { Pause, Play } from "lucide-react";

export function AppBar() {
  const running = useLiveStore((s) => s.running);
  const toggleRunning = useLiveStore((s) => s.toggleRunning);
  const tickElapsedMs = useLiveStore((s) => s.tickElapsedMs);

  return (
    <header
      className="relative z-30 flex h-12 items-center justify-between border-b border-white/10 bg-zinc-950/90 backdrop-blur-md px-4"
      style={{ zIndex: 30 } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-900 text-[11px] font-bold text-zinc-100">
          cdm
        </div>
        <span className="text-[12.5px] font-medium tracking-tight text-zinc-100">
          CDM GraphUI
        </span>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <ArchSwitcher />
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] uppercase tracking-widest text-amber-500/90">
          MOCK · DEMO MODE
        </span>
        <div
          className="flex items-center gap-1.5 text-[10px] text-zinc-400"
          style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${running ? "animate-pulse" : ""}`}
            style={{ background: running ? "#10b981" : "#71717a" }}
            aria-hidden
          />
          <span className="uppercase tracking-wider">
            {running ? "live" : "paused"}
          </span>
          <span className="ml-1 text-zinc-600">{fmtTick(tickElapsedMs)}</span>
        </div>
        <button
          onClick={toggleRunning}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900 transition-colors hover:bg-zinc-800 active:scale-[0.96]"
          aria-label={running ? "Pause live engine" : "Resume live engine"}
        >
          {running
            ? <Pause size={12} className="text-zinc-200" />
            : <Play size={12} className="text-zinc-200" />}
        </button>
      </div>
    </header>
  );
}

function ArchSwitcher() {
  const archId = useLiveStore((s) => s.archId);
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-zinc-900/60 p-0.5 backdrop-blur-md">
      {ARCH_OPTIONS.map((opt) => {
        const active = opt.id === archId;
        return (
          <button
            key={opt.id}
            onClick={() => useLiveStore.getState().setArch(opt.arch)}
            className={`rounded-full px-4 py-1.5 text-[11px] font-medium transition-all duration-200 active:scale-[0.98] ${
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

import { ARCH_INDEX, ARCH_ORDER } from "@/data/architectures";
const ARCH_OPTIONS = ARCH_ORDER.map((id) => ({
  id,
  label: ARCH_INDEX[id].name,
  arch: ARCH_INDEX[id],
}));
