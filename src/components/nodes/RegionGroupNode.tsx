"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { PROVIDERS } from "@/lib/constants";
import { useMorphStore } from "@/lib/morphStore";
import type { RegionGroupNode as RegionGroupNodeType } from "@/types/architecture";

type Props = {
  id: string;
  data: RegionGroupNodeType["data"];
};

function RegionGroupComponent({ id, data }: Props) {
  const p = PROVIDERS[data.provider];
  const entering = useMorphStore((s) => s.enteringKeys.has(id));
  const morphAt = useMorphStore((s) => s.morphAt);

  return (
    <motion.div
      key={morphAt ? `${id}-${morphAt}` : id}
      initial={{ opacity: entering ? 0 : 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative h-full w-full rounded-lg border border-dashed"
      style={{
        borderColor: `${p.color}33`,
        background: `${p.color}06`,
      }}
    >
      <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ fontFamily: "var(--font-mono)", color: p.color }}
        >
          {data.region}
        </span>
        <span
          className="rounded px-1 py-px text-[8px] uppercase tracking-wider text-zinc-400"
          style={{ background: "rgba(255,255,255,0.05)", fontFamily: "var(--font-mono)" }}
        >
          {data.azCount} AZs
        </span>
      </div>
      <span
        className="absolute right-2.5 top-2.5 text-[8.5px] uppercase tracking-wider text-zinc-600"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {data.serviceCount} svcs
      </span>
    </motion.div>
  );
}

export const RegionGroupNode = memo(RegionGroupComponent);
