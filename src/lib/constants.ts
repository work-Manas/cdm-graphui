export const PROVIDERS = {
  aws: {
    id: "aws",
    label: "AWS",
    color: "#ff9900",
    accent: "#ff9900",
    icon: "aws",
  },
  azure: {
    id: "azure",
    label: "Azure",
    color: "#0078d4",
    accent: "#0078d4",
    icon: "azure",
  },
  gcp: {
    id: "gcp",
    label: "GCP",
    color: "#4285f4",
    accent: "#4285f4",
    icon: "googlecloud",
  },
  nvidia: {
    id: "nvidia",
    label: "NVIDIA",
    color: "#76b900",
    accent: "#76b900",
    icon: "nvidia",
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export const RADII = {
  card: 12,
  input: 8,
  pill: 9999,
  handle: 9999,
} as const;

export const Z_LAYERS = {
  viewport: 0,
  laneGroup: 1,
  regionGroup: 2,
  serviceNode: 10,
  edge: 5,
  controls: 20,
  minimap: 20,
  legend: 20,
  metaPanel: 25,
  archSwitcher: 30,
  detailPanel: 40,
  toast: 60,
} as const;

export const TICK_MS = 1500;
export const HISTORY_LEN = 60;

export const PROV2_SIMPLEICONS: Record<ProviderId, string> = {
  aws: "amazonaws",
  azure: "microsoftazure",
  gcp: "googlecloud",
  nvidia: "nvidia",
};

export const STATUS_COLORS = {
  healthy: "#10b981",
  degraded: "#f59e0b",
  down: "#ef4444",
  idle: "#71717a",
  active: "#10b981",
} as const;

export const PROVIDER_LOGO = (id: string, color = "ffffff") =>
  `https://cdn.simpleicons.org/${id}/${color}`;

export function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}
