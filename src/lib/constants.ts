export const PROVIDERS = {
  aws: {
    label: "AWS",
    color: "#ff9900",
  },
  azure: {
    label: "Azure",
    color: "#0078d4",
  },
  gcp: {
    label: "GCP",
    color: "#4285f4",
  },
  nvidia: {
    label: "NVIDIA",
    color: "#76b900",
  },
} as const;

export const TICK_MS = 1500;
export const HISTORY_LEN = 60;

export const STATUS_COLORS = {
  healthy: "#10b981",
  degraded: "#f59e0b",
  down: "#ef4444",
  idle: "#71717a",
  active: "#10b981",
} as const;
