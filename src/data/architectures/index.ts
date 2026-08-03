import { resetSeq } from "../builders";
import { buildGpuInference } from "./gpuInference";
import { buildHybridMulti } from "./hybridMulti";
import { buildThreeTierWeb } from "./threeTierWeb";
import type { Architecture } from "@/types/architecture";

function buildAllArchitectures(): Architecture[] {
  resetSeq();
  const a = buildThreeTierWeb();
  const b = buildHybridMulti();
  const c = buildGpuInference();
  return [a, b, c];
}

export const ARCH_INDEX: Record<string, Architecture> = (function () {
  const all = buildAllArchitectures();
  const index: Record<string, Architecture> = {};
  for (const a of all) index[a.id] = a;
  return index;
})();

export const ARCH_ORDER: string[] = Object.keys(ARCH_INDEX);
