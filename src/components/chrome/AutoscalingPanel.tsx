"use client";

import { useLiveStore } from "@/lib/store";
import type { AutoscalingPolicy } from "@/types/architecture";

const fieldClass =
  "h-7 w-full rounded border border-white/10 bg-zinc-900 px-2 text-[10px] text-zinc-200 outline-none focus:border-amber-500/60";

export function AutoscalingPanel() {
  const arch = useLiveStore((state) => state.arch);
  const activity = useLiveStore((state) => state.autoscalingActivity);
  const workload = useLiveStore((state) => state.autoscalingWorkload);
  const tick = useLiveStore((state) => state.tickNumber);
  const update = useLiveStore((state) => state.updateAutoscalingPolicy);
  const simulation = arch?.simulation;
  if (!simulation) return null;

  const policy = simulation.policy;
  const capacity = arch.nodes.filter(
    (node) =>
      simulation.dynamicSlotIds.includes(node.id) && !node.data.retiring,
  ).length;
  const cpu = Math.min(100, workload / Math.max(capacity * 12, 1));
  const phase = tick % 40;

  return (
    <section className="absolute right-4 top-36 z-20 w-[min(340px,calc(100%-2rem))] rounded-lg border border-white/10 bg-zinc-950/90 p-3 backdrop-blur-md sm:top-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-zinc-300">
            Auto Scaling policy
          </h2>
          <p className="mt-0.5 text-[9px] leading-relaxed text-zinc-600">
            One cycle is 40 ticks. Changes apply immediately.
          </p>
        </div>
        <div className="text-right font-mono text-[9px] text-zinc-500">
          <div>T+{phase}/40</div>
          <div className="text-amber-400">{capacity} EC2</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        <PolicyField
          label="min"
          value={policy.min}
          min={1}
          max={policy.max}
          onChange={(min) => update({ min })}
        />
        <PolicyField
          label="max"
          value={policy.max}
          min={policy.min}
          max={simulation.dynamicSlotIds.length}
          onChange={(max) => update({ max })}
        />
        <PolicyField
          label="CPU %"
          value={policy.targetCpu}
          min={10}
          max={90}
          onChange={(targetCpu) => update({ targetCpu })}
        />
        <PolicyField
          label="cool"
          value={policy.cooldownTicks}
          min={0}
          max={10}
          onChange={(cooldownTicks) => update({ cooldownTicks })}
        />
        <PolicyField
          label="warm"
          value={policy.warmupTicks}
          min={0}
          max={10}
          onChange={(warmupTicks) => update({ warmupTicks })}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionEditor
          title="Scheduled"
          actions={policy.scheduled}
          onChange={(scheduled) => update({ scheduled })}
        />
        <ActionEditor
          title="Predictive"
          actions={policy.predictive}
          onChange={(predictive) => update({ predictive })}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-2 font-mono text-[9px]">
        <Stat label="workload" value={`${workload.toFixed(0)} rps`} />
        <Stat
          label="avg CPU"
          value={`${cpu.toFixed(0)}%`}
          hot={cpu > policy.targetCpu}
        />
        <Stat label="capacity" value={`${capacity} / ${policy.max}`} />
      </div>
      <div
        className="mt-2 truncate rounded bg-white/3 px-2 py-1.5 font-mono text-[9px] text-zinc-400"
        title={activity.replace(/ @[0-9]+$/, "")}
      >
        {activity.replace(/ @[0-9]+$/, "")}
      </div>
    </section>
  );
}

function PolicyField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-[8px] uppercase tracking-wider text-zinc-600">
      {label}
      <input
        className={`${fieldClass} mt-1 font-mono`}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ActionEditor({
  title,
  actions,
  onChange,
}: {
  title: string;
  actions: AutoscalingPolicy["scheduled"];
  onChange: (actions: AutoscalingPolicy["scheduled"]) => void;
}) {
  return (
    <fieldset className="rounded border border-white/10 p-2">
      <legend className="px-1 text-[8px] uppercase tracking-widest text-zinc-500">
        {title}
      </legend>
      <div className="space-y-1.5">
        {actions.map((action, index) => (
          <div key={index} className="grid grid-cols-2 gap-1">
            <label className="text-[8px] text-zinc-600">
              tick
              <input
                className={`${fieldClass} mt-0.5 font-mono`}
                type="number"
                min={0}
                max={39}
                value={action.tick}
                onChange={(event) =>
                  onChange(
                    actions.map((item, i) =>
                      i === index
                        ? { ...item, tick: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label className="text-[8px] text-zinc-600">
              desired
              <input
                className={`${fieldClass} mt-0.5 font-mono`}
                type="number"
                min={1}
                max={8}
                value={action.desired}
                onChange={(event) =>
                  onChange(
                    actions.map((item, i) =>
                      i === index
                        ? { ...item, desired: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function Stat({
  label,
  value,
  hot = false,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div>
      <div className="uppercase text-zinc-600">{label}</div>
      <div className={hot ? "text-amber-400" : "text-zinc-300"}>{value}</div>
    </div>
  );
}
