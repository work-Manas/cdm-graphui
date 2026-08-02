import {
  Cpu,
  Database,
  HardDrives,
  Queue,
  Network,
  Cloud,
  Stack,
  Function as FunctionIcon,
  ShippingContainer as ContainerIcon,
  Cube,
  type Icon,
} from "@phosphor-icons/react";

export const ICON_KEYS: Record<string, Icon> = {
  cpu: Cpu,
  database: Database,
  harddrives: HardDrives,
  queue: Queue,
  network: Network,
  cloud: Cloud,
  stack: Stack,
  function: FunctionIcon,
  container: ContainerIcon,
  gpu: Cube,
};

export const DEFAULT_ICON: Icon = Cpu;

export function getGlyph(key: string): Icon {
  return ICON_KEYS[key] ?? DEFAULT_ICON;
}

export const SERVICE_KIND_LABEL: Record<string, string> = {
  compute: "compute",
  container: "container",
  function: "function",
  gpu: "gpu",
  storage: "storage",
  database: "database",
  cache: "cache",
  queue: "queue",
  network: "network",
  cdn: "cdn",
  edge: "edge",
  waf: "waf",
  loadbalancer: "load-balancer",
};
