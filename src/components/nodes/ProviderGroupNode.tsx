"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { PROVIDERS } from "@/lib/constants";
import { useMorphStore } from "@/lib/morphStore";
import type { ProviderGroupNode as ProviderGroupNodeType } from "@/types/architecture";

type Props = {
  id: string;
  data: ProviderGroupNodeType["data"];
};

function ProviderGroupComponent({ id, data }: Props) {
  const p = PROVIDERS[data.provider];
  const entering = useMorphStore((s) => s.enteringKeys.has(id));
  const morphAt = useMorphStore((s) => s.morphAt);

  return (
    <motion.div
      key={morphAt ? `${id}-${morphAt}` : id}
      initial={{ opacity: entering ? 0 : 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative h-full w-full rounded-xl border"
      style={{
        background: `${p.color}0a`,
        borderColor: `${p.color}22`,
      }}
    >
      <div
        className="absolute inset-0 rounded-xl opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(${p.color}55 1px, transparent 1px), linear-gradient(90deg, ${p.color}55 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <img
          src={`https://cdn.simpleicons.org/${data.provider}/${p.color.replace("#", "")}`}
          width={14}
          height={14}
          alt={`${data.label} logo`}
          style={{ filter: "saturate(1.2)" }}
        />
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: p.color }}
        >
          {data.label}
        </span>
      </div>
      <div
        className="absolute right-3 top-3 flex items-center gap-2 text-[9.5px] uppercase tracking-wider text-zinc-500"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <span>{data.serviceCount} services</span>
        <span className="text-zinc-700">{"//"}</span>
        <span>{data.regionCount} regions</span>
      </div>
    </motion.div>
  );
}

export const ProviderGroupNode = memo(ProviderGroupComponent);
