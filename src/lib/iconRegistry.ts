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

const ICON_KEYS: Record<string, Icon> = {
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

const DEFAULT_ICON: Icon = Cpu;

export function getGlyph(key: string): Icon {
  return ICON_KEYS[key] ?? DEFAULT_ICON;
}
