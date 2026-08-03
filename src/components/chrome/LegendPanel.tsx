"use client";

import { PROVIDERS } from "@/lib/constants";
import { ProviderLogo } from "@/components/icons/ProviderLogo";
import type { Architecture, ProviderId } from "@/types/architecture";

export function LegendPanel({ arch, labelsVisible, onToggleLabels, minimal, onToggleMinimal }: {
  arch: Architecture;
  labelsVisible: boolean;
  onToggleLabels: () => void;
  minimal: boolean;
  onToggleMinimal: () => void;
}) {
  const used = new Set<ProviderId>();
  for (const n of arch.nodes) used.add(n.data.provider);
  const list = Array.from(used);

  return (
    <div
      className="absolute left-4 bottom-4 z-20 pointer-events-none"
      style={{ zIndex: 20 } as React.CSSProperties}
    >
      <div className="rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 backdrop-blur-md">
        <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5">
          Providers in this architecture
        </div>
        <div className="space-y-1">
          {list.map((id) => {
            const p = PROVIDERS[id];
            const count = arch.nodes.filter((n) => n.data.provider === id).length;
            return (
              <div key={id} className="flex items-center gap-2">
                <ProviderLogo provider={id} size={12} />
                <span className="text-[10.5px] font-medium text-zinc-300">{p.label}</span>
                <span
                  className="text-[9px] text-zinc-600 tnum"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {count} svcs
                </span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onToggleMinimal}
          className="mt-2 flex w-full items-center justify-between border-t border-white/10 pt-2 text-[9px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-200"
          style={{ fontFamily: "var(--font-mono)", pointerEvents: "auto" }}
          aria-pressed={minimal}
        >
          <span>Diagram detail</span>
          <span className="text-zinc-300">{minimal ? "MINIMAL" : "FULL"}</span>
        </button>
        <button
          type="button"
          onClick={onToggleLabels}
          className="mt-1.5 flex w-full items-center justify-between text-[9px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-200"
          style={{ fontFamily: "var(--font-mono)", pointerEvents: "auto" }}
          aria-pressed={labelsVisible}
        >
          <span>Connection labels</span>
          <span className={labelsVisible ? "text-emerald-400" : "text-zinc-600"}>
            {labelsVisible ? "ON" : "OFF"}
          </span>
        </button>
      </div>
    </div>
  );
}
