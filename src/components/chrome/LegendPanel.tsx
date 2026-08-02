"use client";

import { PROVIDERS } from "@/lib/constants";
import type { Architecture, ProviderId } from "@/types/architecture";

export function LegendPanel({ arch }: { arch: Architecture }) {
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
                <img
                  src={`https://cdn.simpleicons.org/${id === "aws" ? "amazonaws" : id === "azure" ? "microsoftazure" : id === "gcp" ? "googlecloud" : "nvidia"}/${p.color.replace("#", "")}`}
                  width={12}
                  height={12}
                  alt={`${p.label} logo`}
                  style={{ filter: "saturate(1.2)" }}
                />
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
      </div>
    </div>
  );
}
