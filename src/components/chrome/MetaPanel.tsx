"use client";

import { useLiveStore } from "@/lib/store";
import { getProvider } from "@/lib/constants";
import { fmtMoney } from "@/lib/rng";
import type { Architecture } from "@/types/architecture";

export function MetaPanel({ arch }: { arch: Architecture }) {
  const providersUsed = useProvidersUsed(arch);
  const summedHourly = useLiveStore((s) => {
    if (!s.arch) return 0;
    return s.arch.nodes.reduce((acc, n) => acc + n.data.cost.hourly, 0);
  });
  const monthly = summedHourly * 24 * 30;

  return (
    <div
      className="absolute left-4 top-4 z-[var(--z-metaPanel)] select-none pointer-events-none"
      style={{ zIndex: 25 } as React.CSSProperties}
    >
      <div
        className="rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 backdrop-blur-md"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <div className="flex items-center gap-2 text-[9.5px] uppercase tracking-wider text-amber-500/90">
          <span
            className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500/80"
            aria-hidden
          />
          <span>MOCK · DEMO DATA</span>
        </div>
        <div className="mt-1.5 text-[12.5px] font-medium text-zinc-100">
          {arch.name}
        </div>
        <div className="text-[10px] text-zinc-500 leading-tight max-w-[180px] mt-0.5">
          {arch.tagline}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {providersUsed.map((id) => {
            const p = getProvider(id);
            return (
              <span
                key={id}
                className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                style={{ background: `${p.color}18`, color: p.color }}
              >
                {p.label}
              </span>
            );
          })}
        </div>
        <div className="mt-2 border-t border-white/5 pt-1.5 text-[10px] text-zinc-400 tnum">
          {fmtMoney(summedHourly)}<span className="text-zinc-600">/hr</span>
          <span className="mx-1.5 text-zinc-700">·</span>
          {fmtMoney(monthly)}<span className="text-zinc-600">/mo</span>
        </div>
      </div>
    </div>
  );
}

function useProvidersUsed(arch: Architecture) {
  const set = new Set<string>();
  for (const n of arch.nodes) set.add(n.data.provider);
  return Array.from(set);
}
